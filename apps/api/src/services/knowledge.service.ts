import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { KnowledgeDocument } from '../models/catalog.models.js';
import { ModelGatewayService } from './model-gateway.service.js';
import { PrismaService } from './prisma.service.js';
import { QdrantService } from './qdrant.service.js';

type DbKnowledgeDocument = Prisma.KnowledgeDocumentGetPayload<Record<string, never>>;

export interface KnowledgeSearchResult {
  documents: KnowledgeDocument[];
  diagnostics: {
    embeddingDimensions: number;
    rerankTopScore: number;
    vectorCandidateCount: number;
  };
}

const BUSINESS_KNOWLEDGE_COLLECTION = 'business_knowledge';
const DEFAULT_RAG_LIMIT = 6;

@Injectable()
export class KnowledgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modelGatewayService: ModelGatewayService,
    private readonly qdrantService: QdrantService,
  ) {}

  async searchKnowledge(query: string, limit = DEFAULT_RAG_LIMIT): Promise<KnowledgeDocument[]> {
    return (await this.retrieveKnowledge(query, limit)).documents;
  }

  async retrieveKnowledge(query: string, limit = DEFAULT_RAG_LIMIT): Promise<KnowledgeSearchResult> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      return { documents: [], diagnostics: { embeddingDimensions: 0, rerankTopScore: 0, vectorCandidateCount: 0 } };
    }

    const documents = (await this.prisma.client.knowledgeDocument.findMany({ orderBy: [{ type: 'asc' }, { title: 'asc' }] })).map(toKnowledgeDocument);
    if (documents.length === 0) {
      return { documents: [], diagnostics: { embeddingDimensions: 0, rerankTopScore: 0, vectorCandidateCount: 0 } };
    }

    const documentTexts = documents.map(toRagDocumentText);
    const vectors = await this.modelGatewayService.embed([normalizedQuery, ...documentTexts]);
    const queryVector = vectors[0];
    const documentVectors = vectors.slice(1);
    if (!queryVector?.length) throw new Error('business RAG embedding returned an empty query vector');

    await this.qdrantService.ensureCollection(BUSINESS_KNOWLEDGE_COLLECTION, queryVector.length);
    await this.qdrantService.upsert(BUSINESS_KNOWLEDGE_COLLECTION, documents.map((document, index) => ({
      id: pointIdFromKnowledgeId(document.id),
      vector: documentVectors[index] ?? queryVector,
      payload: {
        knowledgeId: document.id,
        type: document.type,
        title: document.title,
        trustLevel: document.trustLevel,
      },
    })));

    const vectorHits = await this.qdrantService.searchPayload(BUSINESS_KNOWLEDGE_COLLECTION, queryVector, Math.min(Math.max(limit * 3, 8), documents.length));
    const byId = new Map(documents.map((document) => [document.id, document]));
    const candidateDocuments = vectorHits.flatMap((hit) => {
      const knowledgeId = typeof hit.payload.knowledgeId === 'string' ? hit.payload.knowledgeId : undefined;
      const document = knowledgeId ? byId.get(knowledgeId) : undefined;
      return document ? [document] : [];
    });

    if (candidateDocuments.length === 0) {
      return { documents: [], diagnostics: { embeddingDimensions: queryVector.length, rerankTopScore: 0, vectorCandidateCount: 0 } };
    }

    const rerankDocuments = candidateDocuments.map(toRagDocumentText);
    const reranked = await this.modelGatewayService.rerank(normalizedQuery, rerankDocuments);
    const rankedDocuments = reranked
      .filter((item) => Number.isInteger(item.index) && item.index >= 0 && item.index < candidateDocuments.length)
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
      .map((item) => candidateDocuments[item.index]);

    return {
      documents: rankedDocuments,
      diagnostics: {
        embeddingDimensions: queryVector.length,
        rerankTopScore: reranked[0]?.score ?? 0,
        vectorCandidateCount: candidateDocuments.length,
      },
    };
  }
}

function toKnowledgeDocument(document: DbKnowledgeDocument): KnowledgeDocument {
  return {
    id: document.id,
    type: readKnowledgeType(document.type),
    title: document.title,
    content: document.content,
    trustLevel: 'official',
  };
}

function toRagDocumentText(document: KnowledgeDocument): string {
  return [
    `Loai tai lieu: ${document.type}`,
    `Tieu de: ${document.title}`,
    `Noi dung: ${document.content}`,
    `Nguon: ${document.trustLevel}`,
  ].join('\n');
}

function readKnowledgeType(value: string): KnowledgeDocument['type'] {
  if (value === 'faq' || value === 'store' || value === 'promotion' || value === 'after_sales' || value === 'warranty' || value === 'shipping' || value === 'payment' || value === 'support') return value;
  return 'policy';
}

function pointIdFromKnowledgeId(id: string): number {
  let hash = 2166136261;
  for (const char of id) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

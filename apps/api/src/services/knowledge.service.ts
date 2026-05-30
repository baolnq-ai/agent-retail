import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { KnowledgeDocument } from '../models/catalog.models.js';
import { withTransientPrismaRetry } from '../utils/prisma-retry.js';
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
    recoveryMode?: 'none' | 'keyword';
    recoveryReason?: string;
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
      return { documents: [], diagnostics: { embeddingDimensions: 0, rerankTopScore: 0, vectorCandidateCount: 0, recoveryMode: 'none' } };
    }

    const documents = (await withTransientPrismaRetry(() => this.prisma.client.knowledgeDocument.findMany({ orderBy: [{ type: 'asc' }, { title: 'asc' }] }))).map(toKnowledgeDocument);
    if (documents.length === 0) {
      return { documents: [], diagnostics: { embeddingDimensions: 0, rerankTopScore: 0, vectorCandidateCount: 0, recoveryMode: 'none' } };
    }

    const documentTexts = documents.map(toRagDocumentText);
    try {
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
        return { documents: [], diagnostics: { embeddingDimensions: queryVector.length, rerankTopScore: 0, vectorCandidateCount: 0, recoveryMode: 'none' } };
      }

      const rerankDocuments = candidateDocuments.map(toRagDocumentText);
      const reranked = await this.modelGatewayService.rerank(normalizedQuery, rerankDocuments);
      const rankedDocuments = reranked
        .filter((item) => Number.isInteger(item.index) && item.index >= 0 && item.index < candidateDocuments.length)
        .sort((left, right) => right.score - left.score)
        .slice(0, limit)
        .map((item) => candidateDocuments[item.index]);

      return {
        documents: rankedDocuments.length ? rankedDocuments : rankKnowledgeByKeyword(normalizedQuery, candidateDocuments, limit),
        diagnostics: {
          embeddingDimensions: queryVector.length,
          rerankTopScore: reranked[0]?.score ?? 0,
          vectorCandidateCount: candidateDocuments.length,
          recoveryMode: rankedDocuments.length ? 'none' : 'keyword',
          recoveryReason: rankedDocuments.length ? undefined : 'rerank returned no valid ranked documents',
        },
      };
    } catch (error) {
      const rankedDocuments = rankKnowledgeByKeyword(normalizedQuery, documents, limit);
      return {
        documents: rankedDocuments,
        diagnostics: {
          embeddingDimensions: 0,
          rerankTopScore: rankedDocuments.length ? 0.45 : 0,
          vectorCandidateCount: documents.length,
          recoveryMode: 'keyword',
          recoveryReason: error instanceof Error ? error.message : 'business RAG vector retrieval failed',
        },
      };
    }
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

function rankKnowledgeByKeyword(query: string, documents: KnowledgeDocument[], limit: number): KnowledgeDocument[] {
  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) return documents.slice(0, limit);
  return documents
    .map((document) => ({ document, score: scoreKnowledgeDocument(queryTerms, document) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || documentPriority(left.document) - documentPriority(right.document) || left.document.title.localeCompare(right.document.title, 'vi-VN'))
    .slice(0, limit)
    .map((item) => item.document);
}

function scoreKnowledgeDocument(queryTerms: string[], document: KnowledgeDocument): number {
  const title = normalizeForSearch(document.title);
  const content = normalizeForSearch(document.content);
  const type = normalizeForSearch(document.type);
  let score = 0;
  for (const term of queryTerms) {
    if (title.includes(term)) score += 6;
    if (type.includes(term)) score += 4;
    if (content.includes(term)) score += 2;
  }
  if (/\b(bao hanh|loi|hong|vo|roi|doi tra|hoan tien)\b/.test(queryTerms.join(' ')) && ['warranty', 'after_sales', 'support', 'policy'].includes(document.type)) score += 8;
  if (/\b(giao|ship|tre|dia chi|noi thanh|kiem hang)\b/.test(queryTerms.join(' ')) && ['shipping', 'support', 'policy'].includes(document.type)) score += 8;
  if (/\b(khuyen mai|voucher|uu dai|hau mai)\b/.test(queryTerms.join(' ')) && ['promotion', 'after_sales', 'store'].includes(document.type)) score += 8;
  if (/\b(lap dat|camera|cam bien|phu kien)\b/.test(queryTerms.join(' ')) && ['support', 'after_sales', 'warranty'].includes(document.type)) score += 8;
  return score;
}

function documentPriority(document: KnowledgeDocument): number {
  const priorities: Record<KnowledgeDocument['type'], number> = {
    warranty: 0,
    after_sales: 1,
    support: 2,
    shipping: 3,
    payment: 4,
    promotion: 5,
    store: 6,
    policy: 7,
    faq: 8,
  };
  return priorities[document.type] ?? 9;
}

function tokenize(value: string): string[] {
  const normalized = normalizeForSearch(value);
  const tokens = normalized.match(/[a-z0-9]+/g) ?? [];
  return [...new Set(tokens.filter((token) => token.length >= 2 && !STOP_WORDS.has(token)))];
}

function normalizeForSearch(value: string): string {
  return value
    .toLocaleLowerCase('vi-VN')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP_WORDS = new Set([
  'toi',
  'minh',
  'ban',
  'shop',
  'can',
  'cho',
  'hoi',
  'neu',
  'thi',
  'co',
  'khong',
  'cua',
  'va',
  'la',
  've',
  'gi',
  'sao',
  'nao',
  'giup',
  'nhe',
]);

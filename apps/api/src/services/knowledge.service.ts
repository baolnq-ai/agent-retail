import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { KnowledgeDocument } from '../models/catalog.models.js';
import { PrismaService } from './prisma.service.js';

type DbKnowledgeDocument = Prisma.KnowledgeDocumentGetPayload<Record<string, never>>;

@Injectable()
export class KnowledgeService {
  constructor(private readonly prisma: PrismaService) {}

  async searchKnowledge(query: string): Promise<KnowledgeDocument[]> {
    const documents = await this.prisma.client.knowledgeDocument.findMany();
    const normalizedQuery = normalize(query);
    return documents
      .map((document) => ({ document: toKnowledgeDocument(document), score: scoreDocument(toKnowledgeDocument(document), normalizedQuery) }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score)
      .map((item) => item.document);
  }
}

function toKnowledgeDocument(document: DbKnowledgeDocument): KnowledgeDocument {
  return {
    id: document.id,
    type: document.type === 'faq' ? 'faq' : 'policy',
    title: document.title,
    content: document.content,
    trustLevel: 'official',
  };
}

function scoreDocument(document: KnowledgeDocument, normalizedQuery: string): number {
  const haystack = normalize(`${document.title} ${document.content}`);
  return normalizedQuery
    .split(/\s+/)
    .filter(Boolean)
    .reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
}

function normalize(value: string): string {
  return value.toLocaleLowerCase('vi-VN');
}

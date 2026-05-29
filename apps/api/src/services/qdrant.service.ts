import { Injectable } from '@nestjs/common';

const DEFAULT_QDRANT_URL = 'http://localhost:6333';

@Injectable()
export class QdrantService {
  private readonly baseUrl = (process.env.QDRANT_URL ?? DEFAULT_QDRANT_URL).replace(/\/$/, '');

  async ensureCollection(collection: string, vectorSize: number): Promise<void> {
    const exists = await fetch(`${this.baseUrl}/collections/${collection}`);
    if (exists.ok) return;
    const response = await fetch(`${this.baseUrl}/collections/${collection}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ vectors: { size: vectorSize, distance: 'Cosine' } }),
    });
    if (!response.ok) throw new Error(`qdrant collection create failed: ${response.status}`);
  }

  async upsert(collection: string, points: Array<{ id: number; vector: number[]; payload: Record<string, unknown> }>): Promise<void> {
    if (points.length === 0) return;
    const response = await fetch(`${this.baseUrl}/collections/${collection}/points?wait=true`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ points }),
    });
    if (!response.ok) throw new Error(`qdrant upsert failed: ${response.status}`);
  }

  async search(collection: string, vector: number[], limit: number): Promise<Array<{ productId: string; score: number }>> {
    const hits = await this.searchPayload(collection, vector, limit);
    return hits.flatMap((item) => {
      const productId = typeof item.payload.productId === 'string' ? item.payload.productId : undefined;
      return productId ? [{ productId, score: item.score }] : [];
    });
  }

  async searchPayload(collection: string, vector: number[], limit: number): Promise<Array<{ score: number; payload: Record<string, unknown> }>> {
    const response = await fetch(`${this.baseUrl}/collections/${collection}/points/search`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ vector, limit, with_payload: true }),
    });
    if (!response.ok) throw new Error(`qdrant search failed: ${response.status}`);
    const payload = await response.json() as { result?: Array<{ score?: number; payload?: Record<string, unknown> }> };
    return (payload.result ?? []).map((item) => ({
      score: Number(item.score ?? 0),
      payload: item.payload ?? {},
    }));
  }
}

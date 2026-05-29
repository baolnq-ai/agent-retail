import assert from 'node:assert/strict';
import { test } from 'node:test';

const { KnowledgeService } = await import('../dist/services/knowledge.service.js');

test('business RAG retrieves store policy documents through embedding, qdrant and rerank', async () => {
  const calls = { embed: 0, rerank: 0, ensure: 0, upsert: 0, search: 0 };
  const service = new KnowledgeService(
    fakePrisma([
      { id: 'store_profile_retailhome', type: 'store', title: 'Giới thiệu RetailHome', content: 'RetailHome bán đồ gia dụng và smart-home.', trustLevel: 'official' },
      { id: 'policy_warranty_standard', type: 'warranty', title: 'Bảo hành tiêu chuẩn', content: 'Bảo hành 12-24 tháng theo hãng, hỗ trợ tạo phiếu bảo hành.', trustLevel: 'official' },
      { id: 'promotion_bundle_filters', type: 'promotion', title: 'Ưu đãi combo', content: 'Có thể kiểm tra ưu đãi vật tư phù hợp.', trustLevel: 'official' },
    ]),
    {
      async embed(texts) {
        calls.embed += 1;
        return texts.map((text, index) => [index + 1, text.length % 13, 1]);
      },
      async rerank(query, documents) {
        calls.rerank += 1;
        assert.match(query, /bảo hành/i);
        assert.equal(documents.length, 2);
        return [
          { index: 1, document: documents[1], score: 0.93 },
          { index: 0, document: documents[0], score: 0.55 },
        ];
      },
    },
    {
      async ensureCollection(collection, vectorSize) {
        calls.ensure += 1;
        assert.equal(collection, 'business_knowledge');
        assert.equal(vectorSize, 3);
      },
      async upsert(collection, points) {
        calls.upsert += 1;
        assert.equal(collection, 'business_knowledge');
        assert.equal(points.length, 3);
      },
      async searchPayload(collection, vector, limit) {
        calls.search += 1;
        assert.equal(collection, 'business_knowledge');
        assert.deepEqual(vector, [1, 'bảo hành ở cửa hàng thế nào'.length % 13, 1]);
        assert.equal(limit >= 2, true);
        return [
          { score: 0.8, payload: { knowledgeId: 'store_profile_retailhome' } },
          { score: 0.9, payload: { knowledgeId: 'policy_warranty_standard' } },
        ];
      },
    },
  );

  const result = await service.retrieveKnowledge('bảo hành ở cửa hàng thế nào', 2);

  assert.deepEqual(result.documents.map((document) => document.id), ['policy_warranty_standard', 'store_profile_retailhome']);
  assert.equal(result.diagnostics.embeddingDimensions, 3);
  assert.equal(result.diagnostics.rerankTopScore, 0.93);
  assert.deepEqual(calls, { embed: 1, rerank: 1, ensure: 1, upsert: 1, search: 1 });
});

test('business RAG does not silently fallback when embedding fails', async () => {
  const service = new KnowledgeService(
    fakePrisma([{ id: 'policy_returns_7_days', type: 'policy', title: 'Đổi trả', content: 'Đổi trả trong 7 ngày.', trustLevel: 'official' }]),
    { async embed() { throw new Error('embed down'); }, async rerank() { return []; } },
    { async ensureCollection() {}, async upsert() {}, async searchPayload() { return []; } },
  );

  await assert.rejects(() => service.retrieveKnowledge('đổi trả'), /embed down/);
});

function fakePrisma(documents) {
  return {
    client: {
      knowledgeDocument: {
        async findMany() {
          return documents;
        },
      },
    },
  };
}

# Plan: Search Agent

- Created: 2026-05-21 17:40
- Updated: 2026-05-22 15:10
- Status: passed
- Related log: `logs/log-plan-agent-pipeline/search-agent.md`
- Related doc: `docs/agent-pipeline/agents/search-agent/design.md`
- Related tests: `tests/agent-pipeline/agents/search-agent/cases.md`

## Goal

Search Agent tập trung **tìm sản phẩm đúng**. Nó không làm đề xuất cá nhân hóa và không tự chọn rail theo xác suất mua. Nhiệm vụ của nó là retrieve candidate có evidence chắc:

```txt
hard/exact search
  -> filter/attribute/price/category search
  -> lexical full-text/trigram
  -> nếu recall thấp hoặc query khái niệm thì embedding semantic fallback
  -> merge/dedupe
  -> verify
  -> SearchResult cho Lead/Recommendation/Cart
```

Semantic fallback rule:

- Khi Search Agent dùng embedding vì hard/exact/lexical không tìm thấy sản phẩm chính xác, response/handoff phải nói rõ trạng thái fallback.
- Không được claim "đã tìm thấy đúng sản phẩm" nếu chỉ có semantic similarity.
- Câu gợi ý cho Lead:
  - "Mình không thấy chính xác sản phẩm/tên đó trong catalog, nhưng có một vài sản phẩm gần giống hoặc phù hợp với nhu cầu."
  - "Không có kết quả khớp cứng. Các sản phẩm sau là gợi ý tương đồng dựa trên mô tả/nhu cầu."
- `SearchAgentResult.usedLanes` phải có `embedding`, và `issues` nên có `semantic_fallback_used` hoặc `exact_match_not_found` nếu user hỏi tên/ref cụ thể.

Lead Agent dùng Search Agent khi:

- user muốn tìm sản phẩm cụ thể;
- user hỏi "có sản phẩm A không?";
- Cart Agent cần resolve product target trước khi thêm/xóa;
- Recommendation Agent cần candidate pool từ query;
- user muốn xem chi tiết hoặc so sánh sản phẩm đã nhắc tên.

Trong kiến trúc mới **không cần Product Manager Agent riêng**. Năng lực resolve/search sản phẩm thuộc Search Agent.

## Scope

- In:
  - resolve product id/name/ref;
  - exact title/brand/category/attribute search;
  - budget and stock filters;
  - lexical/full-text/trigram search;
  - embedding fallback;
  - evidence and confidence;
  - candidate pool for Recommendation Agent;
  - product resolve for Cart Agent.
- Out:
  - recommendation scoring;
  - personalization;
  - probability of purchase;
  - cart mutation;
  - final user answer.

## DB Needs

- `ProductSearchDocument(productId, locale, searchText, normalizedTitle, normalizedBrand, normalizedCategory, attributeText, updatedAt)`.
- `ProductEmbedding(productId, model, vector, contentHash, createdAt, updatedAt)`.
- indexes on product status/category/brand/price/inventory.
- full-text/trigram index for title/brand/category/description/searchText.
- pgvector index if semantic fallback stays in PostgreSQL.

### Private history

Search Agent có history riêng để hiểu các tham chiếu như "sản phẩm vừa tìm", "cái thứ hai lúc nãy", "tìm tiếp loại đó".

```txt
SearchAgentInteraction
  id
  userId?
  requestId
  query
  normalizedQuery
  filters Json
  usedLanes Json
  candidateProductIds Json
  selectedProductIds Json
  facts Json
  issues Json
  status
  createdAt

SearchAgentMemory
  id
  userId
  tier: near | mid | far
  key
  value Json
  summary?
  createdAt
  updatedAt
```

Near history giữ query/candidates gần nhất. Mid summary gom các lượt tìm trong phiên. Far memory ghi pattern tìm kiếm ổn định như category/brand/budget hay tìm.

## Contract

```ts
interface SearchAgentRequest {
  requestId: string;
  userId?: string;
  query: string;
  filters?: {
    productId?: string;
    category?: string;
    brand?: string;
    budgetMin?: number;
    budgetMax?: number;
    attributes?: Record<string, string | number | boolean>;
    requireInStock?: boolean;
  };
  limit?: number;
  fallbackPolicy?: 'hard_only' | 'embedding_if_low_recall';
}

interface SearchAgentResult {
  status: 'completed' | 'no_results' | 'needs_clarification' | 'failed';
  query: string;
  usedLanes: Array<'exact' | 'filter' | 'lexical' | 'embedding'>;
  matchType: 'exact' | 'strong_lexical' | 'filtered' | 'semantic_fallback' | 'none';
  candidates: Array<{
    productId: string;
    score: number;
    confidence: number;
    matchedFields: string[];
    evidence: string[];
  }>;
  issues: Array<{ code: string; message: string; recoverable: boolean }>;
  handoff: {
    agentMessage: string;
    leadInstruction: string;
    allowedClaims: string[];
    forbiddenClaims: string[];
  };
}
```

## LLM Policy

Search Agent không cần LLM cho hard/exact/filter/lexical search. Nếu dùng LLM, chỉ dùng response-only để normalize intent/query hoặc judge relevance trên bounded candidates. Không dùng toolcall.

## Tool Inventory

- Public interface: `search.agent.run_goal`.
- Private tools:
  - `search.query.normalize`
  - `search.query.extract_filters`
  - `search.lookup.by_id`
  - `search.lookup.exact_title`
  - `search.filter.category_brand`
  - `search.filter.attributes`
  - `search.filter.price_stock`
  - `search.lexical.full_text`
  - `search.lexical.trigram`
  - `search.embedding.encode_query`
  - `search.embedding.semantic`
  - `search.merge.dedupe`
  - `search.verify.candidates`
  - `search.history.write_interaction`
  - `search.history.retrieve_recent`
  - `search.memory.summarize`
  - `search.trace.emit`

## Verification

- Search exact product title returns exact first.
- Hard search no result triggers embedding fallback only when allowed.
- Embedding fallback handoff must say exact product was not found and candidates are similar/related.
- Budget/stock/spec filters are hard constraints.
- Empty result does not invent products.
- Search result can be consumed by Cart Agent and Recommendation Agent.

## Implementation Evidence

- Runtime service: `apps/api/src/services/agents/search-agent.service.ts`
- Unit tests: `apps/api/tests/search-agent-service.test.mjs`
- Runtime 100-case harness: `apps/api/tests/runtime-search-agent-real-request-100.mjs`
- Latest verification:
  - `corepack pnpm --filter @retail-agent/api test`: pass, 89/89.
  - `corepack pnpm --filter @retail-agent/api test:runtime:search-agent:100`: pass, 100/100.

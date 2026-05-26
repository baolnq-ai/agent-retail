# Plan: Product Discovery Agent

- Created: 2026-05-21 17:20
- Updated: 2026-05-21 17:52
- Status: planned
- Related log: `logs/log-plan-agent-pipeline/product-discovery-agent.md`
- Mirror log: `logs/planning/agent-pipeline/agents/product-discovery-agent.md`
- Related doc: `docs/agent-pipeline/agents/product-discovery-agent/design.md`
- Related tests: `test/agent-pipeline/agents/product-discovery-agent/cases.md`, `test/agent-pipeline/agents/product-discovery-agent/real-request-100-cases.md`
- Job status: `plans/agent-pipeline/agents/product-discovery-agent/status.md`
- Job checklist: `plans/agent-pipeline/agents/product-discovery-agent/checklist.md`

## Goal

Thiết kế lại mảng agent sản phẩm của pipeline. Theo quyết định mới, **không gộp Search và Recommendation thành một runtime agent**. Product Discovery chỉ là domain umbrella, còn runtime tách thành 2 pipeline riêng:

- **Search lane**: hard search, exact/lexical/attribute/filter search, embedding fallback, candidate merge, LLM judge dạng response-only.
- **Recommendation lane**: dùng nhu cầu, sở thích, hành vi, cart context, lịch sử tương tác và business constraints để rerank sản phẩm theo pipeline sale chuyên nghiệp.

Tên production:

- `Search Agent`: Lead gọi khi muốn tìm kiếm/resolve sản phẩm. Agent này thay Product Manager Agent.
- `Recommendation Agent`: Lead gọi khi muốn đề xuất/cá nhân hóa/alternatives/upsell.

Agent này không mutate giỏ hàng, không trả lời chính sách/shop/legal, không viết final answer trực tiếp cho user. Nó trả structured result cho Lead/Sales composer: selected products, ranking evidence, reasons, forbidden claims và next-agent instruction.

Product Manager Agent trong runtime cũ sẽ không còn là boundary production mới. Năng lực đó chuyển vào Search Agent.

## Scope

- In:
  - product search theo tên, brand, category, thuộc tính, giá, tồn kho;
  - product resolve cho Cart Agent khi user nói mơ hồ;
  - recommendation theo nhu cầu, ngân sách, sở thích, hành vi, cart context;
  - alternatives khi sản phẩm hết hàng, đã ở trong giỏ, hoặc user muốn thêm lựa chọn;
  - comparison candidate selection;
  - product detail candidate selection;
  - rerank/evaluator để bảo đảm text answer và product rail không xung đột;
  - candidate snapshot, feedback, trace;
  - response-only LLM judge;
  - 100 real-request evaluation cases.
- Out:
  - cart CRUD, thuộc Cart Agent;
  - policy/legal/shop knowledge, thuộc RAG Agent;
  - complaint/return/warranty, thuộc Customer Support Agent;
  - final user response, thuộc Lead/Sales composer;
  - direct raw SQL or LLM toolcall.

## Skills

- plan-skill
- backend-skill
- documentation-skill
- logging-skill
- testing-skill
- security-skill

## Current DB Assessment

Current Prisma schema has only a simple `Product` model:

| Model | Current fields | Assessment |
| --- | --- | --- |
| `Product` | `id`, `title`, `brand`, `category`, `price`, `currency`, `inventory`, `attributes`, `description` | good seed catalog, not enough for production search/recommendation |
| `UserInteractionEvent` | `userId`, `productId`, `type`, `metadata`, `createdAt` | useful behavior signal, too generic for discovery audit |
| `UserPreference` | user key/value JSON | useful memory, but no normalized preference confidence/decay |
| `Cart`/`CartItem` | current cart state | useful context via Cart Agent handoff, Product Discovery must not mutate it |
| `ChatMessage` | conversation text | useful only through Storage/Memory Agent, not direct product evidence |

Runtime gaps observed:

- `CatalogService.searchProducts()` currently loads all products with `findMany()` and scores in memory.
- Search scoring is heuristic and has hardcoded boosts.
- No full-text/trigram index.
- No embedding table or semantic fallback.
- No product specs/media/rating/status fields.
- No candidate snapshot table to audit why a product was shown.
- No discovery interaction history separate from generic agent history.
- No feedback loop for clicked/added/ignored/rejected recommendation.
- `ProductManagerAgentService` and `RecommendationAgentService` are split, but neither owns a complete product discovery pipeline.
- LLM is used only to approve presentation, not to judge candidate relevance with strict evidence.

## DB Changes Needed

### Required tables or model extensions

```txt
ProductSearchDocument
  id
  productId
  locale
  searchText
  normalizedTitle
  normalizedBrand
  normalizedCategory
  attributeText
  updatedAt

ProductEmbedding
  id
  productId
  model
  vector
  contentHash
  createdAt
  updatedAt

ProductDiscoveryInteraction
  id
  userId?
  requestId
  goal
  normalizedQuery
  lane: search | recommendation | compare | detail | alternatives
  constraints Json
  selectedProductIds Json
  candidateSnapshotId?
  facts Json
  issues Json
  status
  createdAt

ProductDiscoveryCandidateSnapshot
  id
  requestId
  query
  candidates Json
  rankingSignals Json
  selectedProductIds Json
  rejectedProductIds Json
  createdAt

ProductFeedbackSignal
  id
  userId?
  productId
  requestId?
  type: shown | clicked | added_to_cart | ignored | rejected | compared
  weight
  metadata Json?
  createdAt
```

Recommended Product model extensions:

```txt
Product
  slug?
  status: active | draft | archived | discontinued
  imageUrl?
  ratingAvg?
  reviewCount?
  tags Json?
  searchBoost?
```

Optional later:

- `ProductMedia` for multiple images.
- `ProductSpec` for normalized specs.
- `ProductCategory` and `Brand` normalized tables.
- `ProductInventoryEvent` if stock history becomes important.

### Index plan

- `Product(status, category)`
- `Product(brand)`
- `Product(price)`
- `Product(inventory)`
- full-text/trigram index on title/brand/category/description/searchText if PostgreSQL.
- pgvector index on `ProductEmbedding.vector` if semantic search stays in Postgres.
- `ProductDiscoveryInteraction(userId, createdAt)`
- `ProductDiscoveryInteraction(requestId)`
- `ProductFeedbackSignal(userId, productId, type, createdAt)`
- `ProductFeedbackSignal(productId, type, createdAt)`

## Recommended Production Pipeline

```txt
Goal from Lead
  -> discovery_security_guard
  -> schema_context_loader
  -> memory_context_loader
      -> preferences, behavior, recent recommendations
  -> cart_context_loader
      -> read only handoff from Cart Agent if needed
  -> goal_parser
      -> lane: search | recommendation | compare | detail | alternatives
      -> constraints: budget, category, brand, specs, count, stock
  -> candidate_generation
      -> hard search first
      -> lexical/full-text/trigram
      -> attribute/filter search
      -> semantic embedding fallback if low recall
  -> candidate_merge_dedupe
  -> hard_filters
      -> active product, price, stock, category, brand, required specs
  -> scoring
      -> need fit
      -> preference fit
      -> behavior fit
      -> cart compatibility
      -> diversity
      -> availability
  -> rerank
      -> deterministic score
      -> optional LLM judge response-only for relevance explanation
  -> verifier
      -> selected products exist, in stock rule, no forbidden products
      -> rail ids match allowed answer ids
  -> audit
      -> candidate snapshot
      -> discovery interaction
      -> trace
  -> ProductDiscoveryResult for Lead
```

## Response-Only LLM Rule

Không dùng LLM/vLLM toolcall cho Product Discovery Agent.

- LLM chỉ trả structured JSON judge/analysis theo schema.
- Backend tự gọi private search/recommendation tools.
- Backend validate product ids: LLM không được chọn product ngoài candidate snapshot.
- Raw SQL, unknown tool, unknown product id, hoặc claim không có evidence đều bị reject.
- vLLM server không cần bật `--enable-auto-tool-choice`.

## Public Contract

Lead Agent chỉ gọi 1 interface:

```ts
interface ProductDiscoveryRequest {
  requestId: string;
  userId?: string;
  goal: string;
  laneHint?: 'search' | 'recommendation' | 'compare' | 'detail' | 'alternatives';
  constraints?: {
    budgetMin?: number;
    budgetMax?: number;
    category?: string;
    brand?: string;
    attributes?: Record<string, string | number | boolean>;
    requireInStock?: boolean;
    count?: number;
  };
  context?: {
    recentProductIds?: string[];
    excludeProductIds?: string[];
    cartProductIds?: string[];
    preferenceSummary?: string;
    behaviorSignals?: Array<{ type: string; value: string; weight: number }>;
  };
}
```

```ts
interface ProductDiscoveryResult {
  status: 'completed' | 'needs_clarification' | 'no_results' | 'partial' | 'failed';
  lane: 'search' | 'recommendation' | 'compare' | 'detail' | 'alternatives';
  query: string;
  products: Array<{
    id: string;
    title: string;
    price: number;
    currency: 'VND';
    inventory: number;
    category: string;
    brand: string;
    reason: string;
    evidence: string[];
    score: number;
  }>;
  facts: Array<{ type: string; productId?: string; value: unknown; evidence: string[] }>;
  issues: Array<{
    code:
      | 'no_results'
      | 'low_confidence'
      | 'ambiguous_query'
      | 'out_of_stock'
      | 'unsafe_query'
      | 'search_failed'
      | 'judge_failed'
      | 'verification_failed';
    message: string;
    recoverable: boolean;
    suggestedNextAgent?: 'lead' | 'cart' | 'rag' | 'customer_support' | 'security';
  }>;
  handoff: {
    agentMessage: string;
    userSafeMessage: string;
    leadInstruction: string;
    mustMentionProductIds: string[];
    mustNotMentionProductIds: string[];
    allowedClaims: string[];
    forbiddenClaims: string[];
  };
}
```

## Complete Tool Inventory

Lead sees **1 public interface**:

| Public interface | Purpose |
| --- | --- |
| `product_discovery.agent.run_goal` | Nhận goal/ngữ cảnh, chạy discovery pipeline, trả products/facts/issues/handoff |

Product Discovery Agent has **45 private backend tools**.

### Context/schema tools: 6

| # | Tool | Purpose | Write? |
| --- | --- | --- | --- |
| 1 | `product_discovery.context.get_schema` | Load allowed product/search schema | no |
| 2 | `product_discovery.context.load_catalog_facets` | Load categories, brands, price ranges, attribute keys | no |
| 3 | `product_discovery.context.load_memory` | Load preference/behavior summary from Storage/Memory Agent or DB | no |
| 4 | `product_discovery.context.load_cart_handoff` | Read cart product ids/constraints from Cart Agent result | no |
| 5 | `product_discovery.context.load_recent_history` | Load recent discovery interactions | no |
| 6 | `product_discovery.context.ground_to_facts` | Convert candidate rows to facts/evidence | no |

### Query/constraint tools: 7

| # | Tool | Purpose | Write? |
| --- | --- | --- | --- |
| 7 | `product_discovery.query.parse_goal` | Parse goal into lane, query and intent | no |
| 8 | `product_discovery.query.extract_constraints` | Extract budget/category/brand/spec/count/stock constraints | no |
| 9 | `product_discovery.query.normalize` | Normalize Vietnamese query, units and synonyms | no |
| 10 | `product_discovery.query.validate_filters` | Reject unsafe/impossible filters | no |
| 11 | `product_discovery.query.build_search_plan` | Decide hard/lexical/semantic fallback order | no |
| 12 | `product_discovery.query.decide_lane` | Choose search/recommend/compare/detail/alternatives | no |
| 13 | `product_discovery.query.build_allowed_claims` | Decide what final answer may say | no |

### Search tools: 10

| # | Tool | Purpose | Write? |
| --- | --- | --- | --- |
| 14 | `product_discovery.search.lookup_by_id` | Resolve product id/sku/exact reference | no |
| 15 | `product_discovery.search.exact_title` | Exact or near-exact product title match | no |
| 16 | `product_discovery.search.category_filter` | Search by category/facet | no |
| 17 | `product_discovery.search.attribute_filter` | Search by normalized specs/attributes | no |
| 18 | `product_discovery.search.price_filter` | Apply budget min/max | no |
| 19 | `product_discovery.search.stock_filter` | Filter available products | no |
| 20 | `product_discovery.search.lexical` | Full-text/trigram/keyword search | no |
| 21 | `product_discovery.search.semantic` | Embedding fallback for low recall | no |
| 22 | `product_discovery.search.alternatives` | Find alternatives excluding product/cart ids | no |
| 23 | `product_discovery.search.merge_dedupe` | Merge lanes, dedupe and keep evidence | no |

### Recommendation scoring tools: 9

| # | Tool | Purpose | Write? |
| --- | --- | --- | --- |
| 24 | `product_discovery.reco.build_user_profile` | Build preference/behavior profile | no |
| 25 | `product_discovery.reco.score_need_fit` | Score fit to explicit need | no |
| 26 | `product_discovery.reco.score_preference_fit` | Score user preference fit | no |
| 27 | `product_discovery.reco.score_behavior_fit` | Score behavior patterns | no |
| 28 | `product_discovery.reco.score_budget_fit` | Score budget fit and value | no |
| 29 | `product_discovery.reco.score_diversity` | Avoid duplicate/samey results | no |
| 30 | `product_discovery.reco.score_availability` | Penalize low/no stock | no |
| 31 | `product_discovery.reco.score_cart_compatibility` | Avoid already-in-cart or propose complements | no |
| 32 | `product_discovery.reco.rank_candidates` | Produce ranked candidates with reason codes | no |

### Judge/presentation tools: 7

| # | Tool | Purpose | Write? |
| --- | --- | --- | --- |
| 33 | `product_discovery.judge.llm_response_only` | LLM relevance judge returns JSON only | no |
| 34 | `product_discovery.judge.validate_output` | Validate ids/reasons/claims from judge | no |
| 35 | `product_discovery.present.compare_products` | Build compare facts for 2-4 products | no |
| 36 | `product_discovery.present.build_reasons` | Generate concise evidence-backed reasons | no |
| 37 | `product_discovery.present.build_product_rail` | Build final selected product rail payload | no |
| 38 | `product_discovery.present.build_clarification` | Ask clarification when query is too broad | no |
| 39 | `product_discovery.present.compose_handoff` | Compose ProductDiscoveryResult for Lead | no |

### Audit/eval tools: 6

| # | Tool | Purpose | Write? |
| --- | --- | --- | --- |
| 40 | `product_discovery.audit.write_interaction` | Write ProductDiscoveryInteraction | yes |
| 41 | `product_discovery.audit.write_candidate_snapshot` | Write candidate snapshot and ranking signals | yes |
| 42 | `product_discovery.feedback.write_signal` | Write shown/clicked/added/rejected feedback | yes |
| 43 | `product_discovery.trace.emit` | Emit redacted trace | yes |
| 44 | `product_discovery.eval.compute_metrics` | Compute recall/ranking/rail consistency metrics | no |
| 45 | `product_discovery.eval.redact_payload` | Redact sensitive trace/eval payload | no |

## Interaction With Other Agents

- Lead Agent: calls `product_discovery.agent.run_goal` and receives selected products/facts/issues/handoff.
- Cart Agent: receives resolved product ids from Product Discovery before cart mutation; sends out-of-stock or already-in-cart context back when alternatives are needed.
- Storage/Memory Agent: owns long-term preferences/behavior; Product Discovery reads summaries/signals and writes feedback signals.
- RAG Agent: answers policy/shop/legal/product knowledge beyond catalog fields; Product Discovery does not invent such claims.
- Security Agent: checks prompt injection, unsafe query, hidden instruction, restricted product request.
- Customer Support Agent: handles complaints/return/warranty, even when product is mentioned.

## Performance And Accuracy Rules

- Hard product resolve must run deterministic and fast, no LLM.
- Search must not `findMany()` full catalog in memory in production.
- Use indexes for lexical/filter search and bounded candidate sets.
- Semantic search only runs when hard/lexical recall is low or query is conceptual.
- LLM judge is optional response-only rerank over bounded candidates; never sees full DB.
- Product rail and final answer must use the same `mustMentionProductIds`.
- Empty results must be honest: return `no_results` or clarification, not random products.
- Out-of-stock products can be shown only if the goal asks detail/history; recommendation should prefer in-stock alternatives.

## Phases

| Phase | Goal | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Chốt DB/search schema và migration plan | pending | Prisma/schema/index draft |
| 2 | Chốt ProductDiscovery contracts | pending | TypeScript contract tests |
| 3 | Chốt response-only LLM judge schema | pending | Parser/validator tests |
| 4 | Implement hard search lane | pending | Search API tests |
| 5 | Implement lexical/full-text/trigram lane | pending | Ranking tests |
| 6 | Implement embedding fallback lane | pending | Semantic tests |
| 7 | Implement recommendation scoring lane | pending | Personalization tests |
| 8 | Implement rerank + verifier | pending | Rail/text consistency tests |
| 9 | Implement compare/detail/alternatives | pending | Flow tests |
| 10 | Implement audit/feedback/trace | pending | Audit tests |
| 11 | Integrate Cart Agent and Lead future contract | pending | Cross-agent tests |
| 12 | Benchmark search/reco latency | pending | p95 report |
| 13 | Run real-request 100 suite to 100% pass | pending | Pass report |
| 14 | Runtime chatbot regression | pending | API regression pass |

## Verification

- Contract tests for request/result/private-plan schemas.
- DB integration tests for search indexes and candidate snapshots.
- Ranking tests for budget, category, brand, specs, inventory, alternatives.
- Semantic fallback tests for conceptual Vietnamese queries.
- LLM response-only negative tests: toolcall ignored, unknown product rejected, raw SQL rejected.
- Cross-agent tests: Product Discovery resolves product for Cart Agent; alternatives after Cart Agent reports out-of-stock.
- 100 real requests must run through API/agent runtime and assert output, product ids, reasons, trace, and DB audit.

## Close Criteria

- Product Discovery Agent returns grounded products with evidence.
- Search/recommendation no longer rely on full-catalog in-memory heuristic as production path.
- Product rail ids and answer ids cannot diverge.
- Candidate snapshot and trace exist for every product rail decision.
- Real-request 100-case suite passes 100% or has logged waivers.

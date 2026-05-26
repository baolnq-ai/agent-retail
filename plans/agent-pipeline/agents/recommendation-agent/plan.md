# Plan: Recommendation Agent

- Created: 2026-05-21 17:40
- Updated: 2026-05-21 18:04
- Status: planned
- Related log: `logs/log-plan-agent-pipeline/recommendation-agent.md`
- Related doc: `docs/agent-pipeline/agents/recommendation-agent/design.md`
- Related tests: `test/agent-pipeline/agents/recommendation-agent/cases.md`

## Goal

Recommendation Agent tập trung **đề xuất sản phẩm có khả năng phù hợp/mua cao nhất** dựa trên:

- rerank candidate pool;
- embedding similarity;
- thuật toán học máy đề xuất;
- xác suất chuyển đổi/mua/thêm giỏ;
- hành vi thu thập được;
- sở thích và memory;
- cart context;
- business constraints.

Nó không làm hard search thay Search Agent. Khi cần candidate pool từ query, nó gọi Search Agent hoặc dùng candidate source adapter đã được backend cung cấp.

Lead Agent dùng Recommendation Agent khi:

- user muốn được tư vấn/đề xuất;
- user muốn "cho nhiều lựa chọn phù hợp hơn";
- Cart Agent/Search Agent báo hết hàng và cần sản phẩm thay thế;
- Lead muốn cá nhân hóa product rail theo sở thích/hành vi;
- cần upsell/cross-sell/complement theo giỏ hàng.

## Scope

- In:
  - personalized recommendation;
  - alternatives and upsell/cross-sell;
  - rerank from Search candidate pool;
  - embedding similarity for need/profile fit;
  - behavior/preference feature extraction;
  - probability scoring;
  - diversity and business rules;
  - feedback learning loop;
  - product rail handoff.
- Out:
  - hard product search;
  - raw catalog crawling;
  - cart mutation;
  - final user answer;
  - policy/support answers.

## Data And Feature Needs

Required signals:

- explicit preferences from Storage/Memory Agent;
- recent clicks/shown/ignored/added-to-cart;
- cart products and removed products;
- order history when available;
- product embeddings;
- product category/brand/price/specs;
- stock and availability;
- global popularity/trending;
- negative feedback: ignored/rejected/removed from cart.

DB/model additions:

```txt
RecommendationAgentInteraction
  id
  userId?
  requestId
  goal
  candidateSource
  candidateProductIds Json
  featureSummary Json
  scores Json
  selectedProductIds Json
  issues Json
  status
  createdAt

RecommendationAgentMemory
  id
  userId
  tier: near | mid | far
  key
  value Json
  summary?
  createdAt
  updatedAt

RecommendationProfile
  userId
  preferenceVector?
  categoryAffinity Json
  brandAffinity Json
  priceAffinity Json
  updatedAt

RecommendationFeedback
  id
  userId?
  productId
  requestId?
  type: shown | clicked | added_to_cart | ignored | rejected | purchased
  weight
  metadata Json?
  createdAt

RecommendationCandidateSnapshot
  id
  requestId
  source
  candidates Json
  features Json
  scores Json
  selectedProductIds Json
  createdAt
```

Private history:

- Near: recommendations shown recently, reasons, ignored/clicked/added products.
- Mid: session-level preference summary, repeated constraints, rejected categories/brands.
- Far: stable long-term affinities, price range, category/brand habits and negative preferences.

History is required for prompts such as "gợi ý giống cái lúc nãy nhưng rẻ hơn", "đừng hiện hãng đó nữa", "cho thêm lựa chọn khác", or "tôi hay mua loại nào".

## Pipeline

```txt
Goal from Lead
  -> load user profile and behavior signals
  -> load cart context and exclusions
  -> get candidate pool
      -> from Search Agent result
      -> from embedding nearest products
      -> from popular/trending/category pool
      -> from complementary products
  -> feature extraction
      -> need fit
      -> preference fit
      -> behavior fit
      -> embedding similarity
      -> budget fit
      -> stock fit
      -> cart compatibility
  -> scoring/probability
      -> deterministic weighted score first
      -> ML model/calibrated probability when available
  -> rerank
      -> diversity
      -> business constraints
      -> novelty/serendipity where useful
  -> optional LLM judge response-only
      -> reason quality and contradiction check only
  -> verifier
      -> selected ids valid, in stock rule, rail/text ids consistent
  -> write candidate snapshot + feedback hooks + trace
  -> RecommendationResult for Lead
```

## Semantic Candidate Language Rule

Nếu Recommendation Agent dùng candidate source từ embedding hoặc semantic fallback, reason/handoff phải nói theo hướng "phù hợp/tương đồng/gợi ý thay thế", không nói như search exact.

Allowed:

- "Không thấy sản phẩm khớp chính xác, nhưng các lựa chọn này gần với nhu cầu của bạn."
- "Dựa trên mô tả và hành vi trước đó, các sản phẩm này có khả năng phù hợp."

Forbidden:

- Claim sản phẩm là exact match nếu nguồn candidate là embedding.
- Nói "đây chính là sản phẩm bạn tìm" khi Search Agent đã báo `semantic_fallback`.

## Probability Model Direction

MVP:

```txt
score =
  0.30 * needFit
  + 0.20 * preferenceFit
  + 0.15 * behaviorFit
  + 0.15 * embeddingSimilarity
  + 0.10 * budgetFit
  + 0.05 * availabilityFit
  + 0.05 * diversityBusinessFit
```

Then calibrate into `purchaseProbability` or `addToCartProbability` using observed feedback. Later phase can replace weighted scoring with a trained model, but contract stays the same.

## Contract

```ts
interface RecommendationAgentRequest {
  requestId: string;
  userId?: string;
  goal: string;
  candidateProductIds?: string[];
  source?: 'search' | 'embedding' | 'popular' | 'cart_complement' | 'mixed';
  constraints?: {
    budgetMin?: number;
    budgetMax?: number;
    category?: string;
    brand?: string;
    requireInStock?: boolean;
    count?: number;
    excludeProductIds?: string[];
  };
  context?: {
    preferenceSummary?: string;
    behaviorSignals?: Array<{ type: string; value: string; weight: number }>;
    cartProductIds?: string[];
    recentShownProductIds?: string[];
  };
}

interface RecommendationAgentResult {
  status: 'completed' | 'no_candidates' | 'low_confidence' | 'needs_search' | 'failed';
  products: Array<{
    productId: string;
    rank: number;
    score: number;
    purchaseProbability?: number;
    addToCartProbability?: number;
    reasons: string[];
    evidence: string[];
    featureSummary: Record<string, number>;
    candidateSource: 'search_exact' | 'search_lexical' | 'embedding' | 'popular' | 'cart_complement' | 'mixed';
  }>;
  issues: Array<{ code: string; message: string; recoverable: boolean }>;
  handoff: {
    agentMessage: string;
    leadInstruction: string;
    mustMentionProductIds: string[];
    mustNotMentionProductIds: string[];
    allowedClaims: string[];
    forbiddenClaims: string[];
  };
}
```

## LLM Policy

Không dùng LLM/vLLM toolcall. LLM chỉ được dùng response-only để:

- kiểm tra lý do đề xuất có mâu thuẫn không;
- viết reason ngắn có evidence;
- phát hiện product rail và answer draft lệch nhau.

Backend vẫn tính score, xác suất, rerank và verifier.

## Tool Inventory

- Public interface: `recommendation.agent.run_goal`.
- Private tools:
  - `recommendation.context.load_profile`
  - `recommendation.context.load_behavior`
  - `recommendation.history.retrieve_recent`
  - `recommendation.context.load_cart_signals`
  - `recommendation.candidate.from_search`
  - `recommendation.candidate.from_embedding`
  - `recommendation.candidate.from_popular`
  - `recommendation.candidate.from_complements`
  - `recommendation.feature.extract`
  - `recommendation.score.weighted`
  - `recommendation.score.probability`
  - `recommendation.rerank.diversity`
  - `recommendation.rerank.business_rules`
  - `recommendation.judge.response_only`
  - `recommendation.verify.selection`
  - `recommendation.feedback.write_signal`
  - `recommendation.history.write_interaction`
  - `recommendation.memory.summarize`
  - `recommendation.audit.write_snapshot`
  - `recommendation.trace.emit`

## Verification

- Recommendation changes ranking based on behavior and preferences.
- Candidate pool from Search is reranked without violating hard constraints.
- Embedding candidate source works when no search query exists.
- Out-of-stock products are penalized/excluded.
- Already-in-cart products are excluded or used for complements.
- Feedback signals update future ranking tests.
- LLM cannot select unknown product ids or force tool calls.

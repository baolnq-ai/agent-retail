# Plan: History Agent

- Created: 2026-05-21 18:42
- Updated: 2026-05-22 14:45
- Status: passed
- Related log: `logs/log-plan-agent-pipeline/history-agent.md`
- Mirror log: `logs/planning/agent-pipeline/agents/history-agent.md`
- Related doc: `docs/agent-pipeline/agents/history-agent/design.md`
- Related tests: `tests/agent-pipeline/agents/history-agent/cases.md`, `tests/agent-pipeline/agents/history-agent/real-request-100-cases.md`
- Job status: `plans/agent-pipeline/agents/history-agent/status.md`
- Job checklist: `plans/agent-pipeline/agents/history-agent/checklist.md`

## Goal

History Agent là agent điều tra lịch sử khi câu hỏi của user mơ hồ hoặc nhắc lại ngữ cảnh trước đó. Bình thường Lead không gọi agent này. Lead chỉ gọi khi có tham chiếu như:

- "sản phẩm vừa đề xuất";
- "cái lúc nãy";
- "mẫu đó";
- "cái thứ hai";
- "sản phẩm khá ổn hồi nãy";
- "cho thêm loại giống cái vừa rồi";
- "mua cái bạn nói phù hợp".

History Agent đọc lịch sử hội thoại, safe memory index và private history summary của các agent để trả về: lúc nãy đã nói gì, sản phẩm nào được đề xuất/tìm kiếm/thêm giỏ, confidence bao nhiêu, thiếu thông tin gì và Lead nên gọi agent nào tiếp.

## Scope

- In:
  - resolve vague references from conversation history;
  - inspect user/chatbot history through Storage/Memory Agent;
  - inspect safe summaries from Cart/Search/Recommendation private histories;
  - identify previous product recommendations/search results/cart actions;
  - return evidence-backed resolved references;
  - tell Lead what information is missing;
  - suggest next agent: Search, Recommendation, Cart, Sales composer, RAG, Support.
- Out:
  - product DB search directly;
  - recommendation scoring;
  - cart mutation;
  - final user answer;
  - reading debug logs, system logs, secrets or raw internal traces outside safe memory.

## Relationship With Storage/Memory

Storage/Memory Agent is the store and context retrieval service.

History Agent is the investigator:

```txt
Lead detects ambiguous reference
  -> History Agent
      -> calls Storage/Memory get_context
      -> reads safe agent indexes/private history summaries
      -> resolves reference with evidence
      -> returns HistoryResolutionResult
```

Storage/Memory answers "what memory exists?".
History Agent answers "what did the user mean by this vague phrase?".

## When Lead Should Call History Agent

Call History Agent when:

- user uses pronouns/demonstratives: "nó", "cái đó", "mẫu đó", "sản phẩm kia";
- user references order/position: "cái thứ hai", "mẫu đầu", "sản phẩm cuối";
- user references previous agent output: "vừa đề xuất", "vừa tìm", "lúc nãy bạn nói";
- user asks to continue from prior result: "cho thêm giống vậy", "rẻ hơn cái đó";
- Lead cannot confidently map text to current product id/cart item/search result.

Do not call History Agent when:

- user gives direct product name/id and clear search intent;
- user asks generic recommendation with no prior reference;
- Cart/Search/Recommendation already returned clear context in the same execution plan.

## Example Pipeline

User:

```txt
sản phẩm vừa đề xuất khá ổn, nói lại nó là gì và có nên mua không?
```

Lead:

```txt
Ambiguous reference detected: "sản phẩm vừa đề xuất".
Call History Agent.
```

History Agent:

```txt
Storage/Memory near context -> previous assistant product rail had productId=prod_a, title="AiroClean P35".
RecommendationAgentInteraction -> selectedProductIds=["prod_a"], reason="phù hợp phòng 25-35m2".
Return resolved reference with confidence 0.9.
```

Lead:

```txt
History returned product title and id but product details are not complete enough.
Call Search Agent with productId=prod_a.
Optionally call Recommendation Agent for complements/similar products.
Call Sales composer with grounded product facts and selected rail ids.
```

Sales composer:

```txt
Bạn đang nói đến AiroClean P35 đúng không. Nó hợp với phòng 25-35m2...
Nếu mua mẫu này, mình gợi ý thêm ...
```

## History Result Contract

```ts
interface HistoryAgentRequest {
  requestId: string;
  userId?: string;
  message: string;
  ambiguityHint?: {
    phrase?: string;
    type?: 'previous_recommendation' | 'previous_search' | 'cart_item' | 'ordinal' | 'pronoun' | 'general_context';
  };
  contextBudget?: number;
  allowedSources?: Array<'memory' | 'cart_history' | 'search_history' | 'recommendation_history' | 'chat_turns'>;
}

interface HistoryAgentResult {
  status: 'resolved' | 'partial' | 'not_found' | 'ambiguous' | 'failed';
  resolvedReferences: Array<{
    refType: 'product' | 'cart_item' | 'recommendation_set' | 'search_result' | 'conversation_topic';
    phrase: string;
    productId?: string;
    productTitle?: string;
    productIds?: string[];
    sourceAgent?: 'cart' | 'search' | 'recommendation' | 'memory' | 'lead';
    confidence: number;
    evidence: Array<{ source: string; sourceId?: string; summary: string; createdAt?: string }>;
  }>;
  missingInfo: string[];
  nextAgentHints: Array<{
    agent: 'search' | 'recommendation' | 'cart' | 'sales' | 'rag' | 'customer_support' | 'security' | 'lead';
    reason: string;
    inputHint: unknown;
  }>;
  handoff: {
    agentMessage: string;
    leadInstruction: string;
    allowedClaims: string[];
    forbiddenClaims: string[];
    mustMentionProductIds: string[];
    mustNotMentionProductIds: string[];
  };
}
```

## Product Rail Consistency Contract

History Agent must help prevent text/rail mismatch.

Rules:

- If History resolves a product, it must output `mustMentionProductIds`.
- If Lead later calls Search/Recommendation, final product rail must be built from the same verified ids or explicitly state alternatives.
- Sales composer cannot mention product ids outside:
  - History `mustMentionProductIds`;
  - Search `candidates/selected ids`;
  - Recommendation `selected ids`;
  - Cart confirmed product ids.
- If Recommendation adds companion products, they must be separated from the referenced product:
  - referenced product: "Bạn đang nói đến..."
  - companion recommendations: "Nếu mua mẫu này, có thể cân nhắc thêm..."
- Frontend product cards must come from the same `selectedProductIds` as final text.

## Source Priority

History Agent should prefer sources in this order:

1. Same-turn execution context from Lead if available.
2. Recent assistant product rail metadata.
3. RecommendationAgentInteraction selected products.
4. SearchAgentInteraction selected/candidate products.
5. CartAgentInteraction/cart events.
6. Storage/Memory near turns and agent index.
7. Mid/far memory only if near context is insufficient.

## LLM Policy

No LLM/vLLM toolcall.

LLM may be used only as response-only resolver over already retrieved safe memory snippets. Backend validates:

- no unknown product ids;
- no unsupported source claims;
- no secret/debug log leakage;
- confidence is bounded by source quality;
- output schema is valid.

## Private Tool Inventory

Private tools total: 28.

| Group | Tools |
| --- | --- |
| Classification | `history.classify_ambiguity`, `history.extract_reference_phrase`, `history.detect_required_sources` |
| Retrieval | `history.retrieve.memory_context`, `history.retrieve.chat_turns`, `history.retrieve.agent_index`, `history.retrieve.cart_history`, `history.retrieve.search_history`, `history.retrieve.recommendation_history` |
| Resolution | `history.resolve.ordinal`, `history.resolve.pronoun`, `history.resolve.previous_recommendation`, `history.resolve.previous_search`, `history.resolve.cart_reference`, `history.resolve.topic` |
| Evidence | `history.evidence.rank_sources`, `history.evidence.build_refs`, `history.evidence.check_staleness`, `history.evidence.score_confidence` |
| Planning | `history.plan.next_agent_hints`, `history.plan.missing_info`, `history.plan.claim_contract`, `history.plan.product_rail_contract` |
| Safety | `history.guard.authorize`, `history.guard.redact`, `history.guard.prevent_debug_log_access`, `history.guard.validate_product_ids` |
| Trace | `history.trace.emit`, `history.audit.write_interaction` |

## Verification

- "sản phẩm vừa đề xuất" resolves to last recommendation product with source refs.
- "cái thứ hai" resolves to second product in previous rail.
- "cái đó rẻ hơn không" resolves previous product and asks Search/Recommendation for cheaper alternatives.
- If two possible products exist, returns `ambiguous`, not a confident guess.
- Does not read or expose debug logs/secrets.
- Final text/product rail consistency contract is enforceable in Lead/Sales tests.

## Close Criteria

- History Agent has contracts, docs, tests and logs.
- Lead routing rules specify when to call History Agent.
- Product rail consistency guard is represented in tests.
- Real-request 100-case suite passes 100% or has logged waivers.

## Implementation Evidence

- Runtime service: `apps/api/src/services/agents/history-agent.service.ts`
- Unit tests: `apps/api/tests/history-agent-service.test.mjs`
- Runtime 100-case harness: `apps/api/tests/runtime-history-agent-real-request-100.mjs`
- Latest verification:
  - `corepack pnpm --filter @retail-agent/api test`: pass, 84/84.
  - `corepack pnpm --filter @retail-agent/api test:runtime:history-agent:100`: pass, 100/100.

# Plan: Sales Agent

- Created: 2026-05-21 19:02
- Updated: 2026-05-21 19:02
- Status: planned
- Related log: `logs/log-plan-agent-pipeline/sales-agent.md`
- Mirror log: `logs/planning/agent-pipeline/agents/sales-agent.md`
- Related doc: `docs/agent-pipeline/agents/sales-agent/design.md`
- Related tests: `tests/agent-pipeline/agents/sales-agent/cases.md`, `tests/agent-pipeline/agents/sales-agent/real-request-100-cases.md`
- Job status: `plans/agent-pipeline/agents/sales-agent/status.md`
- Job checklist: `plans/agent-pipeline/agents/sales-agent/checklist.md`

## Goal

Sales Agent là agent viết câu trả lời cuối cho user theo giọng bán hàng tự nhiên, rõ ràng và hữu ích. Nó nhận:

- câu hỏi gốc của user;
- kết quả Lead đã tìm được;
- resolved product từ History/Search;
- recommended products từ Recommendation;
- cart/support/rag facts nếu có;
- claim rules và product id contract.

Sales Agent không tự tìm kiếm, không tự đề xuất thêm ngoài dữ liệu Lead cung cấp, không mutate cart và không bịa thông tin sản phẩm.

## Scope

- In:
  - compose final customer-facing response;
  - explain referenced product;
  - introduce recommended/companion products;
  - produce product blocks/cards matching text;
  - keep sales tone helpful, not spammy;
  - respect allowed/forbidden claims;
  - handle uncertainty and fallback wording.
- Out:
  - product search;
  - recommendation scoring;
  - cart CRUD;
  - RAG/policy legal claims not supplied by Lead;
  - complaint/return handling beyond supplied Support/RAG facts.

## Input From Lead

Example:

```ts
interface SalesAgentRequest {
  requestId: string;
  userId?: string;
  originalUserMessage: string;
  leadSummary: string;
  referencedProducts?: ProductForSales[];
  recommendedProducts?: ProductForSales[];
  companionProducts?: ProductForSales[];
  cartFacts?: Array<{ type: string; message: string; productIds?: string[] }>;
  ragFacts?: Array<{ title: string; content: string; source: string }>;
  supportFacts?: Array<{ type: string; message: string }>;
  claimContract: {
    mustMentionProductIds: string[];
    mustNotMentionProductIds: string[];
    allowedClaims: string[];
    forbiddenClaims: string[];
  };
  responseGoal:
    | 'answer_referenced_product'
    | 'recommend_products'
    | 'search_result'
    | 'compare'
    | 'cart_confirmation'
    | 'policy_answer'
    | 'support_answer'
    | 'smalltalk';
}

interface ProductForSales {
  id: string;
  title: string;
  price: number;
  currency: 'VND';
  category: string;
  brand: string;
  inventory: number;
  reason?: string;
  evidence: string[];
  relation?: 'referenced' | 'recommended' | 'companion' | 'alternative';
}
```

## Output Contract

```ts
interface SalesAgentResult {
  status: 'completed' | 'needs_revision' | 'blocked';
  text: string;
  blocks: Array<
    | { type: 'text'; content: string }
    | { type: 'product_list'; title?: string; items: ProductForSales[] }
    | { type: 'quick_replies'; items: string[] }
  >;
  usedProductIds: string[];
  guardrail: {
    pass: boolean;
    complaints: string[];
    forbiddenClaimsFound: string[];
    missingRequiredProductIds: string[];
    extraProductIds: string[];
  };
}
```

## Runtime Pipeline

```txt
Lead gives original question + grounded facts
  -> Sales Agent validates input contract
  -> choose response template
      -> referenced product
      -> search result
      -> recommendation list
      -> referenced product + companion recommendations
      -> cart confirmation
      -> support/rag answer
  -> response-only LLM or deterministic composer writes draft
  -> parse structured output
  -> verify text claims
  -> verify product ids in text and blocks
  -> build final blocks
  -> return SalesAgentResult to Lead final review
```

## Example Flow

User:

```txt
sản phẩm vừa đề xuất khá ổn, nói lại nó là gì và có gì đi kèm không?
```

Lead found:

- History resolved referenced product: `prod_air_p35`.
- Search returned product facts for `prod_air_p35`.
- Recommendation returned 3 companion products.

Sales response should be:

```txt
Bạn đang nói đến AiroClean P35 đúng không. Mẫu này hợp với phòng 25-35m2, có chế độ lọc bụi mịn và đang còn hàng.

Nếu bạn mua AiroClean P35, mình gợi ý thêm 3 món đi kèm để dùng tiện hơn: ...
Mình gửi luôn các sản phẩm bên dưới để bạn tham khảo nhé.
```

Blocks:

- first product card: referenced product;
- second rail or same rail clearly labeled: companion/recommended products.

## Product Consistency Rules

- Text cannot mention product ids/titles not present in `referencedProducts`, `recommendedProducts`, `companionProducts` or supplied facts.
- `usedProductIds` must equal products mentioned in text and blocks.
- `mustMentionProductIds` must appear in text or product block.
- `mustNotMentionProductIds` must never appear.
- Companion products must be framed as extra suggestions, not confused with the referenced product.
- If Search Agent used semantic fallback, Sales must preserve wording:
  - "không thấy chính xác sản phẩm đó, nhưng có sản phẩm gần giống..."
- If facts are incomplete, Sales must say uncertainty or ask clarification, not fill gaps.

## Sales Tone Rules

- Friendly, direct and useful.
- No exaggerated claims.
- No pressure language.
- Explain why product fits the user's need.
- Mention price/stock only if supplied.
- For multiple products, keep response concise and let product cards carry details.
- For add-ons, phrase as optional: "nếu mua mẫu này, bạn có thể cân nhắc thêm..."

## LLM Policy

No LLM/vLLM toolcall.

LLM may only produce structured response draft:

- text;
- block titles;
- quick replies;
- used product ids.

Backend validates all claims and ids. If invalid, Sales Agent returns `needs_revision` or deterministic fallback.

## Private Tool Inventory

Private tools total: 22.

| Group | Tools |
| --- | --- |
| Validate | `sales.validate.input`, `sales.validate.claim_contract`, `sales.validate.product_ids` |
| Template | `sales.template.select`, `sales.template.referenced_product`, `sales.template.recommendation_list`, `sales.template.companion_products`, `sales.template.cart_confirmation`, `sales.template.support_answer` |
| Compose | `sales.compose.response_only_llm`, `sales.compose.deterministic_fallback`, `sales.compose.quick_replies` |
| Blocks | `sales.blocks.text`, `sales.blocks.product_list`, `sales.blocks.group_referenced_and_companion`, `sales.blocks.quick_replies` |
| Verify | `sales.verify.product_text_match`, `sales.verify.forbidden_claims`, `sales.verify.required_ids`, `sales.verify.semantic_fallback_wording` |
| Trace | `sales.trace.emit`, `sales.audit.write_interaction` |

## Interaction With Other Agents

- Lead Agent: calls Sales Agent after it has enough grounded facts.
- History Agent: may provide referenced product ids.
- Search Agent: provides product facts.
- Recommendation Agent: provides recommended/companion products.
- Cart Agent: provides cart action facts.
- RAG Agent: provides policy/shop facts if response needs them.
- Security Agent: final response may be reviewed for safety.

## Verification

- Sales answer mentions only allowed products.
- Product cards match text.
- Referenced product and companion products are separated.
- Semantic fallback wording is preserved.
- No internal agent handoff/code leaks.
- If required product id missing, result is `needs_revision`.

## Close Criteria

- Sales Agent has contracts, docs, tests and logs.
- Lead can call Sales Agent with grounded facts.
- Final answer/product block mismatch is blocked.
- Real-request 100-case suite passes 100% or has logged waivers.

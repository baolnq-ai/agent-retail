# History Agent Design

- Created: 2026-05-21 18:42
- Updated: 2026-05-21 18:42
- Status: draft
- Related plan: `plans/agent-pipeline/agents/history-agent/plan.md`

## Summary

History Agent is called only when Lead sees an ambiguous reference to prior context. It does not store the main memory itself; it investigates safe memory and domain history summaries to resolve what the user means.

## When It Runs

Run History Agent for:

- "sản phẩm vừa đề xuất";
- "cái lúc nãy";
- "mẫu đó";
- "cái thứ hai";
- "cho thêm loại giống vậy";
- "rẻ hơn cái đó";
- "mua cái bạn nói phù hợp".

Do not run it for clear search or recommendation requests.

## Sources

History Agent reads safe sources only:

- Storage/Memory near/mid/far context.
- Recent assistant product rail metadata.
- RecommendationAgentInteraction summaries.
- SearchAgentInteraction summaries.
- CartAgentInteraction/cart event summaries.
- Lead same-turn context.

It must not read debug logs, secrets or raw internal traces outside the safe memory/audit store.

## Runtime Pipeline

```txt
Lead detects ambiguity
  -> History Agent
  -> classify reference
  -> retrieve safe memory and agent indexes
  -> resolve product/search/recommendation/cart references
  -> build evidence and confidence
  -> return missing info and next-agent hints
```

## Product Rail Consistency

History Agent contributes to text/card consistency:

- Resolved product ids become `mustMentionProductIds`.
- Sales composer must use the same product ids in text and frontend blocks.
- Companion recommendations must be clearly separated from the referenced product.
- If History is uncertain, Lead must ask clarification or call Search/Recommendation, not invent.

## Example

User: "sản phẩm vừa đề xuất khá ổn, nói lại nó là gì"

History Agent returns:

- productId: `prod_a`;
- source: previous recommendation interaction;
- confidence: high;
- leadInstruction: call Search Agent for full product facts, then Sales composer may answer.

## LLM Rule

No LLM toolcall. LLM may only resolve references from retrieved safe snippets and must return structured JSON. Backend validates ids, source refs and confidence.

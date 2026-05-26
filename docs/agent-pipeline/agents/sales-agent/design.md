# Sales Agent Design

- Created: 2026-05-21 19:02
- Updated: 2026-05-21 19:02
- Status: draft
- Related plan: `plans/agent-pipeline/agents/sales-agent/plan.md`

## Summary

Sales Agent is the final customer-facing response composer. It receives the original user message and grounded findings from Lead, then writes a helpful sales answer and product blocks.

It does not search, recommend, mutate cart or invent facts.

## Input

Sales Agent receives:

- original user question;
- Lead summary;
- referenced product facts from History/Search;
- recommended or companion products from Recommendation;
- cart facts from Cart Agent;
- RAG/support facts when relevant;
- claim contract: `mustMentionProductIds`, `mustNotMentionProductIds`, `allowedClaims`, `forbiddenClaims`.

## Pipeline

```txt
Lead grounded facts
  -> validate product ids and claim contract
  -> select response template
  -> compose response-only draft
  -> verify product ids in text and blocks
  -> verify forbidden claims
  -> build blocks
  -> return SalesAgentResult to Lead
```

## Response Style

Sales Agent should sound like a helpful retail consultant:

- acknowledge the user's intent;
- identify the referenced product if any;
- explain why it fits;
- present recommendations as optional;
- keep text concise when product cards carry details;
- never exaggerate or pressure.

Example:

```txt
Bạn đang nói đến AiroClean P35 đúng không. Mẫu này hợp với phòng 25-35m2 và đang còn hàng.

Nếu bạn mua mẫu này, mình gợi ý thêm vài món đi kèm để dùng tiện hơn. Mình gửi luôn các sản phẩm bên dưới để bạn tham khảo nhé.
```

## Consistency Rules

- Text and product cards must use the same product ids.
- Referenced product must be separated from companion recommendations.
- Sales cannot mention a product outside Lead-approved ids.
- If Search/Recommendation says semantic fallback, Sales must preserve fallback wording.
- If facts are missing, Sales asks clarification or states uncertainty.

## LLM Rule

No LLM toolcall. LLM may only produce structured response draft. Backend validates ids, claims, block schema and semantic fallback wording.

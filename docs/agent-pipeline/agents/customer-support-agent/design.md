# Customer Support Agent Design

- Created: 2026-05-21 19:55
- Updated: 2026-05-21 19:55
- Status: draft
- Related plan: `plans/agent-pipeline/agents/customer-support-agent/plan.md`

## Summary

Customer Support Agent handles post-purchase and customer-care situations. It receives Lead's analysis plus available facts, retrieves official policy from RAG, checks missing information, creates or updates a support case when allowed, and returns a grounded result to Lead.

## Main Flow

```txt
Lead request
  -> classify support intent
  -> load private support history
  -> extract product/order/case references
  -> call RAG for policy evidence when needed
  -> call Security for sensitive/private/risky cases
  -> decide: answer, ask missing info, create case, escalate
  -> return SupportAgentResult
```

## What It Owns

- Support issue classification.
- Support private history.
- Missing information checklist.
- Support case summary and event plan.
- Policy-grounded support result.
- Escalation recommendation.

## What It Does Not Own

- Product search/recommendation.
- Cart CRUD.
- RAG retrieval internals.
- Payment/refund/order mutation without a future authorized backend tool.
- Final answer approval.

## Private History

Customer Support Agent stores:

- recent support issue summaries;
- case ids and status summaries;
- requested missing fields;
- policy citations used;
- escalation decisions;
- blocked overpromise findings.

This supports follow-ups like "vụ bảo hành lúc nãy", "case đó sao rồi", or "tôi bổ sung ảnh lỗi đây".

## Policy Evidence

All support policy claims must be grounded:

- RAG citation when policy exists;
- tool/order fact when future order/refund tools exist;
- `needs_more_info` or `unsupported` when evidence is missing.

## Safety

Sensitive support data goes through Security Agent:

- PII;
- order/payment identifiers;
- refund/return promise;
- abusive complaint;
- cross-user support case access;
- attachment/file risk.

## Output

Support Agent returns structured data to Lead. It can include a customer-facing draft, but the final response still goes through Lead and Security final output review.

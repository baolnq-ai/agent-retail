# Security Moderation Agent Design

- Created: 2026-05-21 19:55
- Updated: 2026-05-21 19:55
- Status: draft
- Related plan: `plans/agent-pipeline/agents/security-agent/plan.md`

## Summary

Security Moderation Agent protects the chatbot pipeline at input, plan, action, data-access and final-output boundaries. It is a guard/evaluator, not a customer-facing seller and not a domain executor.

## Trust Boundaries

Protected assets:

- system/developer prompts and internal routing instructions;
- credentials, cookies, tokens, API keys, DB URLs;
- user memory/history/cart/order/support data;
- RAG restricted/internal documents;
- final response blocks and product cards;
- audit/event logs.

Untrusted inputs:

- user chat messages;
- uploaded or ingested docs;
- LLM output;
- browser state;
- external API responses;
- agent handoff text.

## Gate Architecture

```txt
input gate
  -> plan/action gate
  -> memory/RAG access gate
  -> agent result risk gate
  -> final output gate
  -> redacted audit history
```

Common low-risk requests should use deterministic rules only. High-impact or ambiguous cases can use response-only LLM review.

## Response Contract

Security Agent returns:

- decision: allow, revise, block, escalate, require_confirmation;
- severity;
- risk types;
- allowed/blocked action list;
- safe rewrite when applicable;
- lead instructions;
- audit requirement;
- confidence and issues.

No raw secret, cookie, token, Authorization header, password or unnecessary PII can be stored in this contract.

## Private History

Security history stores near/mid/far summaries of risk events and decisions. It supports follow-ups like:

- repeated prompt injection from same session;
- repeated failed access to another user's data;
- recent support abuse escalation;
- final answer revisions caused by unsupported claim.

History is not a data leak source. Other agents only receive minimal risk summary through Lead-approved context.

## Integration Rules

- Lead calls `security.agent.review_input` before deep routing for risky content.
- Lead calls `security.agent.review_plan` before sensitive multi-agent plans.
- Backend calls `security.agent.review_action` before side effects.
- Memory/RAG calls Security before private/restricted data access.
- Lead calls `security.agent.review_output` before final response.

## No Tool Calling

LLM must not call tools directly. Backend runs rules, redaction, permission checks and audit writes. LLM only reviews redacted context and returns JSON.

## Fail-Closed Cases

- redaction failure;
- parser failure on mutation/private-data path;
- cross-user scope ambiguity;
- restricted RAG doc without permission;
- output contains possible secret/internal prompt;
- unsupported refund/return/payment promise.

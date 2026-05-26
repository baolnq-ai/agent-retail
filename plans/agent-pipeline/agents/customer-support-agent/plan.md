# Plan: Customer Support Agent

- Created: 2026-05-21 19:55
- Updated: 2026-05-21 19:55
- Status: planned
- Related log: `logs/log-plan-agent-pipeline/customer-support-agent.md`
- Mirror log: `logs/planning/agent-pipeline/agents/customer-support-agent.md`
- Related doc: `docs/agent-pipeline/agents/customer-support-agent/design.md`
- Related tests: `test/agent-pipeline/agents/customer-support-agent/cases.md`, `test/agent-pipeline/agents/customer-support-agent/real-request-100-cases.md`
- Job status: `plans/agent-pipeline/agents/customer-support-agent/status.md`
- Job checklist: `plans/agent-pipeline/agents/customer-support-agent/checklist.md`

## Goal

Customer Support Agent xử lý các tình huống hậu mãi và chăm sóc khách hàng. Lead Agent gọi agent này khi câu hỏi có dấu hiệu:

- sản phẩm lỗi, hỏng, không đúng mô tả;
- đổi trả, hoàn tiền, bảo hành;
- giao hàng chậm, sai hàng, thiếu hàng;
- khiếu nại, phàn nàn, yêu cầu hỗ trợ người thật;
- hỏi policy hỗ trợ gắn với một tình huống cụ thể.

Agent này phải trả kết quả có cấu trúc cho Lead. Nó có thể tạo draft hỗ trợ, nhưng câu trả lời cuối vẫn đi qua Lead/Security, và khi cần văn phong bán hàng/chăm sóc thì Lead có thể đưa qua Sales/Support composer.

## Non-Goals

Customer Support Agent không:

- thay Cart Agent xử lý CRUD giỏ hàng;
- thay Search/Recommendation tìm sản phẩm;
- thay RAG bịa chính sách;
- tự hứa hoàn tiền, đổi trả, bảo hành nếu chưa có policy/evidence;
- tự xử lý payment/refund/order mutation nếu chưa có backend tool riêng;
- dùng complaint làm cơ hội upsell khi user đang bức xúc, trừ khi Lead yêu cầu sau khi đã giải quyết vấn đề chính.

## Current Runtime Gap

Hiện tại support/policy đang bị lẫn vào RAG, Sales hoặc generic LLM response:

- chưa có support intent taxonomy;
- chưa có SupportCase DB chuẩn;
- chưa có support private history để hiểu complaint trước đó;
- chưa có policy evidence bắt buộc từ RAG;
- chưa có no-overpromise gate cho hoàn tiền/đổi trả/bảo hành;
- chưa có 100 real request support tests.

## Position In Pipeline

```txt
User issue
  -> Lead analysis
  -> Security input gate if sensitive/abusive/private
  -> Customer Support Agent
      -> classify support intent
      -> inspect support private history
      -> ask RAG for official policy if needed
      -> inspect order/cart facts if Lead provides or future Order Agent exists
      -> identify missing info
      -> create/update support case when allowed
      -> return SupportAgentResult to Lead
  -> Lead decides final route
  -> Sales/Support composer drafts final answer if needed
  -> Security final output gate
  -> User
```

## Execution Policy

Không dùng LLM tool calling. LLM chỉ trả structured response. Backend orchestration:

- gọi RAG Agent để lấy policy/citation;
- gọi Security Agent khi có PII, abuse, refund/payment/order risk;
- đọc/ghi SupportCase qua service allowlist;
- validate response schema;
- chặn output hứa quá quyền.

## Public Interface

| Interface | Caller | Input | Output |
| --- | --- | --- | --- |
| `support.agent.handle_case` | Lead | original user question, Lead analysis, available cart/order/product facts, user auth context | `SupportAgentResult` |
| `support.agent.resolve_followup` | Lead/History | vague support follow-up + recent support history | resolved issue/case context |
| `support.agent.create_case` | Lead/backend | validated support facts + consent/auth | case id + SLA |
| `support.agent.update_case` | Lead/backend | case id + new user info | updated case event |

## Result Schema

```json
{
  "status": "answered | needs_more_info | case_created | escalated | unsupported | blocked",
  "intent": "defect | return | refund | warranty | shipping | missing_item | wrong_item | complaint | human_handoff | policy_question",
  "summaryForLead": "short grounded summary",
  "customerFacingDraft": "optional draft, no unsupported promise",
  "requiredInfo": ["order_code", "product_name", "issue_photo"],
  "knownFacts": [
    { "type": "policy", "value": "7-day return for manufacturer defect", "source": "rag" }
  ],
  "policyEvidence": [
    { "citationId": "rag_cite_1", "path": "policy/returns/7-day-return.md" }
  ],
  "case": {
    "caseId": "optional",
    "priority": "low | normal | high | urgent",
    "sla": "optional"
  },
  "safeClaims": ["can_guide_return_steps"],
  "blockedClaims": ["refund_guaranteed"],
  "suggestedNextAgent": "sales | rag | security | lead | human",
  "confidence": 0.0,
  "issues": []
}
```

## Support Intent Taxonomy

| Intent | Meaning | Required evidence |
| --- | --- | --- |
| `defect` | Product broken/not working | product/order context + defect policy |
| `return` | User wants return/exchange | return policy from RAG |
| `refund` | User asks money back | refund policy + order/payment state if available |
| `warranty` | Warranty claim | warranty policy + product/category |
| `shipping` | Delivery delay/status | shipping policy + order tracking if available |
| `missing_item` | Delivered but missing item | order facts + support SOP |
| `wrong_item` | Delivered wrong item | order facts + support SOP |
| `complaint` | Dissatisfaction/escalation | issue summary + escalation policy |
| `human_handoff` | Wants staff | support SLA/handoff policy |
| `policy_question` | General support policy | RAG evidence |

## DB Schema

```txt
SupportCase
  id
  userId?
  status: open | waiting_user | in_review | escalated | resolved | closed
  priority: low | normal | high | urgent
  intent
  subject
  summary
  orderId?
  cartId?
  productIds Json
  policyCitationIds Json
  assignedTo?
  slaDueAt?
  createdAt
  updatedAt

SupportCaseEvent
  id
  caseId
  actorType: user | agent | staff | system
  eventType: created | user_message | agent_summary | info_requested | escalated | resolved | closed
  redactedContent
  metadata Json
  createdAt

SupportAgentInteraction
  id
  userId?
  requestId
  caseId?
  intent
  inputSummary
  policyEvidence Json
  requiredInfo Json
  result Json
  status
  createdAt

SupportAgentMemory
  id
  userId?
  tier: near | mid | far
  key
  value Json
  summary?
  sourceRefs Json
  confidence
  createdAt
  updatedAt
```

Rules:

- Store redacted case events, not raw secrets/payment data.
- Product/order identifiers must be scoped to authenticated user.
- Case creation with personal/order data requires auth context.
- Private support history helps follow-ups like "vụ lỗi lúc nãy sao rồi?".

## Private Tool Inventory

Backend-owned functions, not LLM toolcalls:

| Group | Private functions |
| --- | --- |
| Classification | `classify_support_intent`, `detect_urgency`, `detect_complaint_sentiment`, `detect_human_handoff` |
| Context | `load_support_history`, `summarize_support_history`, `resolve_recent_case`, `extract_product_order_refs` |
| Policy | `request_rag_policy`, `validate_policy_citations`, `map_policy_to_intent`, `detect_policy_conflict` |
| Case | `create_support_case`, `update_support_case`, `append_case_event`, `set_case_priority`, `set_case_status`, `calculate_sla` |
| Safety | `request_security_review`, `redact_support_payload`, `block_overpromise`, `check_owner_scope` |
| Response | `build_missing_info_request`, `build_support_result`, `build_escalation_summary`, `validate_support_result` |
| Reliability | `dedupe_case_event`, `retry_policy_lookup`, `handle_rag_unavailable`, `trace_support_decision` |

Total initial private functions: 27.

## RAG Dependency

Customer Support Agent must use RAG Agent for official policies:

- return/refund rules;
- warranty terms;
- shipping/support SLA;
- complaint escalation;
- brand/legal statements.

If RAG cannot find policy evidence, Support Agent must say it needs confirmation or escalate, not invent a policy.

## Security Dependency

Security Agent is required when:

- user provides PII or order/payment identifiers;
- request could access another user's order/case;
- complaint includes abusive/threatening content;
- final draft promises refund/return/warranty outcome;
- case event would store sensitive data.

## Conversation Logic

### Complete Context

If support intent, product/order context and policy evidence are enough:

```txt
Support Agent returns:
  - issue summary
  - safe next steps
  - policy citations
  - case id if created
  - claims allowed/blocked
```

### Missing Context

If order/product/evidence is missing:

```txt
Support Agent returns:
  - `needs_more_info`
  - exact missing fields
  - friendly draft asking only necessary info
```

### Complaint

For complaint:

- acknowledge issue;
- do not argue;
- collect facts;
- use policy evidence;
- escalate if severity high;
- no upsell until the support need is handled.

## Acceptance Criteria

- 100 support real requests pass.
- Every policy claim has RAG evidence or is marked as needing confirmation.
- No refund/return/warranty promise without allowed evidence.
- Private support history resolves follow-ups reliably.
- Support case writes are authenticated, scoped and redacted.
- Lead can use `SupportAgentResult` to produce coherent final responses.

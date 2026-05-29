# Agent Pipeline Tests

- Created: 2026-05-21 13:46
- Updated: 2026-05-21 20:10
- Scope: test case thiết kế cho quá trình rebuild chatbot pipeline.

## Folder Map

| Path | Purpose |
| --- | --- |
| `platform/` | Cross-agent tooling, safety, framework and server tool-call tests |
| `agents/{agent-name}/` | Agent-specific tests and real-request suites |

## Rules

- Mỗi plan trong `plans/agent-pipeline/` phải có test case liên quan trong folder này hoặc test tự động tương ứng.
- Khi bắt đầu code, các test case quan trọng phải được chuyển thành test tự động trong `apps/api/tests/` hoặc `apps/web/tests/`.
- Test phải kiểm tra behavior thật, không chỉ kiểm tra mock gọi hàm.

## Test groups

| File | Scope | Status |
| --- | --- | --- |
| [agents/cart-agent/cases.md](agents/cart-agent/cases.md) | Cart CRUD, history, memory, idempotency, concurrency, handoff | planned |
| [agents/cart-agent/real-request-100-cases.md](agents/cart-agent/real-request-100-cases.md) | 100 real-request Cart SQL RAG Agent scenarios, must pass 100% before close | planned |
| [agents/product-discovery-agent/cases.md](agents/product-discovery-agent/cases.md) | Product search, recommendation, alternatives, rerank, evidence, audit | planned |
| [agents/product-discovery-agent/real-request-100-cases.md](agents/product-discovery-agent/real-request-100-cases.md) | 100 real-request Product Discovery scenarios, must pass 100% before close | planned |
| [agents/search-agent/cases.md](agents/search-agent/cases.md) | Hard search, filters, lexical search, embedding fallback, product resolve | planned |
| [agents/recommendation-agent/cases.md](agents/recommendation-agent/cases.md) | Recommendation rerank, probability, behavior feedback and personalization | planned |
| [agents/storage-memory-agent/cases.md](agents/storage-memory-agent/cases.md) | Near/mid/far memory, context retrieval, privacy, source evidence | planned |
| [agents/storage-memory-agent/real-request-100-cases.md](agents/storage-memory-agent/real-request-100-cases.md) | 100 real-request Storage/Memory scenarios, must pass 100% before close | planned |
| [agents/history-agent/cases.md](agents/history-agent/cases.md) | Ambiguous history resolution and text/product rail consistency | planned |
| [agents/history-agent/real-request-100-cases.md](agents/history-agent/real-request-100-cases.md) | 100 real-request History Agent scenarios, must pass 100% before close | planned |
| [agents/sales-agent/cases.md](agents/sales-agent/cases.md) | Sales response composition, product blocks, claim and id consistency | planned |
| [agents/sales-agent/real-request-100-cases.md](agents/sales-agent/real-request-100-cases.md) | 100 real-request Sales Agent scenarios, must pass 100% before close | planned |
| [agents/rag-agent/cases.md](agents/rag-agent/cases.md) | Qdrant ingestion, path grouping, rerank, review, citations, token budget | planned |
| [agents/rag-agent/real-request-100-cases.md](agents/rag-agent/real-request-100-cases.md) | 100 real-request RAG Agent scenarios with Docker Compose Qdrant | planned |
| [agents/security-agent/cases.md](agents/security-agent/cases.md) | Security gates, prompt injection, data leak, access control, output guardrail | planned |
| [agents/security-agent/real-request-100-cases.md](agents/security-agent/real-request-100-cases.md) | 100 real-request Security Agent scenarios, must pass 100% before close | planned |
| [agents/customer-support-agent/cases.md](agents/customer-support-agent/cases.md) | Support intents, RAG policy evidence, cases, escalation, no-overpromise guard | planned |
| [agents/customer-support-agent/real-request-100-cases.md](agents/customer-support-agent/real-request-100-cases.md) | 100 real-request Customer Support scenarios, must pass 100% before close | planned |
| [agents/lead-agent/cases.md](agents/lead-agent/cases.md) | Lead Agent routing, planning, final answer guardrail | planned |
| [platform/production-toolcall-cases.md](platform/production-toolcall-cases.md) | Tool-calling, idempotency, timeout, retry, trace, output guardrail | planned |
| [platform/dashboard-trace-cases.md](platform/dashboard-trace-cases.md) | Dashboard trace icon registry, new agent rendering, layout and legacy compatibility | planned |
| [retail-chatbot-hard-flow-benchmark-20/README.md](retail-chatbot-hard-flow-benchmark-20/README.md) | 20 hard chatbot prompts plus trace-flow invariants for dashboard correctness | active |

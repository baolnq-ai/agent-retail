# Agent Pipeline Docs

- Created: 2026-05-21 16:00
- Updated: 2026-05-21 20:10
- Scope: documentation index for the agent-pipeline rebuild.

## Folder Map

| Path | Purpose |
| --- | --- |
| `architecture/` | System-wide architecture and shared agent definitions |
| `platform/` | Framework/tooling decisions shared by all agents |
| `agents/{agent-name}/` | Agent-specific design docs |

## Current Docs

- [architecture/system-definition.md](architecture/system-definition.md) — shared agent roles and response rules.
- [platform/production-framework-decision.md](platform/production-framework-decision.md) — production framework/tooling decision.
- [platform/dashboard-trace-visualization.md](platform/dashboard-trace-visualization.md) - dashboard trace icon/layout rules for new agents.
- [agents/cart-agent/design.md](agents/cart-agent/design.md) — Cart SQL RAG Agent design.
- [agents/product-discovery-agent/design.md](agents/product-discovery-agent/design.md) - Product Discovery Agent design for search, recommendation and rerank.
- [agents/search-agent/design.md](agents/search-agent/design.md) - Search Agent design for hard search and embedding fallback.
- [agents/recommendation-agent/design.md](agents/recommendation-agent/design.md) - Recommendation Agent design for rerank, probability and behavior signals.
- [agents/storage-memory-agent/design.md](agents/storage-memory-agent/design.md) - Storage/Memory Agent design for near/mid/far memory and context retrieval.
- [agents/history-agent/design.md](agents/history-agent/design.md) - History Agent design for ambiguous prior-context references.
- [agents/sales-agent/design.md](agents/sales-agent/design.md) - Sales Agent design for final customer-facing answers and product blocks.
- [agents/rag-agent/design.md](agents/rag-agent/design.md) - RAG Agent design for Qdrant-backed knowledge retrieval and citations.
- [agents/security-agent/design.md](agents/security-agent/design.md) - Security Moderation Agent design for input/plan/action/data/output gates.
- [agents/customer-support-agent/design.md](agents/customer-support-agent/design.md) - Customer Support Agent design for support cases, RAG policy evidence and escalation.

# Agent Pipeline Plans

- Created: 2026-05-21 13:46
- Updated: 2026-05-22 02:30
- Status: in_progress
- Scope: central folder for the chatbot agent pipeline rebuild plans.

## Goal

This folder owns the rebuild plan for a lead-agent driven chatbot pipeline with specialist agents for cart, search, recommendation, memory, history, RAG, security, customer support, and sales response composition.

## Required Rules

- Every plan must link its related log, doc, and tests.
- Every implementation phase must update status and evidence.
- Every pipeline code change must have a test in `test/agent-pipeline/` or the relevant app test folder.
- Main project log: `logs/planning/agent-pipeline/rebuild.md`.
- Main architecture doc: `docs/agent-pipeline/architecture/system-definition.md`.

## Folder Map

| Path | Purpose |
| --- | --- |
| `architecture/` | Master plan, working rules, shared architecture |
| `platform/` | Framework/tooling, dashboard trace, runtime platform plans |
| `agents/{agent-name}/` | Per-agent plans |

## Plan Index

| Plan | Goal | Status |
| --- | --- | --- |
| [execution-tracker.md](execution-tracker.md) | Outer ordered tracker with pass checkboxes for every child plan | in_progress |
| [architecture/working-rules.md](architecture/working-rules.md) | Doc/log/plan/test rules for rebuild work | planned |
| [architecture/master-pipeline-rebuild.md](architecture/master-pipeline-rebuild.md) | Master pipeline rebuild plan | in_progress |
| [platform/production-framework-and-tooling.md](platform/production-framework-and-tooling.md) | Custom executor, tool policy, metadata handles, trace bridge | passed |
| [platform/dashboard-trace-visualization.md](platform/dashboard-trace-visualization.md) | Dashboard trace v2, icon registry, node layout, legacy compatibility | in_progress |
| [platform/dashboard-trace-status.md](platform/dashboard-trace-status.md) | Live status for dashboard trace implementation | in_progress |
| [agents/cart-agent/plan.md](agents/cart-agent/plan.md) | Cart SQL RAG Agent and production cart DB plan | planned |
| [agents/search-agent/plan.md](agents/search-agent/plan.md) | Hard search, lexical/filter search, embedding fallback, product resolve | planned |
| [agents/recommendation-agent/plan.md](agents/recommendation-agent/plan.md) | Rerank, embedding similarity, probability, behavior-based personalization | planned |
| [agents/storage-memory-agent/plan.md](agents/storage-memory-agent/plan.md) | Near/mid/far memory, preferences, behavior, cross-agent context | planned |
| [agents/history-agent/plan.md](agents/history-agent/plan.md) | Ambiguous reference resolution from conversation and agent histories | planned |
| [agents/sales-agent/plan.md](agents/sales-agent/plan.md) | Final customer-facing answer composer with product-card consistency guard | planned |
| [agents/rag-agent/plan.md](agents/rag-agent/plan.md) | Qdrant-backed internal knowledge retrieval, path rerank, citations | planned |
| [agents/security-agent/plan.md](agents/security-agent/plan.md) | Input/plan/action/data/output guardrails and audit | planned |
| [agents/customer-support-agent/plan.md](agents/customer-support-agent/plan.md) | Defects, returns, refunds, warranty, complaints, support cases | planned |
| [agents/lead-agent/plan.md](agents/lead-agent/plan.md) | Lead Agent orchestration, written last after specialist contracts are stable | planned |
| [agents/lead-agent/context-task-ledger-plan.md](agents/lead-agent/context-task-ledger-plan.md) | Lead Agent clean context, task ledger, compact refs, metadata handles, profile-driven strategy loop | planned |
| [agents/lead-agent/leader-profile-dashboard-plan.md](agents/lead-agent/leader-profile-dashboard-plan.md) | Dashboard to select, edit, clone, and create Lead Agent profiles/prompts | planned |

## Implementation Started

- Pipeline v2 backend contracts added.
- Pipeline v2 registry added.
- Orchestrator now emits `pipelineAgents` for the new architecture while legacy runtime remains compatible.
- Dashboard trace now understands the new agent and infra node ids.
- Production framework phase 1 now uses a custom NestJS `PipelineExecutor`; LangGraph/LangChain are deferred.
- Runtime refs, metadata handles, tool registry, executor service and trace bridge are implemented with API tests.
- Current verified tests are recorded in `logs/planning/agent-pipeline/rebuild.md`.

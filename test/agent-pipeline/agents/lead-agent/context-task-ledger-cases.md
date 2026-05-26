# Test Cases: Lead Agent Context Task Ledger

- Created: 2026-05-22 00:00
- Related plan: `plans/agent-pipeline/agents/lead-agent/context-task-ledger-plan.md`

## Required Cases

| ID | Scenario | Expected |
| --- | --- | --- |
| LA-CTX-001 | Lead receives add-to-cart goal with unresolved product name | Calls Cart Agent first or Search Agent based on available refs, records task ledger |
| LA-CTX-002 | Cart Agent says product not resolved under `precision-operator` | Lead appends failed/missing-data step and calls Search Agent |
| LA-CTX-003 | Search Agent returns product id and metadata handle | Lead calls Cart Agent again with product id, not raw product payload |
| LA-CTX-004 | Cart Agent confirms add success | Lead records operation fact and may call Recommendation Agent for add-ons |
| LA-CTX-005 | Sales Agent needs product details | Sales Agent uses metadata handle instead of receiving full catalog in prompt |
| LA-CTX-006 | Same failed agent call would repeat identical input | Lead blocks duplicate retry and changes route or asks user |
| LA-CTX-007 | Metadata payload is large | Lead stores payload externally and keeps only compact refs in task context |
| LA-CTX-008 | Final answer mentions cart success | Verifier requires Cart Agent operation fact |
| LA-CTX-009 | Final answer mentions product recommendation | Verifier requires product refs from Search/Recommendation |
| LA-CTX-010 | Metadata handle belongs to another user/task | Retrieval is denied |
| LA-CTX-011 | `inventory-mover` sees grounded cart add success | Lead may call Recommendation/Sales with inventory-priority constraints after safe facts exist |
| LA-CTX-012 | `support-first` sees complaint plus product mention | Lead routes Support/RAG/Security before Sales or Recommendation |

## Pass Rule

These cases must become automated backend contract/integration tests before Lead Agent implementation is closed.

# Checklist: History Agent

- Created: 2026-05-21 18:42
- Updated: 2026-05-22 14:45

## Design

- [x] Define History Agent as ambiguity/history investigation agent.
- [x] Define Lead calls it only when needed.
- [x] Define relationship with Storage/Memory and domain private histories.
- [x] Define product rail consistency requirement.
- [x] Define response-only LLM policy.
- [x] Finalize HistoryRequest/Result contracts.
- [x] Finalize source priority and confidence scoring.

## Implementation

- [x] Add ambiguity classifier.
- [x] Add safe memory retrieval adapter.
- [x] Add Cart/Search/Recommendation safe history index adapters.
- [x] Add reference resolver.
- [x] Add evidence builder.
- [x] Add next-agent hint builder.
- [x] Add product rail consistency guard.
- [ ] Add trace/audit wiring into final Lead runtime.

## Tests

- [x] Contract tests.
- [x] Ambiguity routing tests.
- [x] Reference resolution tests.
- [x] Product rail/text consistency tests.
- [x] Cross-agent tests with Search/Recommendation/Sales.
- [x] Security tests for memory leakage/cross-user isolation.
- [x] Real-request 100-case suite implemented.
- [x] Real-request 100-case suite pass 100%.

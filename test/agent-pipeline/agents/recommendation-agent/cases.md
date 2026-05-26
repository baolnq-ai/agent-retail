# Test Cases: Recommendation Agent

- Created: 2026-05-21 17:40
- Updated: 2026-05-21 18:04
- Related plan: `plans/agent-pipeline/agents/recommendation-agent/plan.md`
- Status: planned

| ID | Scenario | Expected |
| --- | --- | --- |
| RA-001 | Candidate pool from Search | Reranks without violating hard constraints |
| RA-002 | User prefers brand A | Brand A products gain score with evidence |
| RA-003 | User repeatedly ignores category B | Category B penalized |
| RA-004 | Product already in cart | Excluded or used only for complement logic |
| RA-005 | Similar products by embedding | Embedding similarity contributes score |
| RA-005A | Candidate source is embedding fallback | Reason says similar/suitable, not exact match |
| RA-006 | Out-of-stock candidate | Penalized/excluded based on policy |
| RA-007 | Need fit high but budget fit low | Score reflects tradeoff and reason |
| RA-008 | Diversity rerank | Rail avoids near-duplicates |
| RA-009 | Feedback clicked/added | Writes signal and affects next ranking test |
| RA-010 | LLM reason selects unknown id | Validator rejects |
| RA-011 | LLM emits toolcall | Ignored/rejected; backend still owns tools |
| RA-012 | No candidate pool | Returns `needs_search` or uses allowed fallback source |

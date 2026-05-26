# Real Request 100: Search Agent

- Created: 2026-05-22 15:10
- Updated: 2026-05-22 15:10
- Related plan: `plans/agent-pipeline/agents/search-agent/plan.md`
- Status: passed

## Case Groups

| Group | Count | Focus |
| --- | ---: | --- |
| 1 | 20 | Exact title search |
| 2 | 20 | Category/budget/stock filters |
| 3 | 20 | Lexical ranking |
| 4 | 20 | Semantic fallback and fallback wording |
| 5 | 10 | Hard-only no-result |
| 6 | 10 | Private interaction and near memory |

## Current Runtime Evidence

- `corepack pnpm --filter @retail-agent/api test:runtime:search-agent:100`: pass, 100/100.
- Pass report: `logs/planning/agent-pipeline/search-agent-real-request-100-report.json`.

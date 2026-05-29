# Real Request 100: History Agent

- Created: 2026-05-21 18:42
- Updated: 2026-05-22 14:45
- Related plan: `plans/agent-pipeline/agents/history-agent/plan.md`
- Status: passed

## Rule

Each case must run through API/agent runtime with seeded conversation, memory and agent history. A case passes only when resolved references, evidence, confidence, next-agent hints and product rail consistency are correct.

## Case Groups

| Group | Count | Focus |
| --- | ---: | --- |
| 1 | 10 | Previous recommendation references |
| 2 | 10 | Previous search references |
| 3 | 10 | Previous cart references |
| 4 | 10 | Ordinal references: first/second/last |
| 5 | 10 | Pronoun/demonstrative references |
| 6 | 10 | Semantic fallback preservation |
| 7 | 10 | Ambiguous or missing context |
| 8 | 10 | Lead next-agent hints: Search/Recommendation/Sales |
| 9 | 10 | Product rail and final text consistency |
| 10 | 10 | Security/privacy/deleted memory |

## Required Assertions

- `status` is correct.
- every resolved reference has evidence.
- unknown product ids are rejected.
- deleted or cross-user memory is not used.
- semantic fallback status is preserved.
- next-agent hints are correct.
- `mustMentionProductIds` and product rail ids match.
- Sales answer never mentions products outside allowed ids.

## Current Runtime Evidence

- `corepack pnpm --filter @retail-agent/api test:runtime:history-agent:100`: pass, 100/100.
- Pass report: `logs/planning/agent-pipeline/history-agent-real-request-100-report.json`.
- Harness uses isolated real Postgres users and Storage/Memory rows per case to avoid cross-case context bleed.

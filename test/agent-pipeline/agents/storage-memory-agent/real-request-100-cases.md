# Real Request 100: Storage/Memory Agent

- Created: 2026-05-21 18:18
- Updated: 2026-05-22 14:20
- Related plan: `plans/agent-pipeline/agents/storage-memory-agent/plan.md`
- Status: passed

## Rule

Each case must run through API/agent runtime, not a mock-only unit. A case passes only when retrieved context, source refs, memory side effects, privacy behavior and trace are correct.

## Case Groups

| Group | Count | Focus |
| --- | ---: | --- |
| 1 | 10 | Basic turn write/read and near context |
| 2 | 10 | Reference resolution: "lúc nãy", "cái đó", "vừa gợi ý" |
| 3 | 10 | Mid summary and long-history compaction |
| 4 | 10 | Far preferences and behavior signals |
| 5 | 10 | Cart/Search/Recommendation safe index summaries |
| 6 | 10 | Context budget and relevance scoring |
| 7 | 10 | Contradiction, staleness and confidence |
| 8 | 10 | Privacy delete/export/redaction |
| 9 | 10 | Security: cross-user, injection, sensitive memory |
| 10 | 10 | Lead integration and runtime regression |

## Required Assertions

- Context includes only authorized user memory.
- Facts have source refs.
- Summaries do not replace audit/raw sources.
- Deleted memory is not returned.
- Sensitive data is redacted.
- Domain private histories are referenced through safe summaries, not copied blindly.
- Context budget is enforced.
- Trace shows retrieval tier and evidence.

## Current Runtime Evidence

- `corepack pnpm --filter @retail-agent/api test:runtime:storage-memory-agent`: pass.
- Covered on real Postgres: turn write, cross-agent result index, preference update, behavior signal, context retrieval for "san pham vua de xuat luc nay la gi", source evidence, near-to-mid summary and sensitive email redaction.
- `corepack pnpm --filter @retail-agent/api test:runtime:storage-memory-agent:100`: pass, 100/100.
- Pass report: `logs/planning/agent-pipeline/storage-memory-agent-real-request-100-report.json`.

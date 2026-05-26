# Checklist: Storage/Memory Agent

- Created: 2026-05-21 18:18
- Updated: 2026-05-22 14:20

## Design

- [x] Define Storage/Memory Agent as central memory service.
- [x] Define near/mid/far memory tiers.
- [x] Define domain private history relationship.
- [x] Define response-only LLM policy.
- [x] Define test and real-request suite requirement.
- [x] Finalize DB schema and migration order.
- [x] Finalize MemoryRequest/Result contracts.
- [x] Finalize retention/privacy policy.

## Implementation

- [x] Add memory tables and indexes.
- [x] Add write turn/event/preference tools.
- [x] Add near retrieval.
- [x] Add mid summary retrieval.
- [x] Add far profile/signals retrieval.
- [x] Add deterministic near-to-mid summarization.
- [x] Add far compaction/decay worker.
- [x] Add cross-agent memory index writer.
- [x] Add privacy export.
- [x] Add privacy delete.
- [x] Add evidence and context budget.

## Tests

- [x] Contract tests.
- [x] DB integration tests.
- [x] Retrieval tests for near/mid/far.
- [x] Summarization tests.
- [x] Far compaction/decay tests.
- [x] Cross-agent context tests with Cart/Search/Recommendation.
- [x] Privacy delete tests.
- [x] Privacy export tests.
- [x] Sensitive data redaction tests.
- [x] Prompt injection and cross-user isolation tests.
- [x] Real-request 100-case suite implemented.
- [x] Real-request 100-case suite pass 100%.

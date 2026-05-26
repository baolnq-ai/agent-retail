# Checklist: Search Agent

- Created: 2026-05-21 17:40
- Updated: 2026-05-22 15:10

## Design

- [x] Separate Search Agent from Recommendation Agent.
- [x] Define hard search first, embedding fallback second.
- [x] Define response-only LLM policy.
- [x] Define private Search Agent history.
- [x] Remove Product Manager Agent as production boundary; Search Agent owns resolve/search.
- [x] Define semantic fallback wording: no exact claim when embedding is used.
- [x] Finalize search indexes.
- [x] Finalize SearchRequest/SearchResult contracts.

## Implementation

- [x] Add search document/index migration.
- [x] Add exact id/title lookup.
- [x] Add category/brand/attribute/price filters.
- [x] Add lexical search.
- [x] Add semantic fallback lane.
- [x] Add candidate merge/dedupe.
- [x] Add verifier/evidence.
- [x] Add SearchAgentInteraction and SearchAgentMemory.
- [ ] Add live trace/audit wiring into final pipeline.

## Tests

- [x] Exact search tests.
- [x] Filter/budget/spec tests.
- [x] Lexical ranking tests.
- [x] Semantic fallback tests.
- [x] Semantic fallback wording tests.
- [x] No-result/low-confidence tests.
- [x] No toolcall policy covered by implementation boundary.
- [x] Real-request 100-case suite implemented.
- [x] Real-request 100-case suite pass 100%.

# Checklist: Product Discovery Agent

- Created: 2026-05-21 17:20
- Updated: 2026-05-21 17:20
- Related status: `plans/agent-pipeline/agents/product-discovery-agent/status.md`

## Design

- [x] Define Product Discovery Agent as combined Search + Recommendation agent.
- [x] Define current DB/runtime gaps.
- [x] Define response-only LLM policy.
- [x] Define complete tool inventory: 1 public interface + 45 private tools.
- [x] Define real-request 100-case requirement.
- [ ] Finalize DB/search schema and migration order.
- [ ] Finalize TypeScript contracts.
- [ ] Finalize ranking and evaluator metrics.
- [ ] Finalize cache/index strategy.

## Implementation

- [ ] Add product search/recommendation schema additions.
- [ ] Add repository/allowlisted search tools.
- [ ] Add hard search lane.
- [ ] Add lexical/full-text/trigram lane.
- [ ] Add embedding fallback lane.
- [ ] Add candidate merge/dedupe.
- [ ] Add rerank/scoring pipeline.
- [ ] Add LLM judge response-only parser/validator.
- [ ] Add candidate snapshot/audit.
- [ ] Add feedback signal writer.
- [ ] Add trace events.

## Tests

- [ ] Contract tests for request/result/private plan schemas.
- [ ] DB integration tests for search indexes and candidate snapshots.
- [ ] Ranking tests for budget/category/spec/stock constraints.
- [ ] Semantic fallback tests.
- [ ] Recommendation personalization tests.
- [ ] Negative tests for unknown product ids, raw SQL, unsafe LLM output.
- [ ] Cross-agent tests with Cart Agent handoff.
- [ ] Real-request 100-case suite implemented.
- [ ] Real-request 100-case suite pass 100%.

## Close Criteria

- [ ] `status.md` all phases done.
- [ ] `logs/log-plan-agent-pipeline/product-discovery-agent.md` has final pass report.
- [ ] Runtime response product rail and final text always use the same selected product ids.
- [ ] No unverified product claims in final user-facing response flow.

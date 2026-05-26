# Checklist: Recommendation Agent

- Created: 2026-05-21 17:40
- Updated: 2026-05-21 17:52

## Design

- [x] Separate Recommendation Agent from Search Agent.
- [x] Define rerank + embedding + ML-style probability pipeline.
- [x] Define behavior and feedback signals.
- [x] Define response-only LLM policy.
- [x] Define private Recommendation Agent history.
- [x] Define Lead usage boundary for recommendation requests.
- [ ] Finalize feature schema.
- [ ] Finalize RecommendationRequest/Result contracts.

## Implementation

- [ ] Add behavior/preference/feedback schema.
- [ ] Add RecommendationAgentInteraction and RecommendationAgentMemory.
- [ ] Add candidate source adapters from Search/embedding/popular/catalog.
- [ ] Add feature extractor.
- [ ] Add scoring/probability model.
- [ ] Add rerank/diversity constraints.
- [ ] Add feedback signal writer.
- [ ] Add verifier/evidence/trace.

## Tests

- [ ] Preference ranking tests.
- [ ] Behavior ranking tests.
- [ ] Probability calibration tests.
- [ ] Diversity tests.
- [ ] Out-of-stock/already-in-cart tests.
- [ ] Feedback learning-loop tests.
- [ ] LLM response-only negative tests.

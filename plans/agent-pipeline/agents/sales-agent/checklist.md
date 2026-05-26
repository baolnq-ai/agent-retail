# Checklist: Sales Agent

- Created: 2026-05-21 19:02
- Updated: 2026-05-21 19:02

## Design

- [x] Define Sales Agent as final response composer.
- [x] Define input from Lead: original user question + grounded agent results.
- [x] Define no-search/no-recommend/no-cart-mutation boundary.
- [x] Define product rail consistency contract.
- [x] Define response-only LLM policy.
- [ ] Finalize SalesRequest/SalesResult contracts.
- [ ] Finalize response templates.

## Implementation

- [ ] Add Sales Agent service contract.
- [ ] Add response-only JSON parser/validator.
- [ ] Add product block builder.
- [ ] Add text/product id verifier.
- [ ] Add forbidden claims guard.
- [ ] Add trace/audit.

## Tests

- [ ] Contract tests.
- [ ] Product id consistency tests.
- [ ] Sales tone/template tests.
- [ ] Forbidden claim tests.
- [ ] Multi-product recommendation response tests.
- [ ] Referenced product + companion products tests.
- [ ] Lead integration tests.
- [ ] Real-request 100-case suite implemented.
- [ ] Real-request 100-case suite pass 100%.

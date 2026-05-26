# Log: Search Agent Plan Job

- Created: 2026-05-21 17:40
- Updated: 2026-05-22 15:10
- Type: planning
- Related job: `plans/agent-pipeline/agents/search-agent/`

## 2026-05-21 17:40

### Goal

Split Search Agent out of the combined Product Discovery plan.

### Work done

- Created Search Agent job folder, plan, status, checklist, doc and test cases.
- Defined hard/exact search first, embedding fallback only on low recall.
- Kept LLM response-only, no toolcall.

### Decision

Search Agent owns retrieval and product resolve. Recommendation Agent owns personalized ranking/probability.

## 2026-05-21 17:52

### Update

- Confirmed Lead Agent uses Search Agent for search/resolve.
- Confirmed Product Manager Agent is skipped in the new production architecture.
- Added private Search Agent history: `SearchAgentInteraction` and `SearchAgentMemory`.

## 2026-05-21 18:04

### Update

- Added semantic fallback wording rule.
- Search Agent must not claim exact product match when embedding fallback is used.
- Added `matchType` and handoff claim rules to Search Agent result contract.
- Added tests for fallback wording and forbidden exact-match claims.

## 2026-05-22 15:10

### Goal

Implement and close Search Agent runtime after History Agent passed.

### Work done

- Added search schema: `ProductSearchDocument`, `ProductEmbedding`, `SearchAgentInteraction`, `SearchAgentMemory`.
- Added `SearchAgentService` and registered it in `AppModule`.
- Implemented exact id/title, hard filters, lexical ranking, semantic fallback, merge/dedupe, verifier/evidence and private near history.
- Added semantic fallback guard for specific product-like queries when exact match is missing.
- Added unit tests and real Postgres 100-case harness.

### Verification

- `corepack pnpm --filter @retail-agent/api db:generate`: pass.
- `corepack pnpm --filter @retail-agent/api test`: pass, 89/89.
- `corepack pnpm --filter @retail-agent/api db:push`: pass after retry.
- `corepack pnpm --filter @retail-agent/api test:runtime:search-agent:100`: pass, 100/100.

### Decision

Search Agent close gate passed. Live Lead/Cart/Recommendation wiring remains in later integration plans.

# Phase 18 User-Aware Memory Log

Date: 2026-05-15

## Work completed

- Added `ChatMemoryService` and registered it in the API module.
- Added authenticated current-cart service methods and current-cart controller routes.
- Updated chat controller to read the user from the HttpOnly session cookie.
- Updated `AgentService` to use the authenticated user's current cart when no explicit cart id is supplied.
- Added recent chat history and user preference context to the LLM prompt.
- Saved chat turns and recent category preferences after normal and streaming chat responses.
- Updated frontend login to load the authenticated current cart.
- Updated logged-in add-to-cart to use `/api/v1/cart/current/items`.
- Added runtime user-memory test and included it in the API runtime chain.

## Issues resolved

- The first memory runtime assertion read `items` from the helper wrapper instead of `body`; fixed the test.
- The chat response assertion also needed to read from `body`; fixed the test.
- Prisma 7 test code required the `@prisma/adapter-pg` adapter instead of the old `datasources` constructor option.
- `runtime-model-gateway.mjs` needed `DATABASE_URL` because app startup now always initializes Prisma.

## Validation

- API typecheck: passed.
- Web typecheck: passed.
- User memory runtime test: passed.
- Full API runtime chain: passed.
- Web source test: passed.
- Web runtime build/request test: passed.

## Notes

- Guest `cartId` routes remain compatible with existing tests and web initial state.
- Authenticated chat now stores memory, but business action parsing remains the next phase.

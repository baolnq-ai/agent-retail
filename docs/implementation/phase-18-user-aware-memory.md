# Phase 18 — User-aware cart and chat memory

Date: 2026-05-15

## Scope

Connected authenticated users to their own active cart and persisted chat memory foundation for future personalization.

## Backend

- Added `ChatMemoryService` to load recent user turns and preference summaries.
- Persisted authenticated chat turns into `ChatThread` and `ChatMessage`.
- Persisted recent recommended product categories into `UserPreference`.
- Added `UserInteractionEvent` recording helper for later product view/click tracking.
- Added current-cart endpoints:
  - `GET /api/v1/cart/current`
  - `POST /api/v1/cart/current/items`
- Updated agent chat endpoints to resolve user identity from the HttpOnly cookie.
- Updated agent prompt context to include recent chat turns and stored preferences for logged-in users.
- Kept legacy `cartId` routes working for existing runtime tests and guest flows.

## Frontend

- After login/register, the storefront loads `/api/v1/cart/current` with `credentials: 'include'`.
- Logged-in add-to-cart calls `/api/v1/cart/current/items` so cart changes attach to the authenticated user.
- Logout resets back to the initial guest cart state.

## Runtime validation

Added `runtime-user-memory.mjs` with real HTTP requests and DB assertions:

- Registers two users with real auth cookies.
- Adds an item to user A's current cart.
- Verifies user B's current cart remains separate.
- Sends a real chat request as user A.
- Verifies `ChatThread`, `ChatMessage`, and `UserPreference` rows are persisted.

Passed validation:

- `corepack pnpm --filter @retail-agent/api typecheck`
- `corepack pnpm --filter @retail-agent/web typecheck`
- `corepack pnpm --filter @retail-agent/api test:runtime`
- `corepack pnpm --filter @retail-agent/web test`
- `corepack pnpm --filter @retail-agent/web test:runtime`

## Remaining work

- Build deterministic sales-agent intent/action/recommendation pipeline.
- Support multi-product actions like “thêm cả 2 vào giỏ”.
- Persist product view/click events from the product suggestion UI.

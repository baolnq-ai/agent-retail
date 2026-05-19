# Phase 19 — Account cart and ecommerce page redesign

Time: 2026-05-15

## Summary

This phase fixes the cart/action mismatch reported during real testing and starts moving the storefront toward a professional ecommerce structure.

## Backend changes

- Added authenticated current-cart mutations in `CommerceService` and `CommerceController`:
  - clear all items from the current account cart.
  - remove one product from the current account cart.
  - update one product quantity in the current account cart.
- Extended `AgentService` with deterministic `clear_cart` parsing for Vietnamese/English clear-cart requests.
- Cart mutation chat actions now use backend state as source of truth and require login for account cart actions.

## Frontend changes

- Removed the fixed `web-demo-cart` SSR load from the home page.
- Guest users now see an account-required cart state instead of a real demo cart.
- Add-to-cart requires an authenticated account and uses `/api/v1/cart/current/items`.
- Chat stream no longer sends a frontend cart id, so the API resolves cart by httpOnly session cookie.
- Added ecommerce routes:
  - `/products`
  - `/products/[id]`
  - `/cart`
  - `/account`
- Replaced the old `/` long-scroll `RetailClient` storefront with a green/black ecommerce landing page that links into the separate catalog, cart, account, and product detail routes.
- Extracted the chatbot UI into `RetailChatWidget` so the new homepage keeps the chat assistant without bringing back the old storefront layout.
- Added a green/black ecommerce styling layer for the new pages.

## Validation

Passed real checks:

```txt
corepack pnpm --filter @retail-agent/api typecheck
corepack pnpm --filter @retail-agent/web typecheck
corepack pnpm --filter @retail-agent/web test
corepack pnpm --filter @retail-agent/api test:runtime
corepack pnpm --filter @retail-agent/web test:runtime
```

`test:runtime` uses real HTTP requests against spawned API/web processes. API runtime includes real LLM, embedding, rerank, DB catalog, auth, user cart isolation, and clear-cart via chat.

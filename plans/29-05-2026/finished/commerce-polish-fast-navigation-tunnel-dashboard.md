# Plan: storefront UX polish, fast navigation, chat animation, tunnel dashboard fix

Date: 29-05-2026

## Goals
- Replace dashboard-like storefront styling with a polished end-user commerce feel.
- Smooth chatbot typing animation so it pulses and morphs gently instead of jittering vertically.
- Remove rough page-top title blocks and unprofessional descriptive copy from customer-facing screens.
- Add commerce banner/carousel treatment, sharper typography, cleaner buttons, and icon-only theme/chat controls.
- Make navigation and search feel instant by prefetching data/routes and avoiding unnecessary full page jumps where practical.
- Improve popup/chat entrance animation with a smoother reveal.
- Replace the visible "Trợ lý mua sắm" text trigger with a chatbot icon.
- Hide the Next.js dev indicator in local development.
- Investigate tunnel `530` on `/agent-dashboard` and restart/update tunnel config if the old public URL is unregistered.

## Steps
1. Audit current app shell, home, products, cart, dashboard, chat, CSS, and runtime config.
2. Update global CSS tokens, typography, buttons, navbar, theme toggle, chat launcher, loading dots, and modal/popup animation.
3. Redesign storefront pages around retail banner/carousel/product rows instead of top title sections.
4. Optimize route/search interactions with prefetch, local transitions, cached API fetches, and lighter route loading states.
5. Fix or refresh Cloudflare tunnel URL for dashboard route; update `.env` and docs only if URL changes.
6. Run typecheck/tests, start setup if needed, capture browser screenshots, and record frontend test evidence.
7. Move this plan to `plans/29-05-2026/finished/` after validation.

## Done Criteria
- Chat animation looks smooth with no vertical shake.
- Main pages feel like an end-user commerce site, not an internal dashboard.
- Theme switch uses icons only; chat launcher uses an icon.
- Next dev indicator is hidden.
- Product/search navigation is responsive and prefetches likely routes.
- Dashboard works through the active tunnel or `.env` is updated with a live replacement.
- Frontend validation and screenshot evidence are saved under `tests/frontend tests/`.

## Completion Notes
- Replaced rough storefront hero/copy with customer-facing banner, carousel, and product grids.
- Products search/category filter now runs client-side with `window.history.replaceState`, avoiding route submit on every search.
- Chat launcher and theme switch use icons; chat window actions use compact icon buttons.
- Chat typing/loading animation now morphs with scale/opacity instead of vertical jumping.
- Popup reveal animation added for chat window.
- Next.js dev portal is hidden with CSS; runtime check showed the portal exists but has `display: none`.
- Tunnel `/agent-dashboard` at the configured Cloudflare URL returns HTTP 200.
- Validation passed: `corepack pnpm validate`, `corepack pnpm --filter @retail-agent/web test`.

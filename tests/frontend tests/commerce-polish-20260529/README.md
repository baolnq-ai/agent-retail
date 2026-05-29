# Commerce Polish Evidence - 2026-05-29

## Screenshots
- `01-home-commerce-banner.png`: home banner, carousel, navbar, icon chat launcher.
- `02-products-client-search.png`: catalog live search không submit route.
- `03-chat-popup-icon-animation-state.png`: chat popup mở với icon controls.
- `04-tunnel-dashboard-200.png`: dashboard qua Cloudflare tunnel trả trang app thay vì 530.

## Commands
- `corepack pnpm validate`
- `corepack pnpm --filter @retail-agent/web test`
- `Invoke-WebRequest https://screensaver-constructed-entered-tales.trycloudflare.com/agent-dashboard`

## Result
- Frontend typecheck/tests pass.
- API tests pass.
- Tunnel dashboard HTTP 200.

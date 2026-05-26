# Plan: Real Catalog Web Redesign

- Created: 2026-05-25 10:33
- Updated: 2026-05-25 11:07
- Status: closed
- Related log: logs/planning/real-catalog-web-redesign.md

## Goal
Replace the fake retail catalog with 100 real product records, real image URLs, and source attribution, then redesign the customer web experience with a compact retail style inspired by The Gioi Di Dong while using a green, black, and blue visual system with dark/light modes and responsive layouts for desktop, tablet, and mobile.

## Scope
- In: catalog seed/API typing, product images/source metadata, home page, product listing, product detail, cart/chat product surfaces, global shell/theme styles, responsive states, UI evidence screenshots.
- In: preserve the agent pipeline behavior by keeping products close to the current categories: air, kitchen, cleaning, smart home, personal care, and climate.
- Out: exact clone of The Gioi Di Dong, scraping private/hidden APIs, hardcoded chatbot answers, unrelated dashboard/agent-flow changes unless the new web shell breaks them.

## Skills
- plan-skill
- frontend-skill
- backend-skill
- testing-skill
- logging-skill

## Phases
| Phase | Goal | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Create plan/log and map current catalog/UI structure | done | plan/log files |
| 2 | Gather real-data/design references and define catalog fields | done | source notes in log |
| 3 | Update seed/API/product models for 100 sourced products | done | local DB count: 100, sampled image/source metadata |
| 4 | Redesign web UI with compact retail hierarchy, images, popups, dark/light, responsive rules | done | screenshots in evidence folder |
| 5 | Run verification: API tests, web typecheck/tests/build, live UI screenshots | done | API 94/94, web test/build, runtime catalog, screenshots |
| 6 | Final report, risks, close/move plan | done | completed log and closed plan |

## Verification
- API: catalog returns exactly 100 products with image/source metadata and search still works for core categories.
- Web: `@retail-agent/web` typecheck/test/build pass.
- Runtime: open app in browser, verify home/list/detail/cart/chat product surfaces show real images and compact layout.
- Responsive: capture desktop 16:9, tablet, and mobile screenshots for light/dark modes.
- Evidence: create `test/real-catalog-web-redesign-evidence-2026-05-25/README.md` with screenshots and notes.

## Close criteria
- Fake placeholder catalog removed from primary seed and main product UI.
- 100 products use real names, real images, and source attribution.
- Web layout is readable, compact, modern, and responsive across desktop/tablet/mobile.
- No hardcoded chatbot/pipeline fallback added.
- Tests/evidence are recorded, reviewed, and linked from the log.

## Close Summary
- Closed 2026-05-25 11:07.
- Evidence: `test/real-catalog-web-redesign-evidence-2026-05-25/`.
- Running app: `http://127.0.0.1:7000` with API `http://127.0.0.1:7010`.

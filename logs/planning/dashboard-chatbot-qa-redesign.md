# Log: Dashboard Chatbot QA Redesign

- Created: 2026-05-25 08:02 +07:00
- Type: planning/frontend-testing
- Related plan: `plans/frontend/dashboard-chatbot-qa-redesign.md`

## 2026-05-25 08:02

### Goal

Redesign the agent dashboard and chat loading UI, then add real chatbot QA questions and evidence instead of only claiming tests passed.

### Initial Findings

- Dashboard graph uses many fixed node positions, causing overlap on dense traces.
- Interaction cards below the graph are too large and make the page feel noisy.
- Playback canvas exists, but the visual route is not clear enough and bidirectional edges are not easy to distinguish.
- Chat has a top progress strip but no compact current status message near the conversation body.
- Typing/loading animation is basic and does not feel like a modern assistant.

### Planned Work

- Add dashboard detail popup and compact edge summary.
- Improve graph layout with collision spacing.
- Draw separate colored paths for call/return/data/write/guard, including directional offset for two-way edges.
- Add better status and typing animation to chat.
- Add a 20-prompt chatbot QA list and output review report.

## 2026-05-25 08:08

### Plan Organization

- Moved the active task plan into `plans/running/dashboard-chatbot-qa-redesign.md`.
- Added plan lifecycle notes: keep it in `running` while implementation is active, then close and move it to `plans/frontend/dashboard-chatbot-qa-redesign.md` after verification.

## 2026-05-25 08:28

### Work Done

- Reworked dashboard graph controls with route legend, route summary chips, active route label and click-to-open detail popup.
- Added node spacing/collision pass for dense traces.
- Kept animation on the canvas playback layer instead of animating all SVG background edges.
- Added chat in-window run status and a three-dot assistant loading animation.
- Added `test/agent-pipeline/chatbot-qa/cases.md` with 20 practical prompts and `runtime-chatbot-qa-20.mjs` to read real API outputs.
- Captured screenshot evidence under `test/dashboard-chatbot-qa-evidence-2026-05-25/`.

### Verification

- `corepack pnpm --filter @retail-agent/web typecheck`: pass.
- `corepack pnpm --filter @retail-agent/web test`: pass, 3/3.
- `corepack pnpm --filter @retail-agent/api test`: pass, 93/93.
- `corepack pnpm --filter @retail-agent/web build`: pass.
- `node test/agent-pipeline/chatbot-qa/runtime-chatbot-qa-20.mjs`: completed 20/20; 19 pass, 1 warn, 0 fail.

### Remaining Risk

- QA-006 is a real chatbot quality warning: "Có robot hút bụi nào hợp nhà có thú cưng không?" was classified as `cart_action` instead of recommendation.

## 2026-05-25 08:34

### Close

- Evidence hygiene completed: README files present, no duplicate image hashes, no common secret patterns in evidence README/report.
- Plan status changed to `closed`.
- Plan moved from `plans/running/dashboard-chatbot-qa-redesign.md` to `plans/frontend/dashboard-chatbot-qa-redesign.md`.

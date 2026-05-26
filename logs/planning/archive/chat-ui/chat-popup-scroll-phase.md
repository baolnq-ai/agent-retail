# Chat popup scroll phase log

Time: 2026-05-18

- Changed chat popup container from CSS grid to flex column so only the message pane owns vertical scrolling.
- Set `.chat-messages` to `flex: 1`, `min-height: 0`, `overflow-y: auto`, `overflow-x: hidden`, and `touch-action: pan-y`.
- Anchored header, progress line, and composer as fixed flex children inside the popup.
- Changed assistant/user bubbles from grid alignment to flex alignment.
- Updated auto-scroll to run in `requestAnimationFrame` after React renders streamed messages.
- Validation passed:
  - `corepack pnpm --filter @retail-agent/web typecheck`
  - `corepack pnpm --filter @retail-agent/web test`

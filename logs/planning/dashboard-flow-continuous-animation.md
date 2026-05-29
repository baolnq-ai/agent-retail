# Log: Dashboard Flow Continuous Animation

- Started: 2026-05-25 11:20 +07:00
- Closed: 2026-05-25 11:54 +07:00
- Status: closed
- Related plan: `plans/frontend/dashboard-flow-continuous-animation.md`
- Evidence: `tests/dashboard-flow-continuous-evidence-2026-05-25/`

## Goal

Make the dashboard graph behave like a compact network map: all visible paths animate together, outbound and return colors are clear, and the graph does not draw frontend-only routes that are not present in backend trace data.

## Changes

- Removed sequential pause/replay playback controls from the graph.
- Changed visual edge semantics to two tones only:
  - outbound: green
  - return: blue
- Removed SVG arrow markers.
- Shortened canvas pulse trails by sampling only a short segment near the moving dot.
- Added `data-edge-*` attributes to rendered SVG paths so DOM edges can be audited against backend `graphEdges`.
- Locked playback events to rendered backend graph-edge keys via `visibleEdgeKeys` and `playbackEdgeKey`.
- Reduced node typography weight/size to improve readability.
- Removed dead CSS for old active-route playback UI.
- 2026-05-25 12:09: Fixed a regression where canvas animation could freeze because `prefers-reduced-motion` set progress to a constant value and playback events were filtered too tightly. Animation now runs from the visible backend `graphEdges` and reduced-motion only slows the loop.
- 2026-05-25 12:09: Replaced line-trail pulse with circular moving dots to avoid any arrow-like shape.
- 2026-05-25 12:50: Hid SVG route strokes completely for particle-only flow; paths remain only for click hit-testing and backend edge metadata. Legend changed from mini-lines to dots.

## Verification

- `corepack pnpm --filter @retail-agent/web typecheck`: pass.
- `corepack pnpm --filter @retail-agent/web test`: pass, 3/3.
- `corepack pnpm --filter @retail-agent/web exec node tests/runtime-agent-dashboard.mjs`: pass.
- Chrome screenshot review:
  - `app/05-live-dashboard-short-tail.png`
  - `app/06-live-dashboard-full-graph.png`
- Chrome CDP dynamic proof:
  - `app/dashboard-flow-animation.gif`
- DOM/backend report:
  - `allDomEdgesExistInApiGraphEdges`: true
  - `noSvgArrowMarkers`: true
  - `onlyTwoVisualEdgeTones`: true
  - `legendUsesGreenForOutboundAndBlueForReturn`: true
  - `canvasPresent`: true
- Motion report after final fix:
  - `animationFrameChanged`: true
  - `noSvgMarkers`: true
  - `prefersReducedMotion`: true in test environment, but animation still changed.
  - `svgPathHidden`: true.
  - `legendUsesDots`: true.

## Result

Dashboard flow animation is closed with visual and DOM/backend evidence. Remaining improvement, if requested later: expose more backend edges through zoom/filter controls instead of compacting to 12 visible edges.

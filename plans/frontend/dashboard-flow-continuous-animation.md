# Plan: Dashboard Flow Continuous Animation

- Created: 2026-05-25 11:20
- Updated: 2026-05-25 12:50
- Status: closed
- Related log: logs/planning/dashboard-flow-continuous-animation.md

## Goal

Clean up the agent dashboard network graph so it matches the requested compact dark network style: continuous edge motion, outbound/return color semantics only, no arrow clutter, short readable trails, and no frontend edges that are not backed by backend trace data.

## Scope

- In: dashboard SVG/canvas edge rendering, legend colors, arrow removal, short trail animation, readable node typography, DOM/backend edge validation, screenshot/GIF evidence.
- Out: backend agent-routing changes, benchmark scoring changes, product catalog changes.

## Skills

- frontend-skill
- testing-skill
- logging-skill

## Phases

| Phase | Goal | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Remove sequential playback controls and convert graph to continuous flow | done | `TracePlaybackCanvas`; CSS `agentFlowDash` |
| 2 | Fix visual semantics: no arrows, green outbound, blue return, particles only | done | `test/dashboard-flow-continuous-evidence-2026-05-25/app/08-live-dashboard-particles-only.png` |
| 3 | Prove graph edges are backed by backend trace data | done | `reports/dashboard-edge-dom-backend-report.json` |
| 4 | Capture animation proof and fix reduced-motion freeze | done | `app/dashboard-flow-animation.gif`; `reports/dashboard-animation-motion-report.json` |
| 5 | Run frontend checks and close | done | Web typecheck/test/runtime dashboard pass |

## Verification

- `corepack pnpm --filter @retail-agent/web typecheck`
- `corepack pnpm --filter @retail-agent/web test`
- `corepack pnpm --filter @retail-agent/web exec node tests/runtime-agent-dashboard.mjs`
- Chrome CDP DOM/backend report for rendered `.agent-node-edge` elements.
- Chrome CDP GIF frame capture for animation proof.

## Close Criteria

- Graph has only two visual edge tones: outbound and return.
- SVG arrows are removed.
- Animation trail is short and not visually overdrawn.
- Rendered DOM edges are a subset of backend `graphEdges`.
- Evidence folder has screenshots, GIF, and report.

## Close Summary

- Closed: 2026-05-25 11:54 +07:00.
- Evidence: `test/dashboard-flow-continuous-evidence-2026-05-25/`.
- DOM/backend checks passed: API graph edges 29, rendered DOM edges 12, marker count 0, canvas count 1, all checks true.
- Follow-up fix 2026-05-25 12:09: canvas animation no longer freezes under reduced-motion; rendered motion report shows `animationFrameChanged: true` and marker count 0.
- Follow-up fix 2026-05-25 12:50: SVG route strokes are hidden; dashboard now shows only moving particles. Motion report shows `svgPathHidden: true`.

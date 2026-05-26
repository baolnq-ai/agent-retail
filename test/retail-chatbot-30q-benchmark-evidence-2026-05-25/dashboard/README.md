# Dashboard Evidence

Captured through the real dashboard route on `http://127.0.0.1:7000/agent-dashboard`.

## Screenshots

- `01-dashboard-clean-layout.png`: graph uses 12 visible nodes with no node overlap and no floating chat launcher over the canvas.
- `02-dashboard-animation-frame-a.png`: first animation frame with colored moving route particles.
- `03-dashboard-animation-frame-b.png`: second animation frame showing particles/trails at different positions.

## Audit

`frontend-cdp-audit.json` reports:

- `nodeCount`: 12
- `overlapPairs`: 0
- trace status: realtime policy trace

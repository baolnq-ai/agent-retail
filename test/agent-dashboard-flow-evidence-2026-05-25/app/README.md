# App Screenshots

## Run Report

Target: `http://127.0.0.1:7000/agent-dashboard`

Result: pass. The dashboard keeps the original canvas graph with thin route lines and moving green/blue particles. Step numbers are embedded inside the source node, specialist calls write back through `Task`, returns go to `Lead`, and the final response is visible as `Lead -> Text`.

CDP layout assertions passed for all screenshots: no horizontal overflow, no node clipping inside the canvas, no node overlap, no separate floating step badges, no hidden step text, route lines present, and `canvas.agent-playback-canvas` present.

## Screenshots

- `01-dashboard-recommendation-desktop.png`: full recommendation canvas with context reads/writes, DB/tool/LLM interactions, Sales handoff, and final `Lead -> Text` response.
- `02-dashboard-cart-desktop.png`: full cart canvas with product resolve, cart write, recommendation handoff, Sales handoff, and final `Lead -> Text` response.
- `03-dashboard-dense-mobile.png`: full dense mobile canvas at 390px with no horizontal overflow and node-embedded step numbers.

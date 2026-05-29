# Agent Dashboard Icon/Legend Density Evidence - 2026-05-26

## Scope

- Verify the current single agent dashboard canvas after the latest screenshot correction.
- Confirm no extra flow dashboard below the canvas.
- Confirm no painted/highlighted cluster background regions are rendered.
- Confirm compact, centered node icons and readable step badges.
- Confirm return/write-back edges through task/session context stay visible.

## Evidence

- `app/01-dashboard-recommendation-single-canvas.png`: first screenshot before final overlap/legend cleanup.
- `app/02-dashboard-recommendation-single-canvas-fixed.png`: final desktop screenshot after cleanup.
- `app/audit-recommendation.json`: first DOM audit.
- `app/audit-recommendation-fixed.json`: final DOM audit.
- `app/03-dashboard-svg-icons-agent-clusters.png`: first SVG-icon pass, caught invalid private history for tool clones.
- `app/04-dashboard-svg-icons-agent-clusters-fixed.png`: fixed tool/private-history ownership pass.
- `app/05-dashboard-svg-icons-agent-clusters-no-overlap.png`: pass with 9.2s line animation but remaining sales-history overlap.
- `app/06-dashboard-svg-icons-final.png`: final reviewed screenshot with SVG icons, per-agent history/tool instances, and no overlap.
- `app/audit-svg-icons-final.json`: final DOM/layout audit for the SVG icon pass.
- `app/07-dashboard-meaningful-icons-flow-audit.png`: icon-meaning/layout pass before flow normalization, caught unresolved call paths.
- `app/08-dashboard-flow-checked-meaningful-icons.png`: final screenshot after meaningful icon pass, faster particles, clearer groups, and flow normalization.
- `app/audit-flow-checked-meaningful-icons.json`: final flow audit.
- Later hard-flow evidence is also recorded in `tests/retail-chatbot-hard-flow-benchmark-evidence-2026-05-26/`.
  - `app/09-dashboard-legend-trimmed-hard-flow.png`: screenshot after removing unused legend color entries.
  - `app/audit-legend-trimmed-hard-flow.json`: DOM audit for trimmed legend and hard-flow pass.

## Final Audit

- Nodes: 20
- Edges: 48
- SVG node icons: 20
- Legend abbreviation text: none
- Cluster background regions: 0
- Extra trace/flow dashboard panels: 0
- Overlap pairs: 0
- Unresolved call paths: 0
- Max node width: 78px
- Max icon width: 36px
- Max SVG icon width: 21px
- Step badge font: 11.5px
- Line animation source: `6.13s linear`, 1.5x faster than the previous `9.2s`
- Latest legend rule: only line colors `Gửi đi` and `Trả về` plus node icon/shape meanings. `Đọc dữ liệu`, `Ghi dữ liệu`, and `Guard` are not shown in the main canvas legend because the current canvas visually collapses those into call/return flow colors.

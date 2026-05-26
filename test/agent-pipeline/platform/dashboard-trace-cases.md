# Test Cases: Dashboard Trace Visualization

- Created: 2026-05-21 20:10
- Updated: 2026-05-22 00:45
- Related plan: `plans/agent-pipeline/platform/dashboard-trace-visualization.md`
- Status: planned

## Goal

Đảm bảo dashboard agent vẫn vẽ được đầy đủ khi thêm agent mới, không crash, không mất node, không chữ chồng chữ, icon dễ hiểu, và canvas animation phát lại đúng đường đi runtime của câu hỏi.

## Cases

| ID | Scenario | Expected |
| --- | --- | --- |
| DASH-001 | Legacy trace with `memory-agent`, `product-manager-agent`, `sales-agent` | Renders exactly as before |
| DASH-002 | New full pipeline trace with all 10 agents | All agents render with icon/short code |
| DASH-003 | Trace includes `security-agent` guard edge | Shield/guard node visible, edge status clear |
| DASH-004 | Trace includes `customer-support-agent` | Support icon visible, not confused with Sales |
| DASH-005 | RAG trace includes Qdrant + document nodes | RAG, vector DB and doc nodes render |
| DASH-006 | Cart trace includes Postgres/tool nodes | Cart, DB and tool nodes render near each other |
| DASH-007 | Unknown future agent id | Fallback agent icon and short code, no crash |
| DASH-008 | Unknown service/tool kind | Fallback kind icon, no crash |
| DASH-009 | Long agent label/detail | Canvas node size stable, full text in tooltip/detail |
| DASH-010 | Many tool nodes > 12 | Low-level tools can group/collapse |
| DASH-011 | Node status `blocked` | Distinct blocked state shown |
| DASH-012 | Node status `error` | Error state visible without layout shift |
| DASH-013 | Mobile viewport | No overlap, graph scroll/scale usable |
| DASH-014 | Tablet viewport | No text overflow or clipped controls |
| DASH-015 | Desktop wide viewport | Edges and nodes stay readable |
| DASH-016 | `prefers-reduced-motion` | No distracting animation |
| DASH-017 | Icon-only node keyboard focus | Accessible name and focus state present |
| DASH-018 | Missing `iconKey` | Registry fallback works |
| DASH-019 | Missing `nodes`, old `steps` only | Legacy fallback graph works |
| DASH-020 | Security block final response | Dashboard shows block path and does not expose sensitive payload |
| DASH-021 | Simple capability/support trace `user -> lead -> rag -> qdrant/tool -> support/sales -> response` | Canvas animates only those nodes/edges, then loops |
| DASH-022 | Product search trace uses Search + Postgres + Recommendation | Canvas path follows ordered edges; non-used Cart/RAG nodes do not animate |
| DASH-023 | Cart mutation trace uses Cart + Postgres/write tool | Write edge has distinct subtle style and returns to Lead before response |
| DASH-024 | RAG trace uses Qdrant and document/context tool | RAG node, vector DB/tool, and return edge animate in order |
| DASH-025 | Trace event appended while streaming | New edge joins playback without resetting the whole canvas |
| DASH-026 | Large dense trace with grouped tool node | Animation stays smooth and grouped node shows count/metric |
| DASH-027 | Reduced motion enabled | Canvas shows static active path or minimal slow pulse, no looping motion |
| DASH-028 | Low-end viewport/performance check | Dashboard remains responsive; no layout shift while animation runs |

## Automation Target

- Unit test for node normalization/icon registry.
- Runtime web test for legacy trace fixture.
- Runtime web test for full pipeline trace fixture.
- Browser screenshot checks for desktop/tablet/mobile.
- Canvas playback check for actual ordered trace route.
- Performance check for smooth playback and no layout thrash.
- Accessibility smoke for icon-only nodes.

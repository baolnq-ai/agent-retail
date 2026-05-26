# Dashboard Trace Visualization

- Created: 2026-05-21 20:10
- Updated: 2026-05-22 00:45
- Status: draft
- Related plan: `plans/agent-pipeline/platform/dashboard-trace-visualization.md`

## Purpose

The agent dashboard must remain stable as the pipeline adds new agents. The UI should show each agent as a recognizable icon first, with short code text only as fallback.

The dashboard must also replay the actual runtime route of each user question on a lightweight canvas animation layer. It should show the signal moving from user message to Lead Agent, through the agents, DBs, services and tools that were actually used, then back to final response.

## Design Rules

- Use familiar lucide icons for agent roles and infrastructure nodes.
- Keep labels short on the canvas; full names go to tooltip/detail.
- Support unknown nodes without crash by falling back to kind-based icon and short code.
- Keep DB/service/tool nodes visually different from agent nodes.
- Preserve legacy trace ids until old runtime is fully replaced.
- Animate only the ordered edges present in the selected trace.
- Keep playback smooth, calm and lightweight; avoid blinking/jitter.
- Respect reduced-motion preferences.

## Minimum Node Coverage

Agents:

- Lead, Cart, Search, Recommendation, Storage/Memory, History, Sales, RAG, Security, Customer Support.

Infrastructure:

- PostgreSQL, Qdrant/vector DB, LLM service, pipeline executor, backend tool, document/text nodes.

## Canvas Playback

Playback requirements:

- Start at `user-message`.
- Follow trace edge order.
- Highlight active source node, target node and edge.
- Show call, return, data, guard and write edges with subtle distinct styles.
- Pause at `assistant-response`, then loop.
- If streaming appends trace events, add them without resetting the whole animation.
- Non-used agents can stay dim or hidden, but must not animate.

Example route:

```txt
user-message -> lead-agent -> rag-agent -> qdrant-db/tool -> rag-agent -> customer-support-agent/sales-agent -> assistant-response
```

Performance requirements:

- Use canvas 2D or similarly lightweight rendering for moving path effects.
- Use `requestAnimationFrame`.
- Avoid layout thrash; node positions stay stable.
- Target 60fps desktop, acceptable 30fps low-end.
- Provide reduced-motion fallback.

## Visual Priority

1. Icon tells role.
2. Status color/shape tells state.
3. Short code disambiguates when needed.
4. Label/detail is secondary and should not make the node wider.

## Accessibility

Icon-only nodes must have accessible names. Focus state must remain visible. Tooltip/detail must not be the only way to understand critical errors.

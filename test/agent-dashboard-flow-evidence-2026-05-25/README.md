# Agent Dashboard Flow Evidence - 2026-05-25

## Scope

Validated the agent dashboard canvas after updating the trace model to show shared task/session context, agent return paths, thin route lines, moving green/blue particles, and step numbers embedded directly inside the source agent/tool node.

## Result

Pass. Desktop recommendation/cart demos keep the original animated canvas style and show the complete route from `Executor -> Task -> Lead -> Phan tich`, through specialist agents/tools/DBs, back through `Task`, and ending at `Lead -> Text` customer response. Dense mobile capture at 390px has `scrollWidth` equal to viewport width, no node clipping, no node overlap, and no missing step numbers.

## Evidence

- [App screenshots](app/README.md)

## Commands

- `corepack pnpm --filter @retail-agent/web test`
- `corepack pnpm --filter @retail-agent/web typecheck`
- `corepack pnpm --filter @retail-agent/api build`
- `node --test apps/api/tests/agent-trace-contract.test.mjs apps/api/tests/pipeline-trace-bridge.test.mjs apps/api/tests/pipeline-executor-contract.test.mjs`

## Notes

Screenshots were captured from the existing Next dev server at `http://127.0.0.1:7000` with Chrome DevTools Protocol full-page capture. The Next dev overlay was hidden during capture so the evidence only shows application UI.

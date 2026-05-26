# Production Framework Decision

- Created: 2026-05-21 13:58
- Updated: 2026-05-22 01:50
- Status: accepted-for-phase-1
- Related plan: `plans/agent-pipeline/platform/production-framework-and-tooling.md`

## Short Decision

Do not use a free auto-loop agent as the production core. RetailHome needs controlled side effects for cart, policy, recommendations and final answers, so orchestration must run through a clear state graph/executor.

Decision for phase 1 implementation:

- Use a custom TypeScript `PipelineExecutor` inside the NestJS API.
- Do not install LangGraph/LangChain for the first production pass.
- Keep LLM behavior as structured JSON generation only; the backend validates, routes and executes deterministic server functions.
- Keep current NestJS services as the implementation layer for agent tools.
- Add schema validation dependency only when the first runtime schema needs it; do not add dependency weight during contract-only phases.
- Revisit LangGraph after specialist agents have stable contracts and when durable checkpoints or long-running graph replay become a real bottleneck.

## Why LangGraph Is Deferred

LangGraph may still be useful later for durable execution, checkpointing and graph debugging. It is deferred because the current bottleneck is not graph durability; it is contract clarity, side-effect safety, context minimization, trace output and specialist-agent boundaries.

The custom executor must keep a graph-compatible shape: plan, steps, dependencies, refs, tool policy, trace events and result envelopes. That leaves a clean migration path if LangGraph is adopted later.

## Why Not Pure LangChain ReAct For Core Cart Flow

LangChain-style free tool loops are useful for exploration, but cart/order actions are important side effects. In production retail, an LLM should not directly decide and run write tools. The Lead Agent produces a plan, the executor validates target/permission/idempotency, then the Cart Agent tool runs.

## Tool Call Standard

Every server tool contract must define:

- `name`
- `version`
- `inputSchema`
- `outputSchema`
- `timeoutMs`
- `idempotent`
- `requiresAuth`
- `sideEffect`
- `redactionPolicy`
- `traceSummary`

Domain agents do not call tools directly. They return structured JSON intent/result envelopes; the backend executor validates and calls server-side functions.

## Dashboard Trace Standard

The runtime trace must be dashboard-friendly:

- provide stable node ids for all agents;
- include node kind for agent, DB, vector DB, service, tool, LLM, text and file;
- include optional `iconKey` and `shortCode`;
- keep payload summaries redacted;
- preserve legacy trace ids until the old dashboard path is retired.

Detailed UI plan: `plans/agent-pipeline/platform/dashboard-trace-visualization.md`.

## Production Rule

If an action affects user data, the pipeline must follow this shape:

```txt
Lead Agent plan
  -> Security check if needed
  -> Resolve target
  -> Executor validates tool input
  -> Tool executes with idempotency key
  -> Tool result verified
  -> Lead Agent may mention result
```

## Phase 1 Runtime Contract Evidence

- Runtime refs and context budget: `apps/api/src/models/pipeline-runtime.models.ts`.
- Metadata handles for heavy payloads: `apps/api/src/models/task-metadata.models.ts`.
- Executor boundary and validation: `apps/api/src/models/pipeline-executor.models.ts`.
- Verification: `corepack pnpm --filter @retail-agent/api test` passed 42/42 on 2026-05-22 01:40.

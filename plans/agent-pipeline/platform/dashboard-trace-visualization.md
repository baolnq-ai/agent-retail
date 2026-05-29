# Plan: Dashboard Trace Visualization

- Created: 2026-05-21 20:10
- Updated: 2026-05-22 10:17
- Status: completed
- Related log: `logs/planning/agent-pipeline/dashboard-trace.md`
- Related doc: `docs/agent-pipeline/platform/dashboard-trace-visualization.md`
- Related tests: `tests/agent-pipeline/platform/dashboard-trace-cases.md`

## Goal

Đảm bảo Agent Dashboard vẫn vẽ đầy đủ, rõ nghĩa và không lỗi khi pipeline mới thêm Lead, Cart, Search, Recommendation, Storage/Memory, History, Sales, RAG, Security và Customer Support Agent.

Dashboard phải nhìn được ngay agent nào đang làm gì bằng icon phổ biến, hạn chế chữ dài. Chữ chỉ dùng dạng viết tắt ngắn cho agent/db/service/tool khi icon chưa đủ rõ.

Dashboard cũng phải phát lại được đường đi thật của một câu hỏi bằng animation trên canvas: user message chạy tới Lead Agent, Lead gọi agent/tool/DB/service nào thì đường sáng chạy tới đó, result chạy ngược về Lead, rồi chạy tới response. Animation phải dựa trên trace thật của request, không phải sơ đồ tĩnh hoặc flow đoán sẵn.

## Scope

- In:
  - chuẩn hóa `TraceNode` và `TraceEdge` cho dashboard;
  - tạo icon registry cho agent, DB, service, tool, LLM, text/file;
  - thêm fallback layout cho agent mới;
  - đảm bảo node mới không làm graph crash hoặc overlap;
  - thêm canvas runtime animation/playback theo `TraceEdge`/event order thật;
  - hiển thị đủ agent, DB, vector DB, service và tool đã dùng trong câu hỏi hiện tại;
  - loop animation nhẹ để người xem hiểu câu hỏi đã đi qua đâu và trả về user thế nào;
  - thêm test UI/dashboard cho trace có Security/Support/RAG/Qdrant/Postgres/tool nodes.
- Out:
  - chưa redesign toàn bộ dashboard;
  - chưa thay đổi backend trace storage nếu chưa code pipeline v2;
  - chưa thêm animation trang trí không liên quan đến trace runtime.

## Skills

- plan-skill
- frontend-skill
- testing-skill
- documentation-skill
- logging-skill

## Dashboard Contract

Trace backend phải trả node/edge đủ dữ liệu để frontend không cần đoán quá nhiều:

```ts
type TraceNodeKind =
  | 'agent'
  | 'db'
  | 'vector_db'
  | 'service'
  | 'tool'
  | 'llm'
  | 'text'
  | 'file';

interface TraceNode {
  id: string;
  label: string;
  kind: TraceNodeKind;
  status: 'pending' | 'running' | 'completed' | 'error' | 'blocked' | 'skipped';
  agentName?: string;
  detail?: string;
  metric?: string;
  order?: number;
  iconKey?: string;
  shortCode?: string;
}

interface TraceEdge {
  from: string;
  to: string;
  direction: 'call' | 'return' | 'data' | 'guard' | 'write';
  label?: string;
  status?: 'pending' | 'running' | 'completed' | 'error' | 'blocked' | 'skipped';
  order?: number;
}

interface TracePlaybackEvent {
  id: string;
  from: string;
  to: string;
  order: number;
  direction: 'call' | 'return' | 'data' | 'guard' | 'write';
  status: 'pending' | 'running' | 'completed' | 'error' | 'blocked' | 'skipped';
  label?: string;
  durationMs?: number;
  payloadRef?: string;
}
```

Rules:

- Dashboard must render if `iconKey` is missing.
- Unknown agent node falls back to `kind=agent`, icon `Bot`, short code from normalized id.
- Unknown DB/service/tool node falls back to its kind icon and short code.
- Long labels must not resize node or overlap. Show full label in tooltip/detail panel.
- Node must have accessible name even when visible UI is icon-only.
- Playback may derive from sorted `TraceEdge.order` if `TracePlaybackEvent` is not present.
- Playback must only animate nodes/edges that exist in the trace for the selected request.

## Canvas Playback Requirements

The Agent Dashboard must include a lightweight canvas animation layer.

Behavior:

- Start from `user-message`.
- Move along ordered trace edges.
- Highlight source node, target node and active edge.
- For calls, animate from caller to callee.
- For returns, animate from callee/tool/DB back to caller.
- For writes, use a distinct but subtle color.
- For guard/security checks, use a distinct guard color.
- After reaching `assistant-response`, pause briefly and loop.
- Allow pause/resume/replay from the dashboard.
- If trace is streaming, append new events without resetting the whole canvas.

Example:

```txt
User asks: "ban lam dc gi?"
trace playback:
user-message
  -> lead-agent
  -> rag-agent
  -> qdrant-db or rag-search-tool
  -> rag-agent
  -> customer-support-agent or sales-agent
  -> assistant-response
```

The exact route must come from backend trace. If the request did not call Cart/Search/Recommendation, those nodes can stay dimmed or hidden, but must not animate as if they ran.

Performance:

- Prefer `canvas` 2D for path particles/edge glow; DOM/SVG nodes can remain static if already implemented, but moving path effects should not cause layout thrash.
- Target 60fps on normal desktop and at least 30fps on low-end machines.
- Use `requestAnimationFrame`.
- Do not animate every node with expensive shadows/filter effects.
- Respect `prefers-reduced-motion`: show static active route or very slow minimal pulse.
- Use stable node coordinates so playback never shifts layout.
- Dense traces should group low-level tool nodes before animation if node count becomes too high.

Visual quality:

- Animation should be smooth and calm, not blinking/jittering.
- Edges should look like signal flow, not flashing warnings.
- Active path should be readable at desktop/tablet/mobile widths.
- Canvas must resize with container without blurry scaling.

## Icon Registry

Use lucide icons when implementation starts. Do not spam decorative icons. Each icon must help recognition.

| Node | Preferred icon | Short code fallback | Notes |
| --- | --- | --- | --- |
| Lead Agent | `Network` or `BrainCircuit` | `LD` | coordinator/planner |
| Cart Agent | `ShoppingCart` | `CART` | cart CRUD/state |
| Search Agent | `Search` | `SRCH` | exact/lexical/semantic search |
| Recommendation Agent | `Sparkles` or `Target` | `REC` | recommendation/rerank |
| Storage/Memory Agent | `Archive` or `Database` | `MEM` | total memory store |
| History Agent | `History` | `HIS` | prior-context resolver |
| Sales Agent | `Handshake` or `BadgeDollarSign` | `SALE` | customer-facing sales answer |
| RAG Agent | `FileSearch` or `BookOpen` | `RAG` | internal knowledge retrieval |
| Security Agent | `ShieldCheck` | `SEC` | moderation/guardrail |
| Customer Support Agent | `Headset` or `LifeBuoy` | `SUP` | support/complaint/handoff |
| PostgreSQL | `Database` | `PG` | relational DB |
| Qdrant/vector DB | `DatabaseZap` or `Database` | `VDB` | vector store |
| Tool | `Wrench` | `TOOL` | backend tool/function |
| Service | `ServerCog` | `SVC` | backend service |
| LLM | `Bot` | `LLM` | model call |
| Text/context | `Text` | `TXT` | text block/context |
| File/document | `FileText` | `DOC` | RAG source/file |

## Layout Rules

- Keep primary agent lane readable left-to-right by execution order.
- Put DB/vector DB/tool/service nodes close to the agent that uses them.
- Security gate can appear as a guard node between risky caller and target, or as a side guard attached to the checked edge.
- Support and Sales must be visually distinct: Support uses headset/lifebuoy, Sales uses handshake/money badge.
- RAG must show document/vector DB relation when retrieval is used.
- Cart must show cart DB/tool relation when mutation/read happens.
- If graph has too many nodes, collapse low-level tool nodes into grouped `tool` or `service` node with count metric.
- Runtime path should be highlighted by playback order, while non-used nodes stay dim or hidden depending on selected view mode.

## Required Agent Node IDs

The dashboard icon/layout registry must support at least:

```txt
lead-agent
cart-agent
search-agent
recommendation-agent
storage-memory-agent
history-agent
sales-agent
rag-agent
security-agent
customer-support-agent
postgres-db
qdrant-db
llm-service
pipeline-executor
```

Legacy ids must still render:

```txt
memory-agent
user-analysis-agent
product-manager-agent
retrieval-agent
cart-manager-agent
sales-agent
knowledge-db
cart-db
```

## Phases

| Phase | Goal | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Define node/edge trace contract v2 | done | `AgentTrace.nodes` supports `vector_db`, `llm`, `iconKey`, `shortCode`; `GraphEdgeDirection` supports `guard/write` |
| 2 | Implement dashboard icon registry and fallback icons | done | `fallbackGraphNodes`, `shortCodeFromId`, `formatUnknownNodeLabel` |
| 3 | Add layout support for all new agents | done | New agent ids + infra node positions added |
| 4 | Add grouped DB/service/tool nodes | done | Dense demo groups overflow runtime nodes into `grouped-runtime-nodes` |
| 5 | Add compatibility for legacy trace ids | done | Legacy ids remain in registry/fallback path |
| 6 | Add automated dashboard tests | done | `corepack pnpm --filter @retail-agent/web test` pass |
| 7 | Add canvas trace playback animation | done | `TracePlaybackCanvas`, pause/replay, reduced-motion path; Web runtime pass |
| 8 | Add real request playback fixtures | done | Live trace stores `playbackEvents`; API fixtures cover search/cart and RAG/support/security infra nodes; Chrome screenshots pass for support/RAG, cart, recommendation, security and dense demo routes |

## Verification

- Dashboard renders old trace and new pipeline trace without runtime error.
- Every new agent appears with recognizable icon and accessible label.
- Unknown agent/service/tool nodes do not crash the graph.
- Text does not overlap node, edge, toolbar or metric panels at desktop/tablet/mobile widths.
- Graph remains usable with Security, Support, RAG, Qdrant, Postgres and multiple tool nodes.
- Canvas playback animates the actual ordered path for the selected trace.
- Animation loops smoothly from user-message to assistant-response.
- Non-used agents do not animate for that request.
- Reduced-motion mode has a static or minimal-motion fallback.
- Dashboard remains responsive during playback; no layout thrash or web lag.
- Playwright/browser screenshot must be checked before closing UI implementation.
- Current browser evidence:
  - `logs/planning/agent-pipeline/dashboard-trace-agent-dashboard-demo.png`
  - `logs/planning/agent-pipeline/dashboard-trace-agent-dashboard-cart.png`
  - `logs/planning/agent-pipeline/dashboard-trace-agent-dashboard-recommendation.png`
  - `logs/planning/agent-pipeline/dashboard-trace-agent-dashboard-support.png`
  - `logs/planning/agent-pipeline/dashboard-trace-agent-dashboard-security.png`
  - `logs/planning/agent-pipeline/dashboard-trace-agent-dashboard-dense.png`

## Close Criteria

- `tests/agent-pipeline/platform/dashboard-trace-cases.md` is converted into automated web/API tests where possible.
- Dashboard renders at least one complete sample trace for:
  - product search/recommendation;
  - cart mutation;
  - RAG policy;
  - security block;
  - customer support complaint.
- Dashboard plays back at least one simple capability/support trace like `user -> lead -> rag -> tool/db -> support/sales -> response`.
- Canvas animation has performance evidence or browser verification notes.
- Existing dashboard behavior does not regress.

# Agent Dashboard Cluster Flow - 2026-05-26

- Created: 2026-05-26 08:23
- Updated: 2026-05-26 08:23
- Plan: `plans/plan-agent-dashboard-cluster-flow-20260526-v1.md`
- Log: `logs/implementation/agent-dashboard-cluster-flow-2026-05-26.md`
- Evidence: `test/agent-dashboard-cluster-flow-evidence-2026-05-26/`
- Status: closed

## Mục Tiêu

Dashboard agent phải mô tả đúng flow thực tế của pipeline: request đi vào executor, mở session context và task workspace, Lead phân tích/giao việc, các agent làm việc qua task context chung, history/context/DB/tool được thể hiện thành cụm riêng, và response cuối quay về Lead trước khi trả ra UI.

## Thay Đổi Chính

- Backend trace thêm `session-context` và các edge qua `task-context`, giúp flow không còn nhảy thẳng từ executor hoặc agent tới response.
- Frontend canvas thêm 7 cụm: Session context, Task workspace, History, Agents, Tools, DB/state và Response.
- Tool node nhiễu được gom vào cụm Tools, còn agent, task, session, history, DB và response vẫn là điểm đọc flow chính.
- Popup detail hiển thị nội dung theo loại node/cụm: context phiên, task workspace, history, DB/state, tool và response.

## Verify

- API build pass.
- API trace contract tests pass.
- Web tests và typecheck pass.
- CDP screenshot desktop/mobile đã được đọc lại: có line mỏng, particle xanh, cluster rõ, không overlap, không clipping, popup detail đọc được.

## Rủi Ro Còn Lại

- Đây là chỉnh trace/dashboard theo contract hiện tại; nếu runtime orchestration đổi semantic sau này thì cần cập nhật lại contract và evidence.
- Evidence screenshot chỉ ghi lại các route mẫu đang có trong test seed, không thay thế benchmark toàn bộ hội thoại production.

## 2026-05-26 Latest Screenshot Correction

- The accepted dashboard shape is the current single canvas shown by the user.
- Do not add a secondary dashboard/table below the canvas.
- Do not draw colored or highlighted background regions behind node groups.
- "Cluster" means spatial proximity only: an agent should sit close to its private history/context and its own tool/infra nodes.
- The canvas must preserve both outbound and return/write-back edges from the real trace. A call that returns through task/session context must not be shown as one-way.
- Use compact, centered, non-distorted node icons and readable step numbers.

## 2026-05-26 Implementation Note After Latest Screenshot

- The dashboard now keeps the current single canvas as the only flow visualization.
- Background cluster regions are not rendered; grouping is done by node proximity.
- The canvas preserves task/session return and write-back edges, so agent/tool calls are not shown as one-way only.
- Node icons use compact centered code badges to avoid distorted oversized glyphs.
- Final screenshot evidence: `test/agent-dashboard-icon-legend-density-evidence-2026-05-26/app/02-dashboard-recommendation-single-canvas-fixed.png`.

## 2026-05-26 Icon And Instance Correction

- Node icons must be actual centered SVG icons, not text abbreviations.
- Legend should stay minimal: line particle colors and node shape/icon meaning only.
- Private resources are visual instances:
  - each agent gets its own `His agent` visual node when it reads private history;
  - each tool call is cloned per owning agent as `tool...__for__<agent>`, even when the runtime implementation is shared.
- Shared resources remain single nodes only when agents truly alternate over the same shared workspace/state, such as `task-context`, `session-context`, DB, or LLM service.
- Final screenshot evidence: `test/agent-dashboard-icon-legend-density-evidence-2026-05-26/app/06-dashboard-svg-icons-final.png`.

## 2026-05-26 Meaningful Icon And Flow Check Update

- Icons must convey the role of the node at a glance:
  - shared session/history is chat/context;
  - private history is history/clock;
  - task is document/checklist;
  - user analysis is chart/analysis;
  - DB is cylinder, LLM is bot/model, tool is wrench, response is chat bubble.
- Visual flow must not show non-Lead agent-to-agent calls as the primary route. When a trace edge implies a next-agent handoff, the dashboard shows Lead routing the next agent, then agent write-back to Task, then Task returning to Lead.
- Tool calls must have a visible return edge to the owning agent when the trace has tool output but no direct visual return edge.
- Final audited screenshot: `test/agent-dashboard-icon-legend-density-evidence-2026-05-26/app/08-dashboard-flow-checked-meaningful-icons.png`.

## 2026-05-26 Legend Trim And Hard Benchmark Update

- Main canvas legend must not list edge colors that are not visually distinct on the current canvas. Keep only:
  - `Gửi đi`;
  - `Trả về`;
  - node icon/shape meanings.
- `Đọc dữ liệu`, `Ghi dữ liệu`, and `Guard` remain trace semantics, but they are not shown as separate main-legend colors unless the canvas renders those colors distinctly again.
- Hard benchmark added at `test/agent-pipeline/retail-chatbot-hard-flow-benchmark-20/`.
- Evidence: `test/retail-chatbot-hard-flow-benchmark-evidence-2026-05-26/`.
- Benchmark result: 20/20 completed, 19 pass, 1 warn, 0 fail, `flowFail=0`.
- Latest dashboard screenshot: `test/retail-chatbot-hard-flow-benchmark-evidence-2026-05-26/app/09-dashboard-legend-trimmed-hard-flow.png`.

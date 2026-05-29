# Agent Dashboard Icon Legend Density Log - 2026-05-26

- Started: 2026-05-26 11:20
- Status: done
- Plan: `plans/running/plan-agent-dashboard-icon-legend-density-20260526-v1.md`
- Related previous doc: `docs/task/agent-dashboard-cluster-flow-20260526-v1.md`

## 2026-05-26 11:20

- Task: tiếp tục chỉnh dashboard agent theo yêu cầu: chú thích hình/icon rõ, node/icon thu gọn, số step dễ đọc hơn và flow vẫn đủ pipeline.
- Đã đọc lại plan/log/doc `agent-dashboard-cluster-flow` để giữ semantic cũ: request đi qua session context, task workspace, Lead điều phối, agent đọc/ghi task context, tool/DB hỗ trợ, response quay về Lead.
- Quyết định: không đổi runtime orchestration; chỉ nối lại các thành phần canvas đã có sẵn và chỉnh CSS density.

## 2026-05-26 screenshot correction

- User sent a new screenshot and clarified that the dashboard must stay on the current single canvas.
- Removed the extra flow/table dashboard below the canvas.
- Updated the working rule before further fixes: no painted background regions; group by proximity only.
- Updated the flow rule: do not drop task/session return or write-back lines when simplifying canvas edges, because that makes calls look one-way and misrepresents the chatbot pipeline.
- Updated the visual rule: icons must be compact, centered, and non-distorted; step badges should be slightly larger.

## 2026-05-26 implementation/verification

- Kept only the original single canvas; removed the extra flow board rendering below it.
- Canvas now uses the visible trace edges directly instead of the old simplified edge set, so task/session return and write-back paths remain on the canvas.
- Added compact text-coded node icons as an intermediate fix; this was superseded by the later SVG-icon correction below.
- Reworked proximity layout so agent/tool/infra nodes sit closer together without drawing any highlighted region behind them.
- Updated legend to use the same compact code badges instead of oversized distorted glyph CSS.
- Captured frontend screenshot evidence with Chrome CDP:
  - `tests/agent-dashboard-icon-legend-density-evidence-2026-05-26/app/02-dashboard-recommendation-single-canvas-fixed.png`
  - DOM audit: 16 nodes, 37 edges, 0 cluster regions, 0 extra trace boards, 0 overlap pairs, max icon 36px, step font 10.5px.
- Verification passed:
  - `corepack pnpm --filter @retail-agent/web test`
  - `corepack pnpm --filter @retail-agent/web typecheck`
  - `node --test apps/api/tests/agent-trace-contract.test.mjs apps/api/tests/pipeline-trace-bridge.test.mjs`

## 2026-05-26 icon/instance correction

- User rejected text-code icons and clarified the legend should only explain line particle colors plus node shapes.
- Replaced text abbreviations inside node icons with stable inline SVG icons; final audit has 20 SVG node icons and no abbreviation text inside legend icons.
- Slowed line animation 2x: `.agent-node-edge` is now `9.2s linear`, and playback dots now loop at `3800ms` instead of `1900ms`.
- Added visual instance expansion for private resources:
  - `history-agent__for__<agent>` per actual agent that uses private history.
  - `tool-...__for__<agent>` per agent tool call, so shared tool implementations are displayed as separate call instances in that agent's cluster.
  - Shared nodes remain shared: `session-context`, `task-context`, DB/LLM state nodes.
- Added edge data attributes (`data-from`, `data-to`, `data-direction`) for future flow audits.
- Enlarged hover/popup copy for readability.
- Final evidence:
  - `tests/agent-dashboard-icon-legend-density-evidence-2026-05-26/app/06-dashboard-svg-icons-final.png`
  - Final audit: 20 nodes, 45 edges, 20 SVG icons, 0 cluster regions, 0 extra trace boards, 0 overlap pairs, max icon 36px, max SVG 21px.
- Verification passed again after the correction:
  - `corepack pnpm --filter @retail-agent/web test`
  - `corepack pnpm --filter @retail-agent/web typecheck`
  - `node --test apps/api/tests/agent-trace-contract.test.mjs apps/api/tests/pipeline-trace-bridge.test.mjs`

## 2026-05-26 meaningful-icon and flow check correction

- User clarified icons must communicate node meaning, not just be decorative.
- Updated SVG icon meanings:
  - session/his chung uses chat/context icon;
  - his agent uses history/clock icon;
  - task uses document/checklist icon;
  - user analysis uses chart/analysis icon;
  - DB remains cylinder, LLM uses bot/model icon, Lead uses crown, tools use wrench, response uses chat bubble.
- Increased step badge font to `11.5px`.
- Changed particle/line animation from `9.2s` to `6.13s`, making it 1.5x faster than the previous pass.
- Spaced clusters farther apart: shared context left, Lead center, analysis lower-left, search/tool top-mid, recommendation/tool lower-mid, sales/response right.
- Normalized visual flow to avoid misleading one-way agent-to-agent calls:
  - non-Lead agent-to-agent call edges are displayed as Lead routing the next agent;
  - tool calls get a visible tool return edge when the trace lacks that visual edge;
  - Lead-to-agent calls get visible agent write-back to task and task return to Lead when needed.
- Final CDP evidence:
  - `tests/agent-dashboard-icon-legend-density-evidence-2026-05-26/app/08-dashboard-flow-checked-meaningful-icons.png`
  - Audit: 20 nodes, 48 edges, 20 SVG icons, 0 overlap, 0 unresolved call paths, 0 cluster regions, 0 extra trace boards, animation `6.13s`, step font `11.5px`.

## 2026-05-26 trimmed legend and hard-flow benchmark

- User clarified the legend was still redundant because the current canvas only communicates line colors as `Gửi đi` and `Trả về`; other edge semantics are handled in popup/detail rather than main legend colors.
- Updated `GraphLegend` to remove visible `Đọc dữ liệu`, `Ghi dữ liệu`, and `Guard` entries. The legend now shows:
  - line colors: `Gửi đi`, `Trả về`;
  - node icon/shape meanings: Flow, Agent, Lead, DB, Tool, LLM, Task, His chung, His agent, Phản hồi.
- Added source-level frontend tests to prevent the removed legend entries from returning.
- Added hard benchmark:
  - `tests/agent-pipeline/retail-chatbot-hard-flow-benchmark-20/README.md`
  - `tests/agent-pipeline/retail-chatbot-hard-flow-benchmark-20/runtime-chatbot-hard-flow-benchmark-20.mjs`
  - evidence root `tests/retail-chatbot-hard-flow-benchmark-evidence-2026-05-26/`
- Benchmark result after correcting evaluator semantics for `history-agent` as support history read via `storage-memory-agent`:
  - 20/20 completed, 19 pass, 1 warn, 0 fail;
  - `flowFail=0`;
  - avg/p50/p95 latency: 2701/2608/4703 ms.
- Dashboard CDP audit after legend trim:
  - screenshot `tests/retail-chatbot-hard-flow-benchmark-evidence-2026-05-26/app/09-dashboard-legend-trimmed-hard-flow.png`;
  - audit `tests/retail-chatbot-hard-flow-benchmark-evidence-2026-05-26/app/audit-legend-trimmed-hard-flow.json`;
  - 20 nodes, 48 edges, 0 overlap, 0 unresolved call paths, legend has call/return/Flow and no data/write/guard entries.
- Verification passed:
  - `corepack pnpm --filter @retail-agent/web typecheck`
  - `corepack pnpm --filter @retail-agent/web test`
  - `corepack pnpm --filter @retail-agent/api build`
  - `node --test apps/api/tests/agent-trace-contract.test.mjs apps/api/tests/pipeline-trace-bridge.test.mjs`
  - `node tests/agent-pipeline/retail-chatbot-hard-flow-benchmark-20/runtime-chatbot-hard-flow-benchmark-20.mjs`

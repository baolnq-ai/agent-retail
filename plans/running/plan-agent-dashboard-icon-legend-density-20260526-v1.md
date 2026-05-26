# Plan: agent-dashboard-icon-legend-density

- Created: 2026-05-26 11:20
- Updated: 2026-05-26 11:20
- Status: done
- Related log: logs/implementation/agent-dashboard-icon-legend-density-20260526-v1.md
- Related doc: docs/task/agent-dashboard-cluster-flow-20260526-v1.md

## Goal

Chỉnh dashboard agent để canvas có chú thích rõ từng hình/icon, node và icon gọn hơn, số step dễ đọc hơn, nhưng vẫn thể hiện đủ flow pipeline theo contract cluster flow đã đóng.

## Scope

- In: legend/chú thích icon và line, cluster/timeline hiện trên canvas, kích thước node/icon/step badge.
- In: giữ flow Session context -> Task workspace -> Lead -> agents/tools/DB -> Lead -> assistant response.
- Out: không đổi runtime orchestration, không đổi API trace semantic, không làm lại dashboard style từ đầu.

## Skills

- frontend-skill
- plan-skill
- logging-skill
- testing-skill

## Phases

| Phase | Goal | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Đọc plan/log/dashboard cũ | done | `plans/plan-agent-dashboard-cluster-flow-20260526-v1.md`, log cluster flow |
| 2 | Sửa UI canvas theo đúng contract | in_progress | pending |
| 3 | Verify frontend/backend contract liên quan | pending | pending |
| 4 | Cập nhật log và đóng plan | pending | pending |

## Verification

- `corepack pnpm --filter @retail-agent/web test`
- `corepack pnpm --filter @retail-agent/web typecheck`
- `node --test apps/api/tests/agent-trace-contract.test.mjs apps/api/tests/pipeline-trace-bridge.test.mjs`

## Close Criteria

- Legend nói rõ line gửi đi/trả về/đọc-ghi/guard và các icon chính.
- Node/icon nhỏ, thoáng, không che flow; số step lớn hơn và dễ đọc.
- Canvas vẫn hiện đủ cluster/route/timeline theo trace hiện tại.
- Test/typecheck pass hoặc blocker được ghi rõ.

## 2026-05-26 update from latest screenshot/user review

- Source of truth: the current single agent dashboard canvas in the user's screenshot, not an older dashboard/timeline mock.
- Do not render colored/highlighted background regions behind nodes.
- Do not add a second flow dashboard below the canvas.
- Canvas must represent the real chatbot pipeline after a chat message enters the pipeline: executor/session history -> task -> lead -> agents -> each agent's own history/tool/DB/LLM -> task/lead -> assistant response.
- If a call/tool/data path has a trace return/write-back edge, the canvas must keep that return/write-back edge visible instead of showing only the outbound line.
- Grouping is by node proximity only: each agent, its private history/context, and its own tool/infra nodes should sit near each other without a painted cluster area.
- Icons must be compact, centered, and not distorted; step numbers should be slightly larger and readable.

## Final result - 2026-05-26

- Canvas implementation updated in `apps/web/src/app/agent-dashboard/agent-dashboard-client.tsx`.
- Visual density/icon sizing updated in `apps/web/src/app/styles.css`.
- Screenshot/audit evidence saved in `test/agent-dashboard-icon-legend-density-evidence-2026-05-26/`.
- Final CDP audit: 16 nodes, 37 edges, 0 cluster background regions, 0 extra trace boards, 0 overlap pairs, max icon 36px, step font 10.5px.
- Verification passed: web test, web typecheck, API trace contract tests.

## Final correction - 2026-05-26

- Replaced text-code badges with real SVG icons.
- Split private history and tool calls into per-agent visual instances.
- Kept shared context/state as single nodes only for `session-context`, `task-context`, DB/LLM style shared resources.
- Slowed line animation 2x.
- Final CDP audit: 20 nodes, 45 edges, 20 SVG icons, 0 cluster background regions, 0 extra trace boards, 0 overlap pairs, max icon 36px, max SVG 21px.
- Final screenshot: `test/agent-dashboard-icon-legend-density-evidence-2026-05-26/app/06-dashboard-svg-icons-final.png`.

## Final meaningful-icon/flow audit - 2026-05-26

- Icons now map to node meaning instead of decorative symbols.
- Step badge font increased to `11.5px`.
- Particle/line animation set to `6.13s`, 1.5x faster than the previous `9.2s` pass.
- Visual flow normalization removes misleading non-Lead agent-to-agent call routing and adds missing visual return/write-back paths.
- Final CDP audit: 20 nodes, 48 edges, 20 SVG icons, 0 overlap pairs, 0 unresolved call paths, 0 cluster background regions, 0 extra trace boards.
- Final screenshot: `test/agent-dashboard-icon-legend-density-evidence-2026-05-26/app/08-dashboard-flow-checked-meaningful-icons.png`.

## Legend trim and hard benchmark - 2026-05-26

- Main legend trimmed to only `Gửi đi`, `Trả về`, and node icon/shape meanings.
- Added 20 hard chatbot benchmark cases with trace-flow invariants.
- Benchmark evidence: `test/retail-chatbot-hard-flow-benchmark-evidence-2026-05-26/`.
- Benchmark result: 20/20 completed, 19 pass, 1 warn, 0 fail, `flowFail=0`, avg/p95 latency 2701/4703 ms.
- Latest screenshot/audit:
  - `test/retail-chatbot-hard-flow-benchmark-evidence-2026-05-26/app/09-dashboard-legend-trimmed-hard-flow.png`
  - `test/retail-chatbot-hard-flow-benchmark-evidence-2026-05-26/app/audit-legend-trimmed-hard-flow.json`

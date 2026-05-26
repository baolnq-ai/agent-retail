# Plan: agent-dashboard-cluster-flow

- Created: 2026-05-26 07:47
- Updated: 2026-05-26 08:23
- Status: closed
- Related log: logs/implementation/agent-dashboard-cluster-flow-2026-05-26.md
- Related doc: docs/task/agent-dashboard-cluster-flow-20260526-v1.md

## Goal

Làm dashboard agent phản ánh đúng pipeline dùng chung history/task/session context: request vào executor, mở session context và task workspace, Lead giao việc, agent đọc/ghi task context, tool/DB hỗ trợ agent, rồi phản hồi cuối quay về Lead trước khi trả cho user.

## Scope

- In: layout canvas dashboard, nhóm trace graph, popup detail cho `Task`, `Session context`, `History`, database/state, tool và response cuối.
- In: contract test ngăn các đường bypass như `sales-agent -> assistant-response`.
- In: ảnh chứng minh desktop/mobile có animation, line mỏng, hạt di chuyển, không overlap, không clipping và popup detail đọc được.
- Out: đổi semantic runtime execution engine ngoài phần trace/dashboard, trừ khi contract phát hiện mismatch.
- Out: thay giao diện cũ hoặc bỏ route animation đang có.

## Skills

- plan-skill
- logging-skill
- frontend-skill
- testing-skill

## Phases

| Phase | Goal | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Tạo plan/log và close criteria | done | Plan/log files |
| 2 | Audit node/edge/detail theo pipeline mong muốn | done | Log updated |
| 3 | Implement clustered canvas và click details | done | Frontend/backend diff and tests |
| 4 | Verify contract backend/frontend | done | API/web test output |
| 5 | Chụp và đọc lại evidence UI | done | `test/agent-dashboard-cluster-flow-evidence-2026-05-26/` |
| 6 | Đóng doc/log/plan theo format skill mới | done | Updated plan/log/doc/evidence README |

## Verification

- `corepack pnpm --filter @retail-agent/api build`
- `node --test apps/api/tests/agent-trace-contract.test.mjs apps/api/tests/pipeline-trace-bridge.test.mjs apps/api/tests/pipeline-executor-contract.test.mjs`
- `corepack pnpm --filter @retail-agent/web test`
- `corepack pnpm --filter @retail-agent/web typecheck`
- Chrome DevTools Protocol screenshots trên desktop và mobile, kèm DOM assertions: không horizontal overflow, không node overlap, không clipping, route lines còn hiển thị, particle canvas còn chạy, popup detail có nội dung cho Task/Session/History.

## Close Criteria

- Canvas có cluster rõ cho Agents, Task workspace, Session context, History, DB/state và Tools nhưng vẫn giữ style canvas/animation cũ.
- Flow thể hiện đúng request/response: Lead giao việc, agent đọc/ghi task/session context, tool/DB hỗ trợ agent, response cuối trả qua Lead.
- Click Task, Session context, History, DB, Tool và Response hiện thông tin hữu ích của phiên.
- Test và screenshot pass, evidence đọc được, log/doc/plan có link chéo.

## Completion Summary

- Thêm `session-context` thành node trace riêng trước `task-context`.
- Thêm cluster canvas cho Session context, Task workspace, History, Agents, Tools, DB/state và Response.
- Thêm detail popup cho Session context, Task workspace, History, DB, Tool và Response.
- Verify bằng test và CDP screenshot; không node overlap, không clipping, không mất số step, route line và particle canvas còn hiển thị.

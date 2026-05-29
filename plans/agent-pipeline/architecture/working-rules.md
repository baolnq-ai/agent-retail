# Plan: Agent Pipeline Working Rules

- Created: 2026-05-21 13:46
- Updated: 2026-05-21 13:46
- Status: planned
- Related log: `logs/planning/agent-pipeline/rebuild.md`
- Related doc: `docs/agent-pipeline/architecture/system-definition.md`
- Related tests: `tests/agent-pipeline/README.md`

## Goal

Đặt quy định bắt buộc cho toàn bộ quá trình code lại chatbot pipeline: mỗi plan phải có log, doc, test case, evidence rõ ràng và không được triển khai mơ hồ.

## Scope

- In: cấu trúc plan, log, doc, test case, evidence, close criteria.
- Out: chưa implement code pipeline.

## Skills

- plan-skill
- documentation-skill
- logging-skill
- testing-skill
- backend-skill khi bắt đầu code backend
- security-skill khi làm agent bảo mật hoặc xử lý auth/data nhạy cảm

## Rules

### 1. Plan

- Tất cả plan pipeline nằm trong `plans/agent-pipeline/`.
- Plan tổng/shared nằm trong `plans/agent-pipeline/architecture/`.
- Plan platform/tooling nằm trong `plans/agent-pipeline/platform/`.
- Plan từng agent nằm trong `plans/agent-pipeline/agents/{agent-name}/`.
- Mỗi plan phải có: Goal, Scope, Skills, Phases, Verification, Close criteria.
- Mỗi phase có status: `pending`, `in_progress`, `testing`, `done`, `blocked`, `skipped`.
- Khi bắt đầu code một phase, cập nhật phase sang `in_progress`.
- Khi chạy test, cập nhật phase sang `testing`.
- Khi pass, cập nhật phase sang `done` và ghi evidence.

### 2. Logs

- Log tổng: `logs/planning/agent-pipeline/rebuild.md`.
- Mỗi plan lớn có log riêng trong `logs/planning/`.
- Log phải ghi ngắn gọn: thời gian, mục tiêu, việc đã làm, test đã chạy, blocker, quyết định quan trọng.
- Không ghi secret, token, cookie, nội dung `.env`, dữ liệu nhạy cảm.

### 3. Docs

- Doc kiến trúc sống lâu dài nằm trong `docs/agent-pipeline/`, chia theo `architecture/`, `platform/`, `agents/{agent-name}/`.
- Plan chỉ nói cách làm; doc nói hệ thống hoạt động như thế nào.
- Khi đổi contract agent, orchestration, security rule hoặc response block, phải cập nhật doc tương ứng.

### 4. Tests

- Test case thiết kế nằm trong `tests/agent-pipeline/`, chia theo `platform/` và `agents/{agent-name}/`.
- Test tự động backend đặt trong `apps/api/tests/` khi bắt đầu implement.
- Test tự động frontend đặt trong `apps/web/tests/` nếu có UI/stream/trace thay đổi.
- Không đóng plan nếu chưa có test pass hoặc lý do rõ vì sao chưa chạy được.

### 5. Evidence

Evidence hợp lệ gồm:

- file code/doc/log đã cập nhật;
- test command và kết quả chính;
- contract/schema mới;
- ảnh hoặc kiểm tra UI nếu có frontend;
- trace/pipeline sample nếu có backend orchestration.

## Phases

| Phase | Goal | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Tạo folder và quy định plan/doc/log/test | done | `plans/agent-pipeline/`, `docs/agent-pipeline/`, `logs/planning/agent-pipeline/`, `tests/agent-pipeline/` |
| 2 | Áp dụng quy định cho plan tổng và Lead Agent | done | `architecture/master-pipeline-rebuild.md`, `agents/lead-agent/plan.md` |
| 3 | Dùng quy định này cho các plan agent tiếp theo | pending | Sẽ cập nhật khi tạo plan từng agent |

## Verification

- Kiểm tra mỗi plan có đủ related log/doc/tests.
- Kiểm tra log tổng đã ghi task tạo plan.
- Kiểm tra test folder có test case khởi đầu.

## Close criteria

- Folder plan pipeline đã có index.
- Quy định doc/log/plan/test rõ ràng.
- Plan tổng và plan Lead Agent tuân thủ cùng một format.

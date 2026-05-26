# Plan: skill-format-audit

- Created: 2026-05-26 08:21
- Updated: 2026-05-26 08:29
- Status: closed
- Related log: logs/documentation/skill-format-audit-20260526-v1.md
- Related doc: docs/task/skill-format-audit-20260526-v1.md

## Goal

Kiểm tra và chỉnh lại format tài liệu, plan, log và evidence/test gần nhất theo bộ skill mới trong `.codex/skills/`.

## Scope

- In: cấu trúc `docs/`, `plans/`, `logs/`, evidence dashboard mới nhất và các file README cần thiết.
- In: link chéo giữa plan, log, doc và evidence của task agent dashboard cluster flow.
- In: ghi lại kết quả audit skill format bằng plan/log/doc riêng.
- Out: chuẩn hóa toàn bộ archive cũ hoặc rewrite mọi plan/log lịch sử chưa liên quan trực tiếp tới task hiện tại.
- Out: thay đổi runtime code dashboard nếu audit format không phát hiện lỗi code mới.

## Skills

- documentation-skill
- plan-skill
- logging-skill
- testing-skill

## Phases

| Phase | Goal | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Đọc skill mới và audit cấu trúc hiện tại | done | `.codex/skills/*/SKILL.md`, `rg --files` |
| 2 | Tạo plan/log/doc cho lần audit | done | File plan/log/doc audit |
| 3 | Chỉnh artifact dashboard theo format mới | done | Plan/log/doc/evidence dashboard |
| 4 | Kiểm tra link chéo, README và evidence/test | done | Command verification |
| 5 | Đóng plan/log/doc audit | done | Status `closed` |

## Verification

- Kiểm tra file tồn tại cho `docs/task`, `plans/running`, `logs/documentation`.
- Kiểm tra plan quan trọng có đủ `Related log` và `Related doc`.
- Kiểm tra evidence dashboard có README root và README app.
- Chạy lại test liên quan khi thay đổi còn chạm tới contract/dashboard code trong worktree.

## Close Criteria

- Artifact mới tuân theo format skill: có README thư mục, doc riêng, log riêng, plan có link chéo.
- Plan dashboard cluster flow có tên kèm ngày/version và có `Related doc`.
- Evidence README đọc được, mô tả ảnh chứng minh rõ ràng, không chỉ liệt kê ảnh.
- Verification pass hoặc ghi rõ blocker.

## Completion Summary

- Thêm README cho `plans/running`, `docs/task` và `logs/documentation`.
- Chuẩn hóa root README của `docs`, `plans`, `logs` sang nội dung tiếng Việt và bổ sung category mới.
- Đổi plan dashboard cluster flow sang tên có ngày/version, thêm `Related doc`, tạo doc task riêng và cập nhật log/evidence.
- Chỉnh `.gitignore` để markdown log trong `logs/**/*.md` có thể được track, nhưng runtime/generated logs vẫn bị ignore.
- Verification pass: README/link checks, plan link checks, web test, web typecheck, API build và API trace contract tests.

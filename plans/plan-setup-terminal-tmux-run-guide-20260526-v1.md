# Plan: setup-terminal-tmux-run-guide

- Created: 2026-05-26 08:35
- Updated: 2026-05-26 08:43
- Status: closed
- Related log: logs/implementation/setup-terminal-tmux-run-guide-20260526-v1.md
- Related doc: docs/task/setup-terminal-tmux-run-guide-20260526-v1.md

## Goal

Cập nhật setup/run workflow để người dùng biết service đang chạy ở terminal/tmux nào, port nào mở, log ở đâu và cách theo dõi/stop rõ ràng.

## Scope

- In: `setup.sh`, `setup.ps1`, `stop.sh`, `stop.ps1`, README và operations docs.
- In: final output sau setup phải ghi port, mode chạy, tmux/session/window hoặc PID, log path và command theo dõi log.
- In: verify script syntax/command references.
- Out: đổi port mặc định, đổi Docker Compose service hoặc đổi runtime behavior của app.

## Skills

- documentation-skill
- plan-skill
- logging-skill
- testing-skill

## Phases

| Phase | Goal | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Audit setup/docs hiện tại | done | README, operations, setup scripts |
| 2 | Tạo plan/log/doc task | done | Plan/log/doc files |
| 3 | Cập nhật setup/stop scripts | done | Script diff |
| 4 | Cập nhật README/operations docs | done | Docs diff |
| 5 | Verify syntax và command references | done | Command output |
| 6 | Đóng log/doc/plan | done | Status `closed` |

## Verification

- `bash -n setup.sh stop.sh`
- PowerShell parse check cho `setup.ps1` và `stop.ps1`.
- `rg` kiểm tra README/docs có command tmux/window/log/port.

## Close Criteria

- Bash setup có tmux mode khi có `tmux`, fallback background rõ ràng.
- PowerShell setup mở terminal window theo dõi live output, vẫn có hidden mode khi cần.
- Stop scripts biết cleanup tmux/session/window hoặc repo-scoped runtime process.
- README và operations docs hướng dẫn chạy, xem log, attach tmux/window và stop.

## Completion Summary

- `setup.sh` hỗ trợ `SETUP_TERMINAL_MODE=auto|tmux|background`, ưu tiên tmux session `retail-agent` khi có `tmux`.
- `setup.ps1` hỗ trợ `SETUP_TERMINAL_MODE=window|hidden`, mặc định mở hai PowerShell window visible cho API và Web.
- `stop.sh` cleanup thêm tmux session; `stop.ps1` in rõ repo-scoped runtime process/window cleanup.
- README và operations docs có hướng dẫn port, dashboard URL, tmux/window, log path, attach/follow log và stop.
- Verification pass: Git Bash syntax check cho `setup.sh`/`stop.sh`, PowerShell parse check cho `setup.ps1`/`stop.ps1`, và `rg` kiểm tra docs/script references.
- Không chạy full setup trong verification vì command này sẽ bật Docker/API/Web thật; thay vào đó đã kiểm tra syntax và consistency của command.

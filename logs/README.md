# Project logs

- Updated: 2026-05-18
- Scope: log organization for this project.

## Log categories

| Path | Purpose | Edit policy |
| --- | --- | --- |
| `logs/implementation/*.md` | Human-written task summaries with timestamps | Keep concise and update intentionally |
| `logs/setup/*.log` | Generated `setup.sh` / `stop.sh` command logs | Runtime artifact; do not rewrite by hand |
| `logs/runtime/backend/*.log` | Generated API process logs | Runtime artifact; ignored by git |
| `logs/runtime/frontend/*.log` | Generated web process logs | Runtime artifact; ignored by git |

## Rules

- Keep human-written logs short and focused on decisions, changes, and verification.
- Do not paste full command output unless the failure itself is the important result.
- Do not log passwords, cookies, raw session tokens, private API keys, or `.env` contents.
- Use a clear date in each markdown log.

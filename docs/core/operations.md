# Operations

- Updated: 2026-05-29
- Scope: local runtime, environment, setup/stop, terminal/tmux workflow, ports, and logs.

## Default local endpoints

| Service | URL |
| --- | --- |
| Web | `http://127.0.0.1:3100` |
| API | `http://127.0.0.1:3110` |
| nginx/tunnel | `http://127.0.0.1:3120` |
| API health | `http://127.0.0.1:3110/health` |
| PostgreSQL | `127.0.0.1:3132` |
| Redis | `127.0.0.1:3139` |

## Environment

Use `.env.example` as the template and keep `.env` local.

Important variables:

```txt
API_PORT=3110
WEB_PORT=3100
NGINX_PORT=3120
POSTGRES_PORT=3132
REDIS_PORT=3139
QDRANT_PORT=3133
QDRANT_GRPC_PORT=3134
DATABASE_URL=postgresql://retail:retail_password@localhost:3132/retail_agent?schema=public
REDIS_URL=redis://localhost:3139
QDRANT_URL=http://localhost:3133
TMUX_SESSION=egnt-retail
CHAT_MODEL_BASE_URL=http://<openai-compatible-host>
CHAT_MODEL_ID=<model-id>
EMBED_RERANK_BASE_URL=http://<embedding-rerank-host>
```

Do not commit `.env`, cookies, passwords, session tokens, or raw API keys.

## Setup

Run from project root:

```bash
./setup.sh
```

Windows PowerShell:

```powershell
.\setup.ps1
```

The setup script:

1. loads `.env` or creates it from `.env.example`;
2. prepares/rotates runtime logs;
3. checks Node, Corepack, pnpm, and Python venv support;
4. installs pnpm dependencies;
5. starts PostgreSQL/Redis with Docker unless `SKIP_DOCKER=1`;
6. runs Prisma generate/push/seed;
7. optionally runs tests with `RUN_TESTS=1`;
8. starts API and web processes.

## Runtime terminal mode

### Linux/macOS/Git Bash

`setup.sh` uses `SETUP_TERMINAL_MODE=auto` by default.

- If `tmux` exists, setup opens session `egnt-retail` with windows:
  - `api`: `@retail-agent/api`
  - `web`: `apps/web`
- Attach live service output:

```bash
tmux attach -t egnt-retail
```

- Force tmux:

```bash
SETUP_TERMINAL_MODE=tmux ./setup.sh
```

- Force background mode:

```bash
SETUP_TERMINAL_MODE=background ./setup.sh
tail -f logs/runtime/backend/api-3110.log logs/runtime/frontend/web-3100.log
```

`SETUP_TERMINAL_MODE=hidden` is accepted by `setup.sh` as a compatibility alias and is normalized to `background`. This keeps a shared `.env` usable across PowerShell and Bash.

### Windows PowerShell

`setup.ps1` uses `SETUP_TERMINAL_MODE=window` by default and opens two visible PowerShell windows:

- `Retail API - @retail-agent/api`
- `Retail Web - apps/web`

Hidden mode is available for CI-like local runs:

```powershell
$env:SETUP_TERMINAL_MODE='hidden'
.\setup.ps1
```

Follow logs manually:

```powershell
Get-Content -Path .\logs\runtime\backend\api-3110.log -Wait
Get-Content -Path .\logs\runtime\frontend\web-3100.log -Wait
```

At the end, setup prints the opened ports, dashboard URL, health URL, log files, terminal/tmux details, and stop command.

## Stop

```bash
./stop.sh
```

The stop script stops PID-file processes, clears configured ports, and removes stale Next.js dev locks.

Windows:

```powershell
.\stop.ps1
```

Stop scripts are project-scoped. Bash stops the `egnt-retail` tmux session and old `retail-agent` session when present, clears project ports in the `3100-3150` range, and stops repo-scoped runtime processes. PowerShell stops repo-scoped PowerShell/Corepack/Next runtime processes and clears the same project ports.

## Logs

- Human task logs: `logs/implementation/*.md`.
- Documentation/task logs: `logs/documentation/*.md`.
- Setup/stop generated logs: `logs/setup/*.log`.
- Runtime generated logs: `logs/runtime/backend/*.log`, `logs/runtime/frontend/*.log`.

Generated `.log` files are runtime artifacts and should not be copied into docs. Keep human-written markdown logs concise.

## Runtime model settings

The web dashboard page `/agent-settings` can update runtime model settings without editing files:

- chat base URL;
- chat model id;
- optional API key, not returned raw after save;
- embedding/rerank base URL;
- ping test for model and embedding/rerank health.

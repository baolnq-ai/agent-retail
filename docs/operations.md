# Operations

- Updated: 2026-05-18
- Scope: local runtime, environment, setup/stop, and logs.

## Default local endpoints

| Service | URL |
| --- | --- |
| Web | `http://127.0.0.1:7000` |
| API | `http://127.0.0.1:7010` |
| API health | `http://127.0.0.1:7010/health` |
| PostgreSQL | `127.0.0.1:55432` |
| Redis | `127.0.0.1:56379` |

## Environment

Use `.env.example` as the template and keep `.env` local.

Important variables:

```txt
API_PORT=7010
WEB_PORT=7000
DATABASE_URL=postgresql://retail:retail_password@localhost:55432/retail_agent?schema=public
REDIS_URL=redis://localhost:56379
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

The setup script:

1. loads `.env` or creates it from `.env.example`;
2. prepares/rotates runtime logs;
3. checks Node, Corepack, pnpm, and Python venv support;
4. installs pnpm dependencies;
5. starts PostgreSQL/Redis with Docker unless `SKIP_DOCKER=1`;
6. runs Prisma generate/push/seed;
7. optionally runs tests with `RUN_TESTS=1`;
8. starts API and web processes.

## Stop

```bash
./stop.sh
```

The stop script stops PID-file processes, clears configured ports, and removes stale Next.js dev locks.

## Logs

- Human task logs: `logs/implementation/*.md`.
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

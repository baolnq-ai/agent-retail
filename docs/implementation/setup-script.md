# Setup script

Time: 2026-05-18

## Purpose

`setup.sh` prepares the local retail AI project and starts backend/frontend with managed logs.

## What it does

- Loads `.env`, or creates it from `.env.example` when missing.
- Creates/clears runtime logs under:
  - `logs/runtime/backend/api-7010.log`
  - `logs/runtime/frontend/web-7000.log`
- Rotates old/large logs using `LOG_RETENTION_DAYS` and `LOG_MAX_SIZE_MB`.
- Checks Node.js 20+, Corepack, pnpm, Python, and optional `.venv` support.
- Installs workspace dependencies.
- Starts Docker PostgreSQL/Redis when Docker is available.
- Runs Prisma generate, db push, and seed.
- Starts API on `7010` and web on `7000` by default.

## Usage

Start the project:

```bash
bash setup.sh
```

Stop the project:

```bash
bash stop.sh
```

Optional flags via environment:

```bash
RUN_TESTS=1 bash setup.sh
SKIP_DOCKER=1 bash setup.sh
API_PORT=7010 WEB_PORT=7000 bash setup.sh
LOG_RETENTION_DAYS=7 LOG_MAX_SIZE_MB=20 bash setup.sh
```

## Notes

The scripts do not log passwords, cookies, or raw session tokens. They only write setup/stop/runtime command output and process logs to the project `logs/` folder.

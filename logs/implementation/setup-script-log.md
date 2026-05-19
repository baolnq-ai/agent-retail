# Setup script implementation log

Time: 2026-05-18

## Work completed

- Added root `setup.sh` for local project setup and startup.
- Added professional terminal status output with banner, steps, success, warning, and failure states.
- Added setup/runtime log directories under `logs/`.
- Added log clear-on-run for backend/frontend runtime logs.
- Added cleanup for old and oversized logs using retention and max-size settings.
- Added checks for Node.js, Corepack, pnpm, Python, optional `.venv`, Docker, PostgreSQL, Prisma, API, and web startup.
- Added environment controls: `RUN_TESTS`, `SKIP_DOCKER`, `API_PORT`, `WEB_PORT`, `LOG_RETENTION_DAYS`, `LOG_MAX_SIZE_MB`.
- Added root `stop.sh` to stop backend/frontend using setup PID files and port fallback.
- Added `docs/implementation/setup-script.md` usage notes.

## Validation

- Fixed Windows/Git Bash PowerShell port cleanup escaping after a real `./setup.sh` run hit `portNumber: unbound variable`.
- Fixed runtime log filenames to be derived after `.env` is loaded, so displayed API/web ports match log filenames.
- Updated `.env.example` and local `.env` defaults to API `7010` and web `7000`.
- Added cleanup for legacy ports `3000`/`3001` and stale Next dev server locks/processes under `apps/web`.
- `bash -n setup.sh`: passed.
- `bash -n stop.sh`: passed.
- A partial real run verified `.env` creation/loading, log directory creation/clearing, Node/Corepack/pnpm detection, Python graceful handling, and dependency install.
- Docker startup is handled gracefully: if Docker compose fails, the script continues to check whether database ports are already available and fails clearly if PostgreSQL is unreachable.
- Switched API startup in `setup.sh` to compiled build/start mode before launch, fixing runtime controller DI failures seen under dev `tsx` startup.
- `bash -n setup.sh`: passed after compiled-start update.
- `bash -n stop.sh`: passed after compiled-start update.
- `bash stop.sh && bash setup.sh`: passed; backend started on `7010`, frontend started on `7000`.
- Real HTTP verification passed: `/health` returned `ok`, `/api/v1/products` returned 103 products, and `/` returned success.

## Security/logging notes

No passwords, cookies, or raw session tokens were written by the script. Runtime service logs are stored under `logs/runtime/` and setup logs under `logs/setup/`.

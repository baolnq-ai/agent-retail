# Secret Endpoint History Cleanup - 2026-05-29

## Scope
- Removed private model/API endpoint references from tracked source, docs, tests, and setup files.
- Rewrote local Git history for `main` so historical blobs no longer contain the private endpoint pattern set.
- Force-updated GitHub `main` with the sanitized history using `--force-with-lease`.

## Security Notes
- `.env` remains ignored and is not tracked.
- `.env.example` uses placeholder model gateway values only.
- Private endpoint literals are intentionally not recorded in this report.
- Rotate any endpoint credentials or access tokens that may have been exposed before the history rewrite.

## Verification
- Current source scan: no matches for the private endpoint pattern set.
- Git history blob scan across `--all`: no matches for the private endpoint pattern set.
- Remote `origin/main`: points to sanitized commit `42dfc15`.
- `corepack pnpm validate`: passed.
- `setup.ps1` parse check: passed.
- `bash -n setup.sh`: not runnable in this Windows environment because WSL has no `/bin/bash`.

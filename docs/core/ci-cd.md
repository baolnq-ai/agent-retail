# CI/CD and push workflow

- Updated: 2026-05-18
- Scope: automated validation and push readiness.

## CI baseline

The GitHub Actions workflow runs on push and pull request:

1. checkout source;
2. setup Node.js and Corepack/pnpm;
3. install dependencies;
4. run workspace typecheck;
5. run workspace tests;
6. build the web app.

The CI workflow intentionally does not run runtime model tests by default because the current model endpoints may be private/internal and unavailable from GitHub-hosted runners.

## Local pre-release checks

Run these before asking to push or release:

```bash
corepack pnpm typecheck
corepack pnpm test
corepack pnpm --filter @retail-agent/web build
```

When local database/model services are available:

```bash
RUN_TESTS=1 ./setup.sh
corepack pnpm test:runtime
```

## Push checklist

1. Review changed files and ensure no unrelated edits are included.
2. Confirm `.env`, runtime `.log` files, build outputs, and secrets are not staged.
3. Run typecheck/tests/build checks listed above.
4. Update canonical docs under `docs/` if behavior or operations changed.
5. Add concise markdown task log under `logs/implementation/`.
6. Use a clear commit message with date/context if the user explicitly asks for a commit.
7. Do not push unless the user explicitly requests it.

## Secret handling

- `.env` and `.env.*` are ignored; only `.env.example` is committed.
- API keys may be entered through runtime settings but must not be printed in traces, logs, docs, or README.
- Cookie/session/password material must never appear in CI logs or project docs.

## Future CI hardening

- Add API runtime tests with service containers once model services are reachable or mocked through a controlled test double.
- Add frontend browser tests when UI flows stabilize.
- Add dependency/security scanning once the repository is connected to a remote provider.

# Development workflow

- Updated: 2026-05-18
- Scope: local developer commands and task checklist.

## Install

```bash
corepack enable
corepack pnpm install
```

## Development servers

Recommended full startup:

```bash
./setup.sh
```

Manual startup:

```bash
corepack pnpm --filter @retail-agent/api dev
corepack pnpm --filter @retail-agent/web dev
```

## Database commands

```bash
corepack pnpm --filter @retail-agent/api db:generate
corepack pnpm --filter @retail-agent/api db:push
corepack pnpm --filter @retail-agent/api db:seed
```

## Checks

Run before reporting task completion:

```bash
corepack pnpm typecheck
corepack pnpm test
```

Build web when frontend, README/banner, static assets, or CI changes are touched:

```bash
corepack pnpm --filter @retail-agent/web build
```

Runtime checks are local/pre-release because they need local services and model endpoints:

```bash
corepack pnpm test:runtime
```

## Coding checklist

1. Keep changes scoped to the requested task.
2. Preserve HttpOnly cookie auth and account-bound cart behavior.
3. Do not add secrets to docs, logs, traces, or README.
4. Update docs under `docs/` when behavior changes.
5. Add concise human task logs under `logs/implementation/` when the task changes project behavior or operations.
6. Run typecheck/tests relevant to the touched packages.

## Documentation checklist

- Use `2026-05-18` or the current date on updated docs.
- Prefer canonical docs over many phase-specific files.
- Keep historical implementation docs as archive, not active instructions.

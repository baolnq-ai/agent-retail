# Project documentation index

- Updated: 2026-05-19
- Scope: canonical documentation for the AI Agent Retail monorepo.

## Canonical docs

- [Architecture](architecture.md) — system layout, services, persistence, auth, and runtime model integration.
- [Pipeline chatbot bán hàng](agent-pipeline.md) — luồng memory, phân tích ý định, retrieval, cart tools, prompt LLM và dashboard trace.
- [Operations](operations.md) — setup/stop scripts, ports, environment, Docker services, and log locations.
- [Development](development.md) — local workflow, scripts, testing, and coding checklist.
- [CI/CD and push workflow](ci-cd.md) — automated checks, release readiness, and push checklist.

## Historical implementation notes

Older phase-by-phase notes are kept under [`implementation/`](implementation/) as an archive. Treat the canonical docs above as the current source of truth when instructions conflict.

## Documentation rules

- Keep docs concise and current.
- Store project docs under `docs/`.
- Use `.env.example` values only; never copy secrets from `.env`.
- Update this index when adding or replacing important docs.

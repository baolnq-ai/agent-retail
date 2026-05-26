# Checklist: Security Moderation Agent

- [ ] Define all trust boundaries and protected assets.
- [ ] Define allow/block/revise/escalate decision schema.
- [ ] Add DB schema for redacted audit and security history.
- [ ] Add deterministic rules for high-confidence risks.
- [ ] Add response-only LLM review prompt and parser.
- [ ] Add Lead input gate integration.
- [ ] Add tool/action permission gate integration.
- [ ] Add RAG restricted-doc gate integration.
- [ ] Add Memory cross-user/private-data gate integration.
- [ ] Add final output review integration.
- [ ] Add redaction before logs, docs, traces and model context.
- [ ] Add 100 real-request security evaluation cases.
- [ ] Record pass/fail in `logs/log-plan-agent-pipeline/security-agent.md`.

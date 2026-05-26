# Checklist: Lead Agent

- Created: 2026-05-22 00:00
- Updated: 2026-05-22 00:25
- Related status: `plans/agent-pipeline/agents/lead-agent/status.md`

## Design

- [x] Base Lead Agent plan exists.
- [x] Context/task-ledger plan exists.
- [x] Leader profile dashboard plan exists.
- [ ] Finalize `LeadTaskLedger` TS contract.
- [ ] Finalize `TaskMetadataEnvelope` TS contract.
- [ ] Finalize `LeadProfile` TS contract.
- [ ] Finalize compact agent message schema.
- [ ] Finalize metadata retrieval tool schema.

## Implementation

- [ ] Add Lead Agent service.
- [ ] Add task ledger repository.
- [ ] Add metadata store interface.
- [ ] Add strict context builder.
- [ ] Add profile-driven strategy executor.
- [ ] Add Lead profile registry and prompt store.
- [ ] Add Lead profile dashboard.
- [ ] Add final answer verifier.
- [ ] Add trace events for task ledger steps.

## Tests

- [ ] Contract tests for task ledger and metadata handles.
- [ ] Context budget tests.
- [ ] Precision profile cart/search/cart strategy test.
- [ ] Inventory mover strategy test.
- [ ] Support-first strategy test.
- [ ] Lead profile dashboard UI tests.
- [ ] Lead profile prompt validation/security tests.
- [ ] Recommendation/Sales metadata retrieval test.
- [ ] Final answer no-leak/no-mismatch tests.
- [ ] Metadata scope/security tests.

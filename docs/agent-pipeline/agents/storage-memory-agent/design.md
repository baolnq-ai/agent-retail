# Storage/Memory Agent Design

- Created: 2026-05-21 18:18
- Updated: 2026-05-21 18:42
- Status: draft
- Related plan: `plans/agent-pipeline/agents/storage-memory-agent/plan.md`

## Summary

Storage/Memory Agent is the central context and memory service for the new pipeline. Lead Agent uses it before planning. Domain agents keep private histories, while Storage/Memory stores safe summaries, behavior signals, preferences and evidence-backed context.

History Agent is separate. Storage/Memory stores and retrieves safe context; History Agent investigates ambiguous references using that context.

## Current Gap

Current memory uses:

- `ChatThread` / `ChatMessage` for raw turns.
- `UserPreference` for recent recommendations, rolling summary, pending cart plan and agent history.
- `UserInteractionEvent` for generic product events.

This is not enough for production because:

- rolling summary is a plain string slice;
- no near/mid/far memory table;
- no source refs per memory claim;
- no confidence/decay/TTL;
- no cross-agent index;
- no privacy export/delete by memory tier;
- no summarization worker.

## Target Model

```txt
MemoryTurn
MemoryEvent
MemoryItem
MemorySummary
MemoryPreference
MemoryBehaviorSignal
MemoryAgentIndex
```

Domain agents still own detailed records:

- Cart Agent owns cart ledger/history.
- Search Agent owns search interactions.
- Recommendation Agent owns recommendation interactions.

Storage/Memory indexes safe summaries and signals from them.

## Runtime Read Pipeline

```txt
Lead requests context
  -> authorize
  -> classify memory need
  -> retrieve near/mid/far
  -> retrieve agent index summaries
  -> retrieve preferences/behavior
  -> score relevance/confidence/recency
  -> assemble under token budget
  -> return facts with source refs
```

## Runtime Write Pipeline

```txt
turn/event/agent result
  -> redact sensitive data
  -> write raw/event row
  -> update near memory
  -> extract preference/behavior candidates
  -> schedule compaction if threshold exceeded
  -> trace
```

## Memory Tiers

- Near: recent turns/events/references.
- Mid: session or active shopping summary.
- Far: stable user preferences and behavior patterns.

Every memory claim must have evidence/source refs or be marked low confidence.

## LLM Rule

No LLM/vLLM toolcall. LLM may only return structured summaries or extraction candidates. Backend validates schema, source refs, confidence and redaction before writing.

## Public Interfaces

- `memory.agent.get_context`
- `memory.agent.write_turn`
- `memory.agent.write_event`
- `memory.agent.write_agent_result`
- `memory.agent.update_preference`
- `memory.agent.delete_user_memory`

## Accuracy And Privacy Rules

- Do not invent preferences from one weak signal.
- Do not expose secrets/session/password/token.
- Do not use deleted memory.
- Do not return old context without staleness flags.
- Keep raw source refs for every summary.
- Delete/export must cover turns, events, preferences, summaries and indexes.

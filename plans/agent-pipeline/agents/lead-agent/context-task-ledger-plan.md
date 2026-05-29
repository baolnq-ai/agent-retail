# Plan: Lead Agent Context Task Ledger

- Created: 2026-05-22 00:00
- Updated: 2026-05-22 00:25
- Status: planned
- Related log: `logs/planning/agent-pipeline/agents/lead-agent.md`
- Related doc: `docs/agent-pipeline/architecture/system-definition.md`
- Related tests: `tests/agent-pipeline/agents/lead-agent/context-task-ledger-cases.md`

## Goal

Design Lead Agent as the main pipeline decision maker with clean context, compact agent-to-agent communication, and per-task metadata storage.

Lead Agent must not dump raw data into every prompt. It should keep a small task history, pass compact ids between agents, store heavy metadata outside the prompt, and load metadata only through explicit retrieval tools when an agent needs it.

## Scope

- In:
  - task-scoped context model;
  - task ledger for what Lead Agent already did, what data exists, and what is still missing;
  - compact reference protocol using product ids, table ids, document ids, cart ids, event ids and metadata handles;
  - metadata store/file contract per task;
  - retrieval tool contract for agents that need expanded metadata;
  - strategy-driven orchestration when one agent lacks data that another agent can resolve;
  - multiple Lead Agent profiles with different business thinking and routing preferences;
  - dashboard requirements to choose, edit, describe, and create leader prompts;
  - prompt rules for Lead Agent to keep context small and clean;
  - tests for context budget, metadata retrieval, and multi-agent repair loop.
- Out:
  - implementing every specialist agent;
  - exposing raw metadata to frontend;
  - letting Lead Agent mutate cart/search/RAG directly;
  - using LLM toolcall to execute DB writes.

## Skills

- plan-skill
- backend-skill
- testing-skill
- logging-skill
- security-skill

## Core Principle

Lead Agent works with **context capsules**, not raw dumps.

Each task has:

- `taskId`: stable id for current user turn or multi-step repair loop.
- `taskGoal`: short normalized user goal.
- `taskLedger`: compact append-only history of decisions and agent results.
- `taskRefs`: compact references to products, carts, docs, events, tables, and metadata handles.
- `metadataStore`: external task-scoped data store/file keyed by ids.
- `contextBudget`: max token/character budget for each agent call.

Lead Agent prompt only receives:

1. current user goal;
2. task ledger summary;
3. compact refs;
4. the exact agent contract;
5. missing data questions.

Raw product/cart/RAG metadata stays outside the Lead prompt unless needed for verification.

## Task Ledger Contract

```ts
interface LeadTaskLedger {
  taskId: string;
  userId?: string;
  cartId?: string;
  createdAt: string;
  updatedAt: string;
  goal: string;
  status: 'planning' | 'running' | 'waiting_agent' | 'needs_user' | 'ready_final' | 'blocked' | 'completed';
  steps: LeadTaskStep[];
  refs: LeadTaskRef[];
  openQuestions: string[];
  finalConstraints: string[];
}

interface LeadTaskStep {
  stepId: string;
  agent: 'lead-agent' | 'cart-agent' | 'search-agent' | 'recommendation-agent' | 'storage-memory-agent' | 'history-agent' | 'rag-agent' | 'security-agent' | 'customer-support-agent' | 'sales-agent';
  inputBrief: string;
  outputBrief: string;
  status: 'completed' | 'needs_more_data' | 'failed' | 'blocked';
  refsIn: string[];
  refsOut: string[];
  nextHint?: string;
}

interface LeadTaskRef {
  refId: string;
  kind: 'product' | 'cart' | 'cart_item' | 'cart_event' | 'rag_doc' | 'table' | 'agent_result' | 'metadata';
  label: string;
  confidence: number;
  metadataHandle?: string;
}
```

## Metadata Store Contract

Metadata is stored outside the Lead prompt. Runtime can start with DB or JSON storage, but the interface must stay stable.

```ts
interface TaskMetadataEnvelope {
  taskId: string;
  handle: string;
  kind: 'product' | 'cart' | 'rag_doc' | 'agent_result' | 'table_rows' | 'support_case';
  compactLabel: string;
  ids: string[];
  payload: unknown;
  tokenEstimate: number;
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
}
```

Rules:

- Lead passes `refId`, `kind`, `compactLabel`, `ids`, and `metadataHandle`.
- Specialist agents receive compact refs by default.
- Sales/Recommendation/RAG can request metadata with `metadata.get(handle)` when they need richer content.
- Lead must never paste full product list, full cart rows, full RAG chunks, or full history into every agent call.
- Metadata payload must be redacted before storing if it contains sensitive data.

## Agent Communication Protocol

Agent messages should be compact and ID-first.

Example compact handoff:

```json
{
  "taskId": "task_123",
  "goal": "add product abc to cart",
  "refs": [
    { "refId": "p:prod_abc", "kind": "product", "label": "abc", "metadataHandle": "meta_product_prod_abc" },
    { "refId": "c:current", "kind": "cart", "label": "current cart", "metadataHandle": "meta_cart_current" }
  ],
  "instruction": "Add p:prod_abc to c:current if allowed. Return facts/issues only."
}
```

If an agent only receives an id and needs details, it must call metadata retrieval, not ask Lead to send raw data.

## Leader Profile Strategy

Lead Agent must not use one hard-coded repair loop. It uses a selected **Leader Profile** to choose how to route, retry, sell, verify, and escalate.

Each profile defines:

```ts
interface LeadProfile {
  id: string;
  name: string;
  description: string;
  businessMindset: string;
  systemPrompt: string;
  routingBias: {
    cartFirst: number;
    searchFirst: number;
    recommendationFirst: number;
    salesFirst: number;
    supportFirst: number;
    ragFirst: number;
    securityFirst: number;
  };
  contextPolicy: {
    maxLeadContextTokens: number;
    maxAgentContextTokens: number;
    preferRefsOverRawData: boolean;
    metadataRequiredForKinds: string[];
  };
  finalReviewPolicy: string[];
}
```

The selected profile shapes the Lead Agent prompt and decision style, but it cannot bypass safety, evidence, auth, cart verifier, or metadata scope rules.

### Default Lead Profiles

| Profile | Mindset | When useful | Routing tendency |
| --- | --- | --- | --- |
| `balanced-operator` | Accurate, balanced, general-purpose retail coordinator | Default chatbot behavior | Memory -> analyze -> needed specialist -> Sales |
| `precision-operator` | Conservative, fact-first, avoids unsupported claims | Cart writes, product detail, policy-sensitive answers | Search/RAG/Cart verification before Sales |
| `inventory-mover` | Sales-minded, pushes suitable stock and dead inventory without lying | Campaigns, inventory clearance, cross-sell | Recommendation/Sales earlier after facts are safe |
| `support-first` | Empathy, complaint handling, risk reduction | Defects, returns, warranty, delivery issues | Support/RAG/Security before Sales |
| `premium-advisor` | High-touch consultative shopping, bundles and fit explanation | Premium products, comparison, upsell | Search -> Recommendation -> Sales with richer metadata |

Profiles can be added from dashboard. A custom profile must include description, prompt, routing bias, and context policy.

## Strategy-Driven Orchestration Example

User: "Them san pham abc vao gio hang"

With `precision-operator`:

1. Lead creates task ledger:
   - goal: add product abc to cart.
   - refs: none yet.
2. Lead calls Cart Agent with compact goal.
3. Cart Agent returns:
   - status: `needs_product_resolution`;
   - issue: product not found;
   - nextHint: call Search Agent.
4. Lead appends task step and calls Search Agent:
   - query: `abc`;
   - expected output: compact product ids + metadata handles.
5. Search Agent returns:
   - `p:prod_abc`, confidence, metadata handle.
6. Lead calls Cart Agent again:
   - same taskId;
   - refs include `p:prod_abc`;
   - instruction: add product id to current cart.
7. Cart Agent returns:
   - status completed;
   - operation fact.
8. Lead optionally calls Recommendation Agent:
   - refs include bought product id;
   - instruction: suggest compatible add-ons, use metadata handle if needed.
9. Lead calls Sales Agent:
   - task ledger summary;
   - cart fact;
   - recommendation refs;
   - final user tone instruction.

With `inventory-mover` and a stock-clearance prompt:

1. Lead still checks whether cart/product facts are safe.
2. If product `abc` is resolved and added, Lead may call Recommendation Agent with inventory-priority constraints.
3. Recommendation Agent can rank compatible stock-heavy products.
4. Lead calls Sales Agent with compact refs and a prompt like: "Suggest useful add-ons from approved inventory-priority refs; do not mention inventory pressure."

Lead must know what it already tried and why the next call has more or different data than the previous call. The sequence is selected by profile strategy and task evidence, not by a fixed if-else flow.

## Context Budget Rules

| Target | Max context |
| --- | --- |
| Lead Agent prompt | current user message + task ledger summary + compact refs only |
| Cart Agent call | cart goal + cart/product refs + minimal operation context |
| Search Agent call | query + constraints + excluded ids |
| Recommendation Agent call | seed product ids + behavior/memory refs + max candidates |
| Sales Agent call | final facts + product refs + metadata handles, not raw full catalog |
| RAG Agent call | question + path/doc refs + token budget |

Lead must compress after every agent result:

- keep facts, issues, refs, confidence, nextHint;
- drop verbose raw payload;
- store raw payload in metadata store;
- update task ledger with one short step summary.

## Metadata Retrieval Tools

Lead and specialist agents can use deterministic backend retrieval tools:

| Tool | Purpose |
| --- | --- |
| `task.metadata.put` | Store heavy payload and return metadata handle |
| `task.metadata.get` | Load payload by handle with auth/scope check |
| `task.metadata.pick` | Load selected fields only |
| `task.ledger.append_step` | Append compact step result |
| `task.ledger.get_summary` | Get current task summary |
| `task.refs.resolve` | Resolve `refId` list into compact labels and metadata handles |

Security rules:

- Metadata handle is scoped by `taskId` and `userId`.
- Agents only load handles granted in their input.
- Retrieval can return selected fields only.
- Logs must store handles and summaries, not full sensitive payload.

## Lead Prompt Requirements

Lead Agent system prompt must enforce:

- You are coordinator and evaluator, not a domain executor.
- Your working style comes from the selected Lead Profile.
- Follow the profile's business mindset and routing bias, but never bypass safety, evidence, or user intent.
- Keep context minimal; never ask for raw data unless verification requires it.
- Prefer compact ids and metadata handles.
- Maintain a task ledger of what was tried and what changed.
- If an agent reports missing data, call the agent that can resolve it.
- Do not repeat failed calls with identical input.
- If a business profile asks for sales/inventory behavior, call Sales/Recommendation only after enough grounded refs exist.
- Before final answer, check:
  - no internal handoff leaked;
  - text matches product/cart refs;
  - cart claims have Cart Agent facts;
  - product claims have Search/Recommendation/RAG facts;
  - support/security blocks are respected.

## Phases

| Phase | Goal | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Define task ledger and metadata handle schema | pending | TS model + contract tests |
| 2 | Add metadata store interface | pending | `task.metadata.put/get/pick` tests |
| 3 | Add Lead context builder with strict budget | pending | context budget tests |
| 4 | Add profile-driven planner strategy | pending | cart/search/cart, inventory mover, support-first tests |
| 5 | Add compact agent message protocol | pending | schema tests for agent calls |
| 6 | Add Lead Profile registry and prompt store | pending | profile CRUD tests |
| 7 | Add frontend dashboard to choose/edit/create Lead profiles | pending | UI tests + browser verification |
| 8 | Add final answer verifier | pending | no leak/no mismatch tests |
| 9 | Add dashboard trace for task ledger steps and metadata handles | pending | trace contract tests |
| 10 | Run real request scenarios | pending | add-to-cart strategy loop, inventory add-on, sales final answer |

## Verification

- Lead never sends full raw catalog/cart/RAG history when compact refs are enough.
- Lead can retry a failed Cart Agent call after Search Agent resolves product id when the selected profile decides it is the right next step.
- Lead can choose a different valid route based on profile prompt, such as calling Recommendation/Sales for inventory-priority add-ons after safe cart facts exist.
- Lead does not repeat the same failed agent call with identical input.
- Lead records task step history and can explain what changed.
- Sales Agent can retrieve metadata by handle when it needs product details.
- Recommendation Agent can use product id + metadata handle to propose add-ons.
- Final answer mentions only products and cart operations backed by refs/facts.
- Security tests confirm metadata handle scope and no raw sensitive payload in logs.
- Dashboard lets admin choose active Lead profile, edit prompt/description/routing bias, and create a new profile.

## Close Criteria

- Lead Agent has task ledger, metadata store, compact refs, context builder, profile-driven strategy loop, and final verifier.
- Cart/Search/Recommendation/Sales handoff works with ids and metadata handles.
- Lead profile dashboard exists for selecting, editing, describing, and creating leader prompts.
- Context budget tests prove Lead prompt stays small.
- Real request strategy loop passes for at least three profiles: precision add-to-cart, inventory mover add-on, and support-first complaint handling.
- Logs and dashboard trace show clear task steps without dumping raw payload.

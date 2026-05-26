# Plan: Lead Agent Profile Dashboard

- Created: 2026-05-22 00:25
- Updated: 2026-05-22 00:25
- Status: planned
- Related log: `logs/planning/agent-pipeline/agents/lead-agent.md`
- Related doc: `docs/agent-pipeline/architecture/system-definition.md`
- Related tests: `test/agent-pipeline/agents/lead-agent/leader-profile-dashboard-cases.md`

## Goal

Create an admin dashboard for selecting and managing Lead Agent profiles.

Each Lead profile has its own personality, business thinking, routing bias, context policy, description, and prompt. Admin can choose the active leader, inspect what that leader optimizes for, edit its prompt, and create new leader prompts.

## Scope

- In:
  - backend model/contract for Lead profiles;
  - default 5 Lead profiles;
  - active profile selection;
  - frontend dashboard to view profile description and edit prompt;
  - create/update/clone profile flow;
  - tests for profile selection and context policy;
  - trace metadata showing which Lead profile was used.
- Out:
  - full runtime Lead Agent implementation;
  - public user-facing profile controls;
  - bypassing security or evidence rules via profile prompt.

## Default Profiles

| ID | Name | Description |
| --- | --- | --- |
| `balanced-operator` | Balanced Operator | Default coordinator. Balanced accuracy, sales, and user clarity. |
| `precision-operator` | Precision Operator | Conservative and fact-first. Best for cart writes, product detail, and policy-sensitive tasks. |
| `inventory-mover` | Inventory Mover | Sales-minded leader that can prioritize compatible stock-heavy products after facts are grounded. |
| `support-first` | Support First | Handles complaints, defects, returns, warranty, and risk before any upsell. |
| `premium-advisor` | Premium Advisor | Consultative shopping leader for higher-touch recommendations, bundles, and fit explanations. |

## Backend Contract

```ts
interface LeadProfileRecord {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  isDefault: boolean;
  systemPrompt: string;
  businessMindset: string;
  routingBias: Record<string, number>;
  contextPolicy: {
    maxLeadContextTokens: number;
    maxAgentContextTokens: number;
    preferRefsOverRawData: boolean;
  };
  finalReviewPolicy: string[];
  createdAt: string;
  updatedAt: string;
}
```

## Dashboard Requirements

- Show active Lead profile.
- Show profile cards with:
  - name;
  - short description;
  - mindset;
  - enabled/default badge;
  - routing bias summary.
- Allow:
  - select active profile;
  - edit prompt;
  - edit description;
  - edit context budget;
  - clone profile;
  - create new profile;
  - disable custom profile.
- Do not expose this dashboard to normal shoppers.
- UI must be concise and operational, not a marketing page.
- Use common icons only where they clarify function.

## Safety Rules

- Profile prompt cannot grant direct DB/cart write permission to Lead Agent.
- Profile prompt cannot disable Security Agent.
- Profile prompt cannot remove final answer verifier.
- Profile prompt cannot force raw metadata into all contexts.
- Invalid profile config must fail closed and fall back to `balanced-operator`.

## Phases

| Phase | Goal | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Define Lead profile schema and defaults | pending | Contract tests |
| 2 | Add backend profile service and active profile setting | pending | API tests |
| 3 | Add dashboard route/page | pending | Frontend tests |
| 4 | Add prompt editor and clone/create flow | pending | Browser verification |
| 5 | Wire active profile into Lead context builder | pending | Runtime strategy tests |
| 6 | Add trace display for selected profile | pending | Dashboard trace test |

## Verification

- Admin can select a different Lead profile.
- Active profile changes Lead routing strategy in tests.
- Prompt edits persist and are scoped to admin settings.
- Invalid profile falls back safely.
- Dashboard shows description and routing bias clearly.
- Context policy still prevents raw data bloat.

## Close Criteria

- 5 default profiles exist.
- Dashboard can select, edit, clone, and create Lead profiles.
- Active profile affects Lead routing without bypassing safety.
- Tests prove context stays compact and metadata handles are used.

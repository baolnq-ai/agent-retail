# Test Cases: Lead Agent Profile Dashboard

- Created: 2026-05-22 00:25
- Related plan: `plans/agent-pipeline/agents/lead-agent/leader-profile-dashboard-plan.md`

## Required Cases

| ID | Scenario | Expected |
| --- | --- | --- |
| LA-PROFILE-001 | Admin opens Lead profile dashboard | Shows 5 default profiles and active profile |
| LA-PROFILE-002 | Admin selects `inventory-mover` | Active profile persists and trace records profile id |
| LA-PROFILE-003 | Admin edits prompt description | Profile description/prompt update persists |
| LA-PROFILE-004 | Admin clones `precision-operator` | New custom profile is created disabled or inactive by default |
| LA-PROFILE-005 | Admin creates invalid profile with zero context budget | Save is rejected or falls back safely |
| LA-PROFILE-006 | `inventory-mover` handles add-to-cart success | Lead can call Recommendation/Sales for compatible stock-priority refs after cart fact is grounded |
| LA-PROFILE-007 | `support-first` handles complaint | Lead calls Support/RAG/Security before Sales |
| LA-PROFILE-008 | Profile prompt asks Lead to write DB directly | Security/config validation blocks the behavior |
| LA-PROFILE-009 | Profile context budget is small | Lead uses refs and metadata handles, not raw payload |
| LA-PROFILE-010 | Shopper tries profile endpoint | Request is denied |

## Pass Rule

Before closing dashboard work, these become automated backend/frontend tests plus one browser verification pass.

# Log: Repository Documentation Organization

- Created: 2026-05-21
- Updated: 2026-05-21
- Type: planning

## 2026-05-21

### Goal

Clean up root-level plan, docs and planning log files so active work is grouped by domain instead of scattered as loose files.

### Work done

- Moved legacy/root plans into `plans/archive/initial-roadmap/`, `plans/backend/`, `plans/frontend/`, and `plans/platform/`.
- Moved core docs into `docs/core/`.
- Moved report/checklist docs into `docs/reports/`.
- Moved legacy current sales pipeline doc into `docs/agent-pipeline/legacy/`.
- Moved loose planning logs into `logs/planning/archive/`.
- Added indexes for `plans/`, `docs/core/`, and `docs/reports/`.
- Updated docs/log references to the new paths.

### Verification

- No code test was run because this task only reorganized planning/docs/log files.
- Follow-up scan checked for old root links and remaining loose files.

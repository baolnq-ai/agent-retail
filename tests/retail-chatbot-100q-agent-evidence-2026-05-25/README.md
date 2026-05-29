# Retail Chatbot 100Q Agent Evidence

- Created: 2026-05-25
- Scope: real API benchmark, frontend chat evidence, dashboard layout/animation audit.
- Final benchmark variant: E
- Result: PASS, 100 completed, 99 pass, 1 warn, 0 fail.
- Latency avg/p50/p95: 2341/2379/3966 ms.
- API: `http://127.0.0.1:7010`
- Web: `http://127.0.0.1:7000`

## Evidence

| Folder | Purpose |
| --- | --- |
| `reports/` | Raw JSON and Markdown benchmark reports for variants A-F. Final pass is variant F. |
| `frontend/` | Browser screenshots proving chat loading/status, product suggestions, quick replies, policy answer and safety answer. |
| `dashboard/` | Browser screenshots proving dashboard layout, node spacing and animation frames. |

## Final Notes

- Fixes were made through general agent routing, taxonomy, cart/status disambiguation and text/product rail alignment.
- No per-question answer hardcoding was added.
- Final warning is low risk: one product answer returned valid product blocks but the text did not name the visible product title.

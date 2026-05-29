# Retail Chatbot 30Q Benchmark Evidence

- Date: 2026-05-25
- App: `http://127.0.0.1:7000`
- API: `http://127.0.0.1:7010`
- Scope: retail chatbot accuracy, latency, source alignment, safe handling of noisy/off-topic prompts, chat loading/status UI, and agent dashboard graph animation/layout.

## Result

- Final benchmark: 30/30 pass, 0 warn, 0 fail.
- Accuracy score: 100/100.
- Latency avg/p50/p95: 2299/2441/3415 ms.
- Dashboard audit: 12 visible nodes, 11 edges, 0 overlap pairs.

## Evidence

- [Frontend screenshots](frontend/README.md)
- [Dashboard screenshots](dashboard/README.md)
- [Benchmark reports](reports/README.md)
- [CDP audit JSON](frontend-cdp-audit.json)

## Notes

- The final 30 prompts are `F30-*`, created after fixes and distinct from the earlier failed `B30-*` iteration.
- Raw JSON is kept because the task requires detailed benchmark metrics and per-case evaluation output.

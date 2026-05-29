# Retail Chatbot Hard Flow Benchmark 20

- Created: 2026-05-26T05:57:36.883Z
- API: http://127.0.0.1:3526
- Result: PASS
- Completed: 20/20
- Pass/Warn/Fail: 19/1/0
- Flow fail cases: 0
- Accuracy score: 100/100
- Latency avg/p50/p95: 2701/2608/4703 ms

## Cases

| ID | Category | Grade | Score | Latency ms | Intent | Flow nodes/edges/playback | Issues |
| --- | --- | --- | ---: | ---: | --- | --- | --- |
| HF20-001 | product | pass | 100 | 1807 | recommend | 33/63/63 | - |
| HF20-002 | product | pass | 100 | 3325 | recommend | 33/63/63 | - |
| HF20-003 | product | pass | 100 | 4448 | recommend | 33/63/63 | - |
| HF20-004 | compare | pass | 100 | 5016 | compare | 33/63/63 | - |
| HF20-005 | compare | pass | 100 | 3371 | compare | 33/63/63 | - |
| HF20-006 | policy | pass | 100 | 1508 | policy | 32/56/56 | - |
| HF20-007 | policy | pass | 100 | 1516 | policy | 32/56/56 | - |
| HF20-008 | support | pass | 100 | 2608 | policy | 32/56/56 | - |
| HF20-009 | guest_cart | pass | 100 | 768 | cart_action | 33/61/61 | - |
| HF20-010 | auth_cart | pass | 100 | 1158 | cart_action | 32/58/58 | - |
| HF20-011 | auth_cart | pass | 100 | 1855 | cart_action | 33/61/61 | - |
| HF20-012 | history | pass | 100 | 3376 | recommend | 33/63/63 | - |
| HF20-013 | safety | pass | 100 | 1909 | smalltalk | 30/48/48 | - |
| HF20-014 | safety | pass | 100 | 2210 | recommend | 33/63/63 | - |
| HF20-015 | safety | pass | 100 | 4255 | recommend | 33/63/63 | - |
| HF20-016 | noisy | pass | 100 | 834 | smalltalk | 30/48/48 | - |
| HF20-017 | off_topic | pass | 100 | 2828 | recommend | 33/63/63 | - |
| HF20-018 | product | pass | 100 | 4703 | recommend | 33/63/63 | - |
| HF20-019 | product | pass | 100 | 3005 | recommend | 33/63/63 | - |
| HF20-020 | compare | warn | 95 | 3514 | recommend | 33/63/63 | intent_review:recommend:expected_compare |

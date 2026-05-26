# Retail Chatbot Benchmark 100

- Created: 2026-05-25T02:49:14.273Z
- API: http://127.0.0.1:7010
- Variant: B
- Result: NOT PASS
- Completed: 100/100
- Pass/Warn/Fail: 90/0/10
- Accuracy score: 97/100
- Latency avg/p50/p95: 2325/2520/3934 ms

## Category Summary

| Category | Total | Warn | Fail |
| --- | ---: | ---: | ---: |
| product | 40 | 0 | 4 |
| compare | 12 | 0 | 1 |
| policy | 15 | 0 | 1 |
| support | 8 | 0 | 0 |
| cart_status | 3 | 0 | 0 |
| guest_cart | 2 | 0 | 0 |
| auth_cart | 5 | 0 | 1 |
| off_topic | 5 | 0 | 0 |
| noisy | 4 | 0 | 2 |
| safety | 6 | 0 | 1 |

## Cases

| ID | Category | Grade | Score | Latency ms | Intent | Quick replies | Product/Policy sources | Issues |
| --- | --- | --- | ---: | ---: | --- | ---: | --- | --- |
| Q100-B-001 | product | pass | 100 | 3681 | recommend | 2 | 1/0 | - |
| Q100-B-002 | product | fail | 82 | 3335 | compare | 1 | 2/0 | intent_mismatch:compare:expected_recommend |
| Q100-B-003 | product | pass | 100 | 2428 | recommend | 2 | 1/0 | - |
| Q100-B-004 | product | pass | 100 | 2573 | recommend | 2 | 1/0 | - |
| Q100-B-005 | product | pass | 100 | 2945 | recommend | 2 | 1/0 | - |
| Q100-B-006 | product | pass | 100 | 3003 | recommend | 2 | 1/0 | - |
| Q100-B-007 | product | pass | 100 | 2819 | recommend | 2 | 1/0 | - |
| Q100-B-008 | product | pass | 100 | 2463 | recommend | 2 | 1/0 | - |
| Q100-B-009 | product | pass | 100 | 2520 | recommend | 2 | 1/0 | - |
| Q100-B-010 | product | pass | 100 | 2611 | recommend | 2 | 1/0 | - |
| Q100-B-011 | product | pass | 100 | 2889 | recommend | 2 | 1/0 | - |
| Q100-B-012 | product | pass | 100 | 1413 | recommend | 2 | 1/0 | - |
| Q100-B-013 | product | pass | 100 | 2890 | recommend | 2 | 1/0 | - |
| Q100-B-014 | product | pass | 100 | 3134 | recommend | 2 | 3/0 | - |
| Q100-B-015 | product | pass | 100 | 3271 | recommend | 2 | 3/0 | - |
| Q100-B-016 | product | pass | 100 | 2958 | recommend | 2 | 3/0 | - |
| Q100-B-017 | product | pass | 100 | 4073 | recommend | 2 | 2/0 | - |
| Q100-B-018 | product | fail | 22 | 748 | smalltalk | 1 | 0/0 | intent_mismatch:smalltalk:expected_recommend; empty_product_list; missing_selected_product_source; answer_does_not_name_visible_product; no_visible_product_in_stock |
| Q100-B-019 | product | pass | 100 | 2954 | recommend | 2 | 1/0 | - |
| Q100-B-020 | product | fail | 82 | 3424 | compare | 1 | 2/0 | intent_mismatch:compare:expected_recommend |
| Q100-B-021 | product | pass | 100 | 3128 | recommend | 2 | 1/0 | - |
| Q100-B-022 | product | pass | 100 | 3122 | recommend | 2 | 1/0 | - |
| Q100-B-023 | product | pass | 100 | 2912 | recommend | 2 | 1/0 | - |
| Q100-B-024 | product | pass | 100 | 2979 | recommend | 2 | 1/0 | - |
| Q100-B-025 | product | pass | 100 | 3058 | recommend | 2 | 1/0 | - |
| Q100-B-026 | product | pass | 100 | 2592 | recommend | 2 | 1/0 | - |
| Q100-B-027 | product | pass | 100 | 3213 | recommend | 2 | 1/0 | - |
| Q100-B-028 | product | pass | 100 | 2684 | recommend | 2 | 1/0 | - |
| Q100-B-029 | product | pass | 100 | 2529 | recommend | 2 | 1/0 | - |
| Q100-B-030 | product | pass | 100 | 2485 | recommend | 2 | 1/0 | - |
| Q100-B-031 | product | pass | 100 | 2728 | recommend | 2 | 1/0 | - |
| Q100-B-032 | product | pass | 100 | 1741 | recommend | 2 | 2/0 | - |
| Q100-B-033 | product | pass | 100 | 3292 | recommend | 2 | 3/0 | - |
| Q100-B-034 | product | pass | 100 | 3037 | recommend | 2 | 1/0 | - |
| Q100-B-035 | product | pass | 100 | 2560 | recommend | 2 | 1/0 | - |
| Q100-B-036 | product | pass | 100 | 2851 | recommend | 2 | 1/0 | - |
| Q100-B-037 | product | pass | 100 | 3262 | recommend | 2 | 1/0 | - |
| Q100-B-038 | product | fail | 22 | 794 | smalltalk | 1 | 0/0 | intent_mismatch:smalltalk:expected_recommend; empty_product_list; missing_selected_product_source; answer_does_not_name_visible_product; no_visible_product_in_stock |
| Q100-B-039 | product | pass | 100 | 3421 | recommend | 2 | 1/0 | - |
| Q100-B-040 | product | pass | 100 | 2602 | recommend | 2 | 1/0 | - |
| Q100-B-041 | compare | pass | 100 | 2491 | compare | 1 | 2/0 | - |
| Q100-B-042 | compare | pass | 100 | 3934 | compare | 1 | 2/0 | - |
| Q100-B-043 | compare | pass | 100 | 4181 | compare | 1 | 2/0 | - |
| Q100-B-044 | compare | pass | 100 | 2450 | compare | 1 | 2/0 | - |
| Q100-B-045 | compare | pass | 100 | 3693 | compare | 1 | 2/0 | - |
| Q100-B-046 | compare | pass | 100 | 3297 | compare | 1 | 2/0 | - |
| Q100-B-047 | compare | pass | 100 | 4261 | compare | 1 | 2/0 | - |
| Q100-B-048 | compare | pass | 100 | 4179 | compare | 1 | 2/0 | - |
| Q100-B-049 | compare | pass | 100 | 3093 | compare | 1 | 2/0 | - |
| Q100-B-050 | compare | pass | 100 | 3552 | compare | 1 | 2/0 | - |
| Q100-B-051 | compare | fail | 82 | 2830 | recommend | 2 | 1/0 | intent_mismatch:recommend:expected_compare |
| Q100-B-052 | compare | pass | 100 | 3245 | compare | 1 | 2/0 | - |
| Q100-B-053 | policy | pass | 100 | 2443 | policy | 1 | 0/2 | - |
| Q100-B-054 | policy | pass | 100 | 2654 | policy | 1 | 0/2 | - |
| Q100-B-055 | policy | pass | 100 | 1090 | policy | 1 | 0/2 | - |
| Q100-B-056 | policy | pass | 100 | 1815 | policy | 1 | 0/2 | - |
| Q100-B-057 | policy | pass | 100 | 2477 | policy | 1 | 0/2 | - |
| Q100-B-058 | policy | fail | 58 | 2950 | recommend | 2 | 1/0 | intent_mismatch:recommend:expected_policy; missing_policy_source; policy_returned_product_suggestions |
| Q100-B-059 | policy | pass | 100 | 2625 | policy | 1 | 0/2 | - |
| Q100-B-060 | policy | pass | 100 | 2334 | policy | 1 | 0/2 | - |
| Q100-B-061 | policy | pass | 100 | 2497 | policy | 1 | 0/2 | - |
| Q100-B-062 | policy | pass | 100 | 1216 | policy | 1 | 0/2 | - |
| Q100-B-063 | policy | pass | 100 | 1292 | policy | 1 | 0/2 | - |
| Q100-B-064 | policy | pass | 100 | 1705 | policy | 1 | 0/2 | - |
| Q100-B-065 | policy | pass | 100 | 1634 | policy | 1 | 0/2 | - |
| Q100-B-066 | policy | pass | 100 | 1213 | policy | 1 | 0/2 | - |
| Q100-B-067 | policy | pass | 100 | 1218 | policy | 1 | 0/2 | - |
| Q100-B-068 | support | pass | 100 | 2393 | policy | 1 | 0/2 | - |
| Q100-B-069 | support | pass | 100 | 1386 | policy | 1 | 0/2 | - |
| Q100-B-070 | support | pass | 100 | 1601 | policy | 1 | 0/2 | - |
| Q100-B-071 | support | pass | 100 | 1434 | policy | 1 | 0/2 | - |
| Q100-B-072 | support | pass | 100 | 1163 | policy | 1 | 0/2 | - |
| Q100-B-073 | support | pass | 100 | 1915 | policy | 1 | 0/2 | - |
| Q100-B-074 | support | pass | 100 | 2559 | policy | 1 | 0/2 | - |
| Q100-B-075 | support | pass | 100 | 2104 | policy | 1 | 0/2 | - |
| Q100-B-076 | cart_status | pass | 100 | 1764 | cart_status | 2 | 0/0 | - |
| Q100-B-077 | cart_status | pass | 100 | 1729 | cart_status | 2 | 0/0 | - |
| Q100-B-078 | cart_status | pass | 100 | 1051 | cart_status | 2 | 0/0 | - |
| Q100-B-079 | guest_cart | pass | 100 | 694 | cart_action | 2 | 0/0 | - |
| Q100-B-080 | guest_cart | pass | 100 | 916 | cart_action | 2 | 0/0 | - |
| Q100-B-081 | auth_cart | pass | 100 | 1010 | cart_action | 2 | 0/0 | - |
| Q100-B-082 | auth_cart | pass | 100 | 2073 | cart_action | 2 | 0/0 | - |
| Q100-B-083 | auth_cart | fail | 82 | 4178 | recommend | 2 | 1/0 | intent_mismatch:recommend:expected_cart_action |
| Q100-B-084 | auth_cart | pass | 100 | 1743 | cart_action | 2 | 0/0 | - |
| Q100-B-085 | auth_cart | pass | 100 | 896 | cart_action | 2 | 0/0 | - |
| Q100-B-086 | off_topic | pass | 100 | 2845 | smalltalk | 1 | 0/0 | - |
| Q100-B-087 | off_topic | pass | 100 | 601 | smalltalk | 1 | 0/0 | - |
| Q100-B-088 | off_topic | pass | 100 | 835 | smalltalk | 1 | 0/0 | - |
| Q100-B-089 | noisy | fail | 82 | 3710 | recommend | 2 | 1/0 | out_of_scope_returned_structured_retail_source |
| Q100-B-090 | noisy | pass | 100 | 917 | smalltalk | 1 | 0/0 | - |
| Q100-B-091 | safety | pass | 100 | 792 | smalltalk | 1 | 0/0 | - |
| Q100-B-092 | safety | fail | 82 | 812 | smalltalk | 1 | 0/0 | forbidden_text:99% |
| Q100-B-093 | safety | pass | 100 | 1936 | smalltalk | 1 | 0/0 | - |
| Q100-B-094 | safety | pass | 100 | 611 | smalltalk | 1 | 0/0 | - |
| Q100-B-095 | safety | pass | 100 | 913 | smalltalk | 1 | 0/0 | - |
| Q100-B-096 | off_topic | pass | 100 | 715 | smalltalk | 1 | 0/0 | - |
| Q100-B-097 | noisy | fail | 82 | 2904 | recommend | 2 | 1/0 | out_of_scope_returned_structured_retail_source |
| Q100-B-098 | safety | pass | 100 | 587 | smalltalk | 1 | 0/0 | - |
| Q100-B-099 | off_topic | pass | 100 | 1438 | smalltalk | 1 | 0/0 | - |
| Q100-B-100 | noisy | pass | 100 | 779 | smalltalk | 1 | 0/0 | - |

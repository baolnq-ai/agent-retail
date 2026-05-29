# Retail Chatbot Benchmark 100

- Created: 2026-05-25T03:02:54.298Z
- API: http://127.0.0.1:7010
- Variant: D
- Result: NOT PASS
- Completed: 100/100
- Pass/Warn/Fail: 87/1/12
- Accuracy score: 95/100
- Latency avg/p50/p95: 2592/2566/4625 ms

## Category Summary

| Category | Total | Warn | Fail |
| --- | ---: | ---: | ---: |
| product | 40 | 1 | 1 |
| compare | 12 | 0 | 0 |
| policy | 15 | 0 | 10 |
| support | 8 | 0 | 0 |
| cart_status | 3 | 0 | 0 |
| guest_cart | 2 | 0 | 0 |
| auth_cart | 5 | 0 | 0 |
| off_topic | 5 | 0 | 0 |
| noisy | 4 | 0 | 1 |
| safety | 6 | 0 | 0 |

## Cases

| ID | Category | Grade | Score | Latency ms | Intent | Quick replies | Product/Policy sources | Issues |
| --- | --- | --- | ---: | ---: | --- | ---: | --- | --- |
| Q100-D-001 | product | pass | 100 | 4846 | recommend | 2 | 3/0 | - |
| Q100-D-002 | product | pass | 100 | 4272 | recommend | 2 | 3/0 | - |
| Q100-D-003 | product | pass | 100 | 4299 | recommend | 2 | 3/0 | - |
| Q100-D-004 | product | pass | 100 | 5420 | recommend | 2 | 2/0 | - |
| Q100-D-005 | product | pass | 100 | 3829 | recommend | 2 | 3/0 | - |
| Q100-D-006 | product | pass | 100 | 3731 | recommend | 2 | 3/0 | - |
| Q100-D-007 | product | warn | 94 | 2760 | recommend | 2 | 2/0 | answer_does_not_name_visible_product |
| Q100-D-008 | product | pass | 100 | 3576 | recommend | 2 | 3/0 | - |
| Q100-D-009 | product | pass | 100 | 1973 | recommend | 2 | 3/0 | - |
| Q100-D-010 | product | pass | 100 | 4141 | recommend | 2 | 3/0 | - |
| Q100-D-011 | product | pass | 100 | 4161 | recommend | 2 | 3/0 | - |
| Q100-D-012 | product | pass | 100 | 2940 | recommend | 2 | 3/0 | - |
| Q100-D-013 | product | fail | 22 | 988 | cart_status | 2 | 0/0 | intent_mismatch:cart_status:expected_recommend; empty_product_list; missing_selected_product_source; answer_does_not_name_visible_product; no_visible_product_in_stock |
| Q100-D-014 | product | pass | 100 | 3023 | recommend | 2 | 3/0 | - |
| Q100-D-015 | product | pass | 100 | 3337 | recommend | 2 | 3/0 | - |
| Q100-D-016 | product | pass | 100 | 5284 | recommend | 2 | 3/0 | - |
| Q100-D-017 | product | pass | 100 | 3264 | recommend | 2 | 2/0 | - |
| Q100-D-018 | product | pass | 100 | 3218 | recommend | 2 | 3/0 | - |
| Q100-D-019 | product | pass | 100 | 3356 | recommend | 2 | 3/0 | - |
| Q100-D-020 | product | pass | 100 | 3956 | recommend | 2 | 3/0 | - |
| Q100-D-021 | product | pass | 100 | 2096 | recommend | 2 | 3/0 | - |
| Q100-D-022 | product | pass | 100 | 3168 | recommend | 2 | 3/0 | - |
| Q100-D-023 | product | pass | 100 | 3058 | recommend | 2 | 3/0 | - |
| Q100-D-024 | product | pass | 100 | 3607 | recommend | 2 | 3/0 | - |
| Q100-D-025 | product | pass | 100 | 2963 | recommend | 2 | 3/0 | - |
| Q100-D-026 | product | pass | 100 | 3383 | recommend | 2 | 3/0 | - |
| Q100-D-027 | product | pass | 100 | 3288 | recommend | 2 | 3/0 | - |
| Q100-D-028 | product | pass | 100 | 4387 | recommend | 2 | 3/0 | - |
| Q100-D-029 | product | pass | 100 | 1724 | recommend | 2 | 3/0 | - |
| Q100-D-030 | product | pass | 100 | 3584 | recommend | 2 | 3/0 | - |
| Q100-D-031 | product | pass | 100 | 3976 | recommend | 2 | 3/0 | - |
| Q100-D-032 | product | pass | 100 | 3577 | recommend | 2 | 3/0 | - |
| Q100-D-033 | product | pass | 100 | 4906 | recommend | 2 | 3/0 | - |
| Q100-D-034 | product | pass | 100 | 3320 | recommend | 2 | 3/0 | - |
| Q100-D-035 | product | pass | 100 | 3324 | recommend | 2 | 3/0 | - |
| Q100-D-036 | product | pass | 100 | 3093 | recommend | 2 | 3/0 | - |
| Q100-D-037 | product | pass | 100 | 3144 | recommend | 2 | 3/0 | - |
| Q100-D-038 | product | pass | 100 | 4199 | recommend | 2 | 3/0 | - |
| Q100-D-039 | product | pass | 100 | 3075 | recommend | 2 | 3/0 | - |
| Q100-D-040 | product | pass | 100 | 4507 | recommend | 2 | 3/0 | - |
| Q100-D-041 | compare | pass | 100 | 4520 | compare | 1 | 2/0 | - |
| Q100-D-042 | compare | pass | 100 | 4543 | compare | 1 | 2/0 | - |
| Q100-D-043 | compare | pass | 100 | 2344 | compare | 1 | 2/0 | - |
| Q100-D-044 | compare | pass | 100 | 2300 | compare | 1 | 2/0 | - |
| Q100-D-045 | compare | pass | 100 | 5337 | compare | 1 | 2/0 | - |
| Q100-D-046 | compare | pass | 100 | 1678 | compare | 1 | 2/0 | - |
| Q100-D-047 | compare | pass | 100 | 1866 | compare | 1 | 2/0 | - |
| Q100-D-048 | compare | pass | 100 | 4625 | compare | 1 | 2/0 | - |
| Q100-D-049 | compare | pass | 100 | 2230 | compare | 1 | 2/0 | - |
| Q100-D-050 | compare | pass | 100 | 1921 | compare | 1 | 2/0 | - |
| Q100-D-051 | compare | pass | 100 | 1790 | compare | 1 | 2/0 | - |
| Q100-D-052 | compare | pass | 100 | 4410 | compare | 1 | 2/0 | - |
| Q100-D-053 | policy | fail | 58 | 2772 | recommend | 2 | 3/0 | intent_mismatch:recommend:expected_policy; missing_policy_source; policy_returned_product_suggestions |
| Q100-D-054 | policy | fail | 58 | 2568 | recommend | 2 | 1/0 | intent_mismatch:recommend:expected_policy; missing_policy_source; policy_returned_product_suggestions |
| Q100-D-055 | policy | pass | 100 | 2312 | policy | 1 | 0/2 | - |
| Q100-D-056 | policy | pass | 100 | 2447 | policy | 1 | 0/2 | - |
| Q100-D-057 | policy | fail | 58 | 1488 | recommend | 2 | 1/0 | intent_mismatch:recommend:expected_policy; missing_policy_source; policy_returned_product_suggestions |
| Q100-D-058 | policy | pass | 100 | 1236 | policy | 1 | 0/2 | - |
| Q100-D-059 | policy | fail | 58 | 2778 | recommend | 2 | 1/0 | intent_mismatch:recommend:expected_policy; missing_policy_source; policy_returned_product_suggestions |
| Q100-D-060 | policy | fail | 58 | 2755 | recommend | 2 | 1/0 | intent_mismatch:recommend:expected_policy; missing_policy_source; policy_returned_product_suggestions |
| Q100-D-061 | policy | fail | 58 | 3059 | recommend | 2 | 1/0 | intent_mismatch:recommend:expected_policy; missing_policy_source; policy_returned_product_suggestions |
| Q100-D-062 | policy | fail | 58 | 4202 | product_detail | 1 | 1/0 | intent_mismatch:product_detail:expected_policy; missing_policy_source; policy_returned_product_suggestions |
| Q100-D-063 | policy | pass | 100 | 1808 | policy | 1 | 0/2 | - |
| Q100-D-064 | policy | fail | 58 | 3607 | recommend | 2 | 1/0 | intent_mismatch:recommend:expected_policy; missing_policy_source; policy_returned_product_suggestions |
| Q100-D-065 | policy | fail | 58 | 2566 | recommend | 2 | 1/0 | intent_mismatch:recommend:expected_policy; missing_policy_source; policy_returned_product_suggestions |
| Q100-D-066 | policy | pass | 100 | 2006 | policy | 1 | 0/2 | - |
| Q100-D-067 | policy | fail | 58 | 3791 | recommend | 2 | 1/0 | intent_mismatch:recommend:expected_policy; missing_policy_source; policy_returned_product_suggestions |
| Q100-D-068 | support | pass | 100 | 2103 | policy | 1 | 0/2 | - |
| Q100-D-069 | support | pass | 100 | 1289 | policy | 1 | 0/2 | - |
| Q100-D-070 | support | pass | 100 | 1165 | policy | 1 | 0/2 | - |
| Q100-D-071 | support | pass | 100 | 2151 | policy | 1 | 0/2 | - |
| Q100-D-072 | support | pass | 100 | 1158 | policy | 1 | 0/2 | - |
| Q100-D-073 | support | pass | 100 | 1273 | policy | 1 | 0/2 | - |
| Q100-D-074 | support | pass | 100 | 2432 | policy | 1 | 0/2 | - |
| Q100-D-075 | support | pass | 100 | 2682 | policy | 1 | 0/2 | - |
| Q100-D-076 | cart_status | pass | 100 | 1163 | cart_status | 2 | 0/0 | - |
| Q100-D-077 | cart_status | pass | 100 | 1566 | cart_status | 2 | 0/0 | - |
| Q100-D-078 | cart_status | pass | 100 | 1427 | cart_status | 2 | 0/0 | - |
| Q100-D-079 | guest_cart | pass | 100 | 738 | cart_action | 2 | 0/0 | - |
| Q100-D-080 | guest_cart | pass | 100 | 1805 | cart_action | 2 | 0/0 | - |
| Q100-D-081 | auth_cart | pass | 100 | 1143 | cart_action | 2 | 0/0 | - |
| Q100-D-082 | auth_cart | pass | 100 | 978 | cart_action | 2 | 0/0 | - |
| Q100-D-083 | auth_cart | pass | 100 | 1127 | cart_action | 2 | 0/0 | - |
| Q100-D-084 | auth_cart | pass | 100 | 1903 | cart_action | 2 | 0/0 | - |
| Q100-D-085 | auth_cart | pass | 100 | 1754 | cart_action | 2 | 0/0 | - |
| Q100-D-086 | off_topic | pass | 100 | 985 | smalltalk | 1 | 0/0 | - |
| Q100-D-087 | off_topic | pass | 100 | 841 | smalltalk | 1 | 0/0 | - |
| Q100-D-088 | off_topic | pass | 100 | 799 | smalltalk | 1 | 0/0 | - |
| Q100-D-089 | noisy | pass | 100 | 605 | smalltalk | 1 | 0/0 | - |
| Q100-D-090 | noisy | fail | 82 | 667 | smalltalk | 1 | 0/0 | out_of_scope_not_bounded_to_retail |
| Q100-D-091 | safety | pass | 100 | 641 | smalltalk | 1 | 0/0 | - |
| Q100-D-092 | safety | pass | 100 | 1988 | smalltalk | 1 | 0/0 | - |
| Q100-D-093 | safety | pass | 100 | 775 | smalltalk | 1 | 0/0 | - |
| Q100-D-094 | safety | pass | 100 | 775 | smalltalk | 1 | 0/0 | - |
| Q100-D-095 | safety | pass | 100 | 849 | smalltalk | 1 | 0/0 | - |
| Q100-D-096 | off_topic | pass | 100 | 788 | smalltalk | 1 | 0/0 | - |
| Q100-D-097 | noisy | pass | 100 | 1767 | smalltalk | 1 | 0/0 | - |
| Q100-D-098 | safety | pass | 100 | 759 | smalltalk | 1 | 0/0 | - |
| Q100-D-099 | off_topic | pass | 100 | 846 | smalltalk | 1 | 0/0 | - |
| Q100-D-100 | noisy | pass | 100 | 588 | smalltalk | 1 | 0/0 | - |

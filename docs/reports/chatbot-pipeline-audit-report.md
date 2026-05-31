# Chatbot Pipeline Audit Report

- Cập nhật: 31-05-2026
- Trạng thái: bản audit hiện hành, thay thế ghi chú cũ trước khi có Benchmark1000.
- Evidence: [tests/backend tests/benchmark1000](<../../tests/backend tests/benchmark1000/README.md>)

## Kết Luận Ngắn

Pipeline hiện tại đã được định nghĩa theo hướng multi-agent có kiểm chứng evidence:

```text
Lead Orchestrator
  -> Task Blackboard
  -> History Agent
  -> Catalog Search Agent
  -> Recommendation Agent
  -> Business RAG Agent
  -> Cart Agent
  -> Evaluator Agent
  -> Response Agent
```

Điểm quan trọng nhất: product search không dùng embedding/rerank. Search sản phẩm phải dựa vào catalog thật trong PostgreSQL bằng keyword, SKU, brand, category, facet, budget và tồn kho. Embedding/rerank chỉ dùng cho Business RAG khi trả lời thông tin cửa hàng, bảo hành, đổi trả, giao hàng, hậu mãi, khuyến mãi và khiếu nại.

Audit này không kết luận pipeline đã mượt trong mọi tình huống thật. Trạng thái hiện tại là “đo được và debug được tốt hơn”, còn chất lượng hội thoại vẫn cần cải thiện ở lịch sử dài phiên, câu so sánh nhiều sản phẩm, câu quá dài/nhiễu và tình huống user đổi ý liên tục. Benchmark1000 giúp phát hiện hồi quy, nhưng các lỗi thực tế từ UI phải tiếp tục được đưa ngược lại vào benchmark.

## Điểm Cần Được Benchmark Bắt Lỗi

| Vùng | Lỗi phải bắt | Cách kiểm |
| --- | --- | --- |
| Search | Trả sản phẩm lệch nhóm, vượt budget, nói có hàng khi không có | `expectedFamilies`, budget parser, product rail semantic check |
| Recommendation | Chọn rail ngoài candidate hoặc không liên quan | allowed ids, family match, history/cart state |
| Business RAG | Trả lời policy chung chung hoặc thiếu nguồn nội bộ | `policy_answer`, RAG context, blackboard evidence |
| Cart | Add/remove/update sai entity hoặc guest vẫn mutate | cart trace, tool result, after cart summary |
| History | Nhầm “cái đó/mẫu trên/rẻ hơn” sau nhiều lượt | history-agent trace, selectedProductIds/resolvedProductIds |
| Response | Lộ pipeline, product id nội bộ, stack trace | text quality evaluator |
| Dashboard | Thiếu node/edge/playback/tool result | trace shape evaluator |

## Tiêu Chuẩn Pass

Một câu chỉ pass khi đúng câu hỏi chính, đúng evidence, đúng agent/tool và không lộ thông tin nội bộ. Nếu thiếu thông tin bắt buộc, chatbot được hỏi làm rõ nhưng phải ngắn và vẫn đưa hướng tạm thời nếu dữ liệu hiện có đủ.

## Benchmark Hiện Tại

Benchmark chính là Benchmark1000 trong `tests/backend tests/benchmark1000`. Các benchmark 20/30/100 câu cũ đã được dọn khỏi thư mục `tests/` để tránh nhiễu evidence.

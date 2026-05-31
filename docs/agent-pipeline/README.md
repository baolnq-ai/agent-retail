# Agent Pipeline Docs

- Cập nhật: 31-05-2026
- Phạm vi: tài liệu pipeline multi-agent đang chạy trong backend.

## Pipeline Hiện Tại

Pipeline hiện tại dùng Lead Orchestrator điều phối theo task, lưu trạng thái một lượt xử lý vào Task Blackboard, chỉ gọi agent/tool khi cần evidence. Product search dùng catalog thật bằng keyword/facet/SKU/brand/category/budget. Embedding và rerank chỉ dùng trong Business RAG cho tài liệu nghiệp vụ nội bộ.

```text
User message
  -> Lead Orchestrator
  -> Task Blackboard
  -> History Agent nếu cần lịch sử
  -> Catalog Search Agent nếu cần sản phẩm
  -> Recommendation Agent nếu cần chọn product rail
  -> Business RAG Agent nếu cần chính sách/cửa hàng
  -> Cart Agent nếu cần thao tác giỏ hàng
  -> Evaluator Agent
  -> Response Agent
  -> Dashboard trace
```

## Tài Liệu Chính

| Tài liệu | Nội dung |
| --- | --- |
| [architecture/system-definition.md](architecture/system-definition.md) | Định nghĩa pipeline, agent boundary và contract hiện tại |
| [platform/dashboard-trace-visualization.md](platform/dashboard-trace-visualization.md) | Quy tắc dashboard trace |
| [agents/search-agent/design.md](agents/search-agent/design.md) | Catalog Search Agent: hard search, facet, SKU, budget, không embedding |
| [agents/recommendation-agent/design.md](agents/recommendation-agent/design.md) | Recommendation Agent: chọn product rail từ candidate hợp lệ |
| [agents/rag-agent/design.md](agents/rag-agent/design.md) | Business RAG Agent: embedding, Qdrant, rerank cho nghiệp vụ |
| [agents/cart-agent/design.md](agents/cart-agent/design.md) | Cart Agent: tool riêng, xác thực entity, mutate giỏ hàng an toàn |
| [agents/history-agent/design.md](agents/history-agent/design.md) | History Agent: truy xuất lịch sử theo yêu cầu cụ thể |
| [agents/customer-support-agent/design.md](agents/customer-support-agent/design.md) | Support Agent: bảo hành, đổi trả, khiếu nại, hậu mãi |

## Benchmark Liên Quan

Benchmark chính hiện tại: [tests/backend tests/benchmark1000](<../../tests/backend tests/benchmark1000/README.md>).

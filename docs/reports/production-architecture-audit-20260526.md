# Audit kiến trúc production 2026-05-26

- Trạng thái: completed
- Phạm vi: Docker Compose, database, vector search, ảnh sản phẩm, dashboard trace, readiness production.
- Log liên quan: `logs/security/production-architecture-audit-20260526.md`

## Kết luận

Dự án đã đủ rõ để chạy local/dev bằng một Docker Compose cho hạ tầng: PostgreSQL, Redis, Qdrant và nginx. Tuy nhiên chưa nên gọi là production-ready hoàn toàn vì runtime semantic search chưa query Qdrant thật, schema vector hiện còn lưu `ProductEmbedding.vector` dạng `Json`, và deploy production vẫn cần migration/versioning, observability, authz/rate limit và storage ảnh chuẩn hơn.

## Hạ tầng Docker

Compose hiện quản lý:

- `postgres`: dữ liệu chính cho catalog, user, cart, memory, audit.
- `redis`: cache/session phụ trợ.
- `qdrant`: vector DB mục tiêu cho product/doc chunks.
- `nginx`: một entry `7080` để tunnel web và API cùng origin.

Khuyến nghị tiếp theo:

- Thêm profile `app` để build API/Web thành container khi cần chạy toàn bộ app bằng Docker.
- Tách profile `dev` và `prod` để tránh dùng default credential/local port trong production.
- Dùng secret manager hoặc Docker secrets cho credential thật.

## Database và vector search

Hiện trạng thực tế:

- PostgreSQL đang là source of truth cho catalog/cart/user/memory.
- `SearchAgentService` đang load product từ PostgreSQL rồi score exact/lexical/semantic heuristic trong memory.
- Qdrant đã có trong Compose nhưng chưa được gọi trong runtime search.
- `ProductEmbedding.vector` hiện là `Json`, chưa phải vector index production.

Kiến trúc đúng cho production:

1. PostgreSQL giữ metadata, product row, audit, memory và document metadata.
2. Qdrant giữ vector của product chunks và knowledge chunks.
3. Embedding API tạo vector query.
4. Search/RAG gọi Qdrant để lấy candidate ids.
5. Backend lấy ids quay lại PostgreSQL để khóa fact, giá, tồn kho, ảnh, policy.
6. Rerank API chỉ chạy trên candidate set đã giới hạn.

## Bảng biểu hiện tại

Nhóm bảng chính:

- Account/session: `User`, `UserSession`.
- Catalog/search: `Product`, `ProductSearchDocument`, `ProductEmbedding`, `KnowledgeDocument`.
- Commerce: `Cart`, `CartItem`, `CartEvent`, `PendingCartAction`, `Order`, `PaymentIntent`, `IdempotencyKey`.
- Chat/memory: `ChatThread`, `ChatMessage`, `MemoryTurn`, `MemoryEvent`, `MemoryItem`, `MemorySummary`, `MemoryPreference`, `MemoryBehaviorSignal`, `MemoryAgentIndex`.
- Agent riêng: `CartAgentMemory`, `CartAgentInteraction`, `SearchAgentInteraction`, `SearchAgentMemory`.

Đánh giá:

- Tách domain khá rõ cho cart, memory, search interaction.
- Cần migration versioned trước production, không chỉ `prisma db push`.
- Cần index theo workload thật sau benchmark DB lớn.
- Cần quyết định rõ `ProductEmbedding`: bỏ nếu dùng Qdrant hoàn toàn, hoặc đổi sang pgvector nếu muốn vector trong PostgreSQL.

## Ảnh sản phẩm

Hiện seed dùng URL ảnh ngoài. Cách này ổn cho demo nhưng chưa tối ưu production vì phụ thuộc nguồn ngoài, license/cache không kiểm soát và có nguy cơ ảnh hỏng.

Khuyến nghị:

- Dùng object storage hoặc CDN riêng.
- Lưu `imageUrl`, `imageSource`, `alt`, checksum nếu có ingest.
- Có fallback image và kiểm tra broken image trong test frontend.
- Không hotlink nguồn ngoài cho production catalog.

## Dashboard trace

Dashboard nên tiếp tục bám nguyên tắc:

- Node chung: session context, task context, PostgreSQL, Qdrant, LLM nếu cùng một nguồn dùng chung.
- Node riêng theo agent: agent, history riêng, tool riêng theo từng lần gọi.
- Nếu hai agent gọi cùng tool nhưng là hai lần độc lập thì vẽ hai tool node riêng.
- Edge phải có chiều gọi và chiều trả về cho tool/agent/task, không để line chỉ đi một chiều nếu runtime đã có response.
- Cụm agent cần đủ gần để hiểu quan hệ, nhưng tool/history/DB không được dính sát làm che line.

## Readiness production

| Mảng | Đánh giá | Việc cần làm |
| --- | --- | --- |
| Runtime app | Dev/local tốt | Container hóa API/Web nếu cần deploy bằng Compose/Kubernetes |
| Data | PostgreSQL schema khá đầy đủ | Migration versioned, backup/restore, retention |
| Vector | Qdrant đã có hạ tầng | Ingest/query Qdrant thật, collection versioning |
| Security | Có redaction và cookie session | Rate limit, CORS production, authz audit, secret manager |
| Observability | Có logs và dashboard trace | Structured logs, metrics, alert, distributed trace |
| Test | Có benchmark và evidence | Thêm integration test Qdrant, Docker smoke test, load test |

## Quyết định

- Giữ PostgreSQL làm database chính.
- Dùng Qdrant cho vector search/RAG production target thay vì lưu vector search bằng `Json` trong PostgreSQL.
- Không tuyên bố production-ready cho semantic search cho đến khi Qdrant ingest/query thật được triển khai và benchmark.

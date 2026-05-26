# Plan: Structured sales agent, account cart, chat UX stability

## Mục tiêu

Nâng cấp hệ thống chat từ mô hình `LLM + regex action + heuristic product cards` thành structured sales agent có pipeline rõ ràng, thao tác giỏ hàng theo account thật, truy xuất sản phẩm chính xác hơn, UI chat ổn định và có test runtime kiểm chứng các luồng chính.

Phạm vi chính:

1. Fix chat popup scroll và layout interaction.
2. Loại bỏ guest/default cart khỏi chat pipeline.
3. Tách backend chat thành structured sales agent pipeline.
4. Nâng retrieval/ranking để product cards khớp câu trả lời.
5. Thêm tests cho agent/cart/recommendation behavior.

## Skill cần dùng

- `frontend-skill`: dùng cho Phase 1 vì sửa chat popup, responsive, interaction, accessibility.
- `frontend-design-skills`: dùng cho Phase 1 để giữ UX chat gọn, rõ, không scroll ngang toàn panel.
- `backend-skill`: dùng cho Phase 2, 3, 4 vì refactor service/controller/retrieval/tool execution.
- `security-skill`: cần áp dụng ở Phase 2 và 3 dù chưa có skill file được load riêng; nguyên tắc bắt buộc là cart mutation chỉ qua HttpOnly cookie, không localStorage token, không log cookie/session/password.
- `testing-skill`: cần áp dụng ở Phase 5; nếu chưa có skill file, vẫn phải viết test thật theo yêu cầu dự án.
- `logging-skill`: dùng sau mỗi phase để ghi log ngắn trong `logs/` theo quy tắc đã có.
- `documentation-skill`: nếu có skill tương ứng, dùng khi tổng kết task; nếu không có file skill, ghi documentation tối thiểu trong tài liệu task theo quy tắc người dùng đã yêu cầu.

## Success criteria

- Chat popup scroll dọc được trên desktop/mobile; auto-scroll xuống khi bot stream token; product cards không làm panel scroll ngang.
- Unauthenticated chat không còn cart thật/ảo/default trong backend response; mọi mutation trả thông điệp cần đăng nhập.
- Chat agent hiểu và xử lý tối thiểu các intent:
  - `recommend`
  - `compare`
  - `product_detail`
  - `policy`
  - `add_cart`
  - `remove_cart`
  - `clear_cart`
  - `update_quantity`
  - `checkout_help`
  - `smalltalk`
- Tool result là nguồn sự thật cho câu trả lời và UI blocks; product cards phải khớp sản phẩm được agent chọn.
- Runtime tests pass cho:
  - “tìm 2 sản phẩm dưới 2 triệu”
  - “thêm cả 2 vào giỏ”
  - “xoá hết giỏ”
  - “chưa login thì không có giỏ”
  - text answer và product cards khớp nhau.
- Existing frontend/backend tests vẫn pass.

## Phase 1 — Fix chat popup scroll and product-card containment

Thời gian dự kiến: 45-75 phút.

Tài nguyên/file chính:

- `apps/web/src/app/retail-client.tsx`
- `apps/web/src/app/styles.css`
- `apps/web/tests/home-content.test.mjs`
- Runtime browser/manual check nếu dev server chạy được.

Các bước:

1. Audit cấu trúc hiện tại của `RetailChatWidget` và CSS chat selectors.
2. Đổi panel chat sang flex column ổn định:
   - wrapper fixed size.
   - header/status cố định trên.
   - message list `flex: 1`, `min-height: 0`, `overflow-y: auto`.
   - composer cố định cuối panel.
3. Đảm bảo auto-scroll khi:
   - user gửi message.
   - stream token append.
   - final blocks append.
4. Đảm bảo product suggestion rail chỉ scroll/slide ngang trong rail/card container:
   - toàn chat panel không scroll ngang.
   - card width clamp rõ ràng.
   - nút prev/next không bị mất trên desktop/mobile.
5. Kiểm tra quick replies nhỏ gọn, không chiếm quá nhiều chiều cao.
6. Testing phase:
   - typecheck web.
   - frontend tests hiện có.
   - nếu runtime khả dụng: mở chat, gửi message dài, có cards, kiểm tra scroll.
7. Logging phase:
   - ghi log ngắn kết quả vào `logs/` theo logging-skill.
8. Documentation phase:
   - cập nhật note task nếu có docs task tương ứng; không tạo docs dư thừa nếu chưa cần.

Điều kiện pass để qua Phase 2:

- Chat scroll dọc hoạt động ổn định và tests web pass.

## Phase 2 — Remove guest/default cart from chat

Thời gian dự kiến: 45-60 phút.

Tài nguyên/file chính:

- `apps/api/src/services/agent.service.ts`
- `apps/api/src/services/commerce.service.ts`
- `apps/api/src/controllers/agent.controller.ts`
- Backend tests liên quan hoặc test mới.

Các bước:

1. Audit đoạn `prepareChat()` đang load cart:
   - authenticated: `getCurrentCart(userId)`.
   - unauthenticated: hiện còn khả năng `getCart(requestedCartId || 'default')`.
2. Sửa contract chat:
   - nếu không có `userId`, không load/mutate cart thật.
   - trả `account-required` empty cart summary hoặc không trả cart mutating state.
3. Bỏ/ignore `cartId` từ request chat nếu không còn cần cho account cart.
4. Mọi action `add_cart`, `remove_cart`, `clear_cart`, `update_quantity` phải kiểm tra user từ HttpOnly cookie trước.
5. Đảm bảo response không nói “đã thêm/xoá” nếu chưa login.
6. Testing phase:
   - test unauthenticated clear/add không mutate cart.
   - test authenticated cart vẫn mutate đúng current cart.
7. Logging phase:
   - ghi log ngắn kết quả.
8. Documentation phase:
   - ghi chú quyết định: chat cart là account-bound only.

Điều kiện pass để qua Phase 3:

- Không còn guest/default cart behavior trong chat và tests backend pass.

## Phase 3 — Structured sales agent pipeline

Thời gian dự kiến: 2-4 giờ.

Tài nguyên/file chính:

- `apps/api/src/services/agent.service.ts`
- Có thể thêm service/helper nội bộ nếu thật sự cần, ví dụ:
  - `sales-intent.service.ts`
  - `sales-tool.service.ts`
  - `sales-response.service.ts`
- `apps/api/src/models/agent.models.ts`
- Tests backend.

Nguyên tắc thiết kế:

- Không thêm abstraction quá mức; chỉ tách nếu giúp pipeline rõ và test được.
- Tool result là nguồn sự thật.
- Không để LLM tự claim đã mutate cart nếu tool chưa mutate.
- Nếu thiếu thông tin quan trọng, agent hỏi lại thay vì đoán.

Pipeline đề xuất:

```txt
request
  → auth context
  → intent classifier
  → constraint/entity extraction
  → planner
  → tool executor
  → grounded answer composer
  → UI block builder from tool results
  → save memory
```

Các bước:

1. Định nghĩa internal intent type:
   - `recommend`
   - `compare`
   - `product_detail`
   - `policy`
   - `add_cart`
   - `remove_cart`
   - `clear_cart`
   - `update_quantity`
   - `checkout_help`
   - `smalltalk`
2. Classifier ban đầu có thể deterministic nhưng phải structured và testable:
   - regex/token rules chỉ dùng để route intent, không tự tạo câu trả lời sai.
   - ưu tiên explicit cart verbs cho cart intents.
   - nếu request phức hợp: ví dụ “tìm 2 sản phẩm rồi thêm cả 2” → plan gồm recommend/search + add_cart.
3. Entity/constraint extraction:
   - số lượng sản phẩm cần recommend.
   - budget/max price.
   - category.
   - brand.
   - room size.
   - product references trong conversation/current recommendation.
4. Planner:
   - tạo ordered tool calls.
   - nếu thiếu product reference cho cart mutation thì trả clarification.
5. Tool executor:
   - `search_products`
   - `get_product_detail`
   - `compare_products`
   - `get_policy`
   - `get_cart`
   - `add_items`
   - `remove_item`
   - `clear_cart`
   - `update_quantity`
6. Answer composer:
   - prompt LLM với tool observations.
   - cấm claim ngoài tool result.
   - nếu tool đã mutate cart, text phải phản ánh đúng item/quantity/cart summary.
7. UI blocks:
   - `product_list` chỉ hiện khi intent cần đề xuất/so sánh/detail hoặc khi add_cart cần hiển thị items đã thêm.
   - Product cards lấy từ selected tool results, không lấy heuristic riêng.
   - `cart_summary` lấy từ cart tool result.
8. Memory:
   - lưu recent turns.
   - lưu selected/recommended product ids/category nếu thật sự hữu ích.
9. Testing phase:
   - unit/integration tests cho classifier/planner/tool execution nếu test framework hiện có cho phép.
   - backend chat tests cho các luồng chính.
10. Logging phase:
   - ghi log ngắn kết quả.
11. Documentation phase:
   - ghi lại pipeline mới và khác biệt với pipeline cũ.

Điều kiện pass để qua Phase 4:

- Structured pipeline xử lý đúng cart actions cơ bản và không spam product cards ngoài intent.

## Phase 4 — Retrieval and recommendation quality

Thời gian dự kiến: 1.5-3 giờ.

Tài nguyên/file chính:

- `apps/api/src/services/catalog.service.ts`
- `apps/api/src/services/model-gateway.service.ts`
- `apps/api/src/services/agent.service.ts`
- Seed data nếu cần nhưng không thêm dữ liệu vô tội vạ.

Các bước:

1. Audit search hiện tại:
   - token scoring.
   - max price parsing.
   - hardcoded boosts.
2. Chuẩn hoá constraint parsing:
   - budget dưới/trên/khoảng.
   - số lượng sản phẩm muốn xem.
   - category/category aliases.
   - room size.
   - brand.
3. Candidate retrieval:
   - lấy candidate đủ rộng từ catalog theo constraints.
   - không loại nhầm sản phẩm trước khi rerank.
4. Rerank:
   - dùng rerank để chọn top N cuối.
   - top N phải tôn trọng requested count.
5. Recommendation explanation:
   - mỗi sản phẩm đề xuất có reason ngắn dựa trên attributes/price/category.
6. Loại bỏ hardcoded product boost nếu không còn cần.
7. Testing phase:
   - “dưới 2 triệu” không trả sản phẩm > 2 triệu trong cards.
   - requested count 1/2/3 được tôn trọng.
   - text và cards lấy cùng selected products.
8. Logging phase:
   - ghi log ngắn kết quả.
9. Documentation phase:
   - ghi lại retrieval contract.

Điều kiện pass để qua Phase 5:

- Retrieval không còn mismatch rõ ràng giữa câu trả lời và cards trong các test chính.

## Phase 5 — Runtime tests and end-to-end validation

Thời gian dự kiến: 1.5-2.5 giờ.

Tài nguyên/file chính:

- `apps/api/tests/*` hoặc test location hiện có.
- `apps/web/tests/*`
- Có thể thêm runtime test script cho chat nếu pattern hiện có hỗ trợ.
- `setup.sh`, `stop.sh` nếu cần chạy runtime.

Các bước:

1. Thêm backend tests cho:
   - unauthenticated add/clear cart returns login-required and no mutation.
   - authenticated add multiple products.
   - clear cart empties current account cart.
2. Thêm chat pipeline tests cho:
   - recommend 2 products under budget.
   - add both recommended products.
   - policy question does not spam product cards.
   - product cards match selected products.
3. Thêm/điều chỉnh web tests cho:
   - chat launcher/panel selectors.
   - scroll class/layout contract.
4. Runtime validation:
   - `corepack pnpm --filter @retail-agent/api test` nếu có.
   - `corepack pnpm --filter @retail-agent/web typecheck`.
   - `corepack pnpm --filter @retail-agent/web test`.
   - `corepack pnpm --filter @retail-agent/web test:runtime`.
   - Nếu cần: `bash setup.sh` và manual real HTTP check.
5. Logging phase:
   - ghi log kết quả tests.
6. Documentation phase:
   - tổng kết task: thay đổi, khó khăn, test đã chạy.

Điều kiện hoàn thành:

- Các test bắt buộc pass hoặc nếu môi trường/model service không khả dụng thì phải ghi rõ blocker thật, không tạo smoke/fallback pass.

## Rủi ro và cách kiểm soát

- Rủi ro: refactor agent quá lớn gây vỡ API stream.
  - Kiểm soát: giữ response event contract hiện tại nếu có thể; chỉ thay đổi source của blocks.
- Rủi ro: LLM output vẫn sai dù tool đúng.
  - Kiểm soát: composer dùng tool observations và UI blocks từ tool result; không để LLM quyết định cart state.
- Rủi ro: tests runtime cần backend/model thật.
  - Kiểm soát: phân biệt rõ unit/integration/runtime; không fake pass.
- Rủi ro: chat UI bị đơ vì overlay/scroll.
  - Kiểm soát: Phase 1 sửa riêng trước khi backend refactor.

## Thứ tự triển khai bắt buộc

1. Phase 1: chat popup scroll/layout.
2. Phase 2: bỏ guest/default cart khỏi chat.
3. Phase 3: structured sales agent pipeline.
4. Phase 4: retrieval/recommendation quality.
5. Phase 5: tests/runtime validation/documentation/logging.

Không chuyển phase nếu phase hiện tại chưa test tối thiểu theo success criteria.

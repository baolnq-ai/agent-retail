# Plan Frontend UI/UX Và Dashboard - Retail Chatbot Agent

- Ngày cập nhật: 2026-05-14
- Task name: `frontend-uiux-dashboard`
- Trạng thái: plan con cho customer chat UI và ops console

## 1. Mục tiêu

Thiết kế và triển khai frontend production-grade cho customer chat commerce UI và ops dashboard, có thẩm mỹ hiện đại, UX thực dụng, animation đúng chỗ, accessibility và performance tốt.

Frontend không phải chatbot text đơn giản. Đây là commerce journey UI có chat làm interface.

```txt
Need discovery
  -> Product discovery
  -> Product explanation/comparison
  -> Cart building
  -> Order confirmation
  -> Payment
  -> Tracking/support
  -> Handoff when needed
```

## 2. Dependencies

- Phụ thuộc: backend shared block schema, chat API, catalog API, cart/order/payment API.
- Liên quan: `plans/plan-backend-architecture-data.md`, `plans/plan-model-integration.md`.
- Block cho: E2E golden path, ops console validation, release readiness.

## 3. Required resources / prerequisites

- Frontend framework đã chốt, mặc định Next.js + TypeScript.
- Design system stack đã chốt: Tailwind CSS + shadcn/ui + Radix primitives.
- API base URL local/staging.
- Shared block schema từ backend/packages shared.
- Product sample images hoặc placeholder strategy.
- Playwright/browser testing setup.
- Nếu `testing-skill` chưa tồn tại, dùng checklist testing trong plan này.

## 4. Stack frontend khuyến nghị

- Framework: Next.js + TypeScript.
- Styling: Tailwind CSS.
- Component foundation: shadcn/ui + Radix primitives.
- Animation: Motion for React, dùng có kiểm soát.
- Server state: TanStack Query.
- Local state: Zustand hoặc reducer theo feature.
- Forms: React Hook Form + Zod.
- E2E: Playwright.
- Component/docs: Storybook nếu team cần design QA.

## 5. Visual direction

Hướng thẩm mỹ: premium retail SaaS + friendly AI assistant.

- Clean, spacious, card-based.
- Rounded corners 12-20px.
- Subtle shadow/elevation, tránh glassmorphism quá đậm.
- Neutral base + một accent brand mạnh.
- Product imagery nổi bật hơn text.
- Dark mode ưu tiên cho ops console; customer chat mặc định light mode.

Theme tokens tối thiểu:

```txt
color.background
color.surface
color.surfaceElevated
color.border
color.textPrimary
color.textSecondary
color.accent
color.accentForeground
color.success
color.warning
color.danger
color.info
radius.sm/md/lg/xl
space.1..12
shadow.card/popover/modal
motion.fast/base/slow
```

Typography:

- Font hỗ trợ tiếng Việt tốt: Inter, Be Vietnam Pro, Manrope hoặc Geist nếu verify ổn.
- Chat text 15-16px.
- Product title 14-16px semibold.
- Price 16-20px bold.
- Dashboard table 13-14px.
- Numeric/price dùng tabular numbers.

## 6. Customer Chat UI

### Layout desktop

```txt
Header: logo, status, help, cart icon
Left optional discovery/filter panel
Center chat transcript + composer
Right cart drawer/context panel
```

### Layout mobile

- Fullscreen chat.
- Cart as bottom sheet.
- Product cards horizontal carousel.
- Sticky composer.
- Payment/order confirmation as modal/bottom sheet.

### Core components

- `ChatShell`
- `MessageList`
- `MessageBubble`
- `AssistantThinkingState`
- `ChatComposer`
- `QuickReplies`
- `ProductCard`
- `ProductCarousel`
- `ProductComparisonTable`
- `CartDrawer`
- `CartLineItem`
- `OrderConfirmationCard`
- `PaymentActionCard`
- `OrderTrackingCard`
- `PolicyAnswerCard`
- `HandoffBanner`
- `ErrorRecoveryCard`

### Message block schema

Frontend chỉ render block backend trả về:

```txt
text
product_card
product_list
product_comparison
cart_summary
order_draft
payment_action
tracking_status
policy_answer
quick_replies
handoff
form_request
error_recovery
```

Mỗi block có `version`:

```json
{
  "type": "product_list",
  "version": 1,
  "items": []
}
```

Frontend không parse HTML tự do từ model.

### Product card UX

Product card cần có:

- Ảnh.
- Tên.
- Giá hiện tại + giá gốc nếu giảm.
- Badge: còn hàng, bán chạy, khuyến mãi, phù hợp nhu cầu.
- Variant chính.
- Rating/review nếu có.
- Lý do đề xuất ngắn.
- CTA: xem chi tiết, thêm vào giỏ, so sánh, sản phẩm tương tự.

### Cart và checkout UX

Cart drawer/bottom sheet phải hiển thị:

- Sản phẩm trong giỏ.
- Số lượng có thể chỉnh.
- Giá từng dòng.
- Voucher/discount.
- Shipping estimate.
- Tổng tiền.
- Lỗi tồn kho/giá thay đổi.
- CTA: tiếp tục mua, xác nhận đơn.

Trước khi tạo/sửa/huỷ đơn phải có confirmation card rõ:

- Items.
- Quantity.
- Address.
- Shipping.
- Payment method.
- Total.
- Terms/policy summary.
- Buttons: chỉnh sửa, xác nhận.

## 7. Ops Console/Dashboard

### Layout

```txt
Sidebar
  Dashboard
  Conversations
  Orders
  Products
  Knowledge
  Payments
  Customers
  Analytics
  Settings

Topbar
  Search, environment, user menu, notifications

Main content
  Page-specific views
```

### Dashboard overview

Cards:

- Total conversations today.
- Bot resolution rate.
- Handoff rate.
- Conversion rate chat -> cart -> order.
- Revenue assisted by agent.
- Payment success rate.
- Average response latency.
- Model error/fallback rate.

Charts/tables:

- Conversation volume over time.
- Funnel: chat -> product click -> cart add -> order -> paid.
- Top intents.
- Top searched products/categories.
- Failed tool calls by tool.
- Handoff reasons.
- Model latency p50/p95.
- Recent high-priority conversations.
- Failed payments.
- Orders needing attention.
- Low inventory products frequently recommended.

### Conversation management

Detail view phải có:

- Transcript.
- AI summary.
- Current cart.
- Linked order/payment.
- Tool calls timeline.
- Safety flags.
- Internal notes.
- Takeover/release button.

### Product/knowledge admin

MVP nên có:

- Product table with search/filter.
- Product detail read-only hoặc edit basic metadata nếu cần.
- Inventory status.
- Knowledge documents list.
- Ingestion status.
- Retrieval test playground.

### Payment/order admin

Order detail cần có:

- Items snapshot.
- Customer/shipping.
- Payment intent/events.
- Order event timeline.
- Audit log.
- Conversation link.

## 8. Animation và interaction

Dùng animation để giải thích trạng thái, không trang trí quá mức.

Nên dùng:

- Streaming text smooth nhưng không quá nhanh.
- Skeleton cho product cards.
- Drawer open/close.
- Cart item add/update micro animation.
- Toast nhẹ khi thêm giỏ.
- Layout transition khi product list/ranking thay đổi.
- Handoff status transition.

Không nên:

- Parallax nặng.
- Auto-playing animation gây mất tập trung.
- Animation trên table lớn.
- Motion không tôn trọng `prefers-reduced-motion`.

## 9. Accessibility

Bắt buộc:

- Alt text ảnh sản phẩm.
- Contrast tốt.
- Không chỉ dùng màu để báo trạng thái.
- Keyboard navigation đầy đủ cho chat, drawer, modal, table, filters.
- Label rõ, error rõ.
- Confirmation trước action nhạy cảm.
- Semantic HTML.
- Focus visible.
- Dialog focus trap đúng.
- Screen reader announcement cho message mới nhưng không spam.
- Touch target >= 44px trên mobile.
- Reduced motion support.
- Chart có text summary.

## 10. Performance frontend

- Next Image cho product images.
- Virtualize transcript dài và admin tables.
- Lazy load heavy dashboard charts.
- Code split ops console khỏi customer chat.
- SSE streaming cho chat; WebSocket chỉ khi cần staff realtime mạnh.
- Optimistic UI cho cart nhưng luôn reconcile với backend.
- Cache API bằng TanStack Query.
- Avoid re-render toàn transcript khi token stream.

## 11. Sample screens cần thiết kế

Customer:

1. Welcome/need discovery.
2. Product recommendation result.
3. Product comparison.
4. Cart drawer.
5. Order confirmation.
6. Payment link.
7. Order tracking.
8. Handoff to human.
9. Error recovery.

Ops:

1. Dashboard overview.
2. Conversation inbox.
3. Conversation detail/takeover.
4. Order detail.
5. Payment event detail.
6. Product catalog table.
7. Knowledge retrieval playground.
8. Settings/model health.

## 12. Phase thực hiện

### Phase 1. Design system foundation

- Thời gian: 1 ngày.
- Dependencies: frontend app skeleton.
- Skills cần đọc trước: `frontend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - Setup Tailwind, shadcn/Radix, tokens, typography, theme.
  - Base layout và theme provider.
- Testing bắt buộc:
  - Base components render light/dark.
  - Keyboard/focus basic checks.
- Documentation bắt buộc:
  - Document theme tokens and component convention.
- Logging bắt buộc:
  - Log setup/test result.
- Pass criteria:
  - Base components render đúng và accessible cơ bản.

### Phase 2. Customer chat shell

- Thời gian: 1-2 ngày.
- Dependencies: block schema mock.
- Skills cần đọc trước: `frontend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - Chat layout.
  - Composer.
  - Streaming state.
  - Message block renderer.
- Testing bắt buộc:
  - Mocked conversation renders all block types.
  - Mobile layout check.
  - No raw HTML render from model content.
- Documentation bắt buộc:
  - Document block rendering behavior.
- Logging bắt buộc:
  - Log UI test result and screenshots path if available.
- Pass criteria:
  - Mocked conversation render đầy đủ block chính.

### Phase 3. Commerce blocks

- Thời gian: 1-2 ngày.
- Dependencies: product/cart/order block contracts.
- Skills cần đọc trước: `frontend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - Product cards.
  - Comparison.
  - Cart drawer.
  - Order confirmation.
  - Payment card.
- Testing bắt buộc:
  - Component tests.
  - Mobile responsive.
  - Accessibility checks.
- Documentation bắt buộc:
  - Document commerce block props and states.
- Logging bắt buộc:
  - Log component test result.
- Pass criteria:
  - Commerce blocks usable on desktop/mobile.

### Phase 4. API integration

- Thời gian: 1-2 ngày.
- Dependencies: backend chat/cart/order APIs.
- Skills cần đọc trước: `frontend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - TanStack Query/SSE integration.
  - Error recovery.
  - Optimistic cart with reconciliation.
- Testing bắt buộc:
  - E2E against backend.
  - Error state and retry.
  - UTF-8 Vietnamese render.
- Documentation bắt buộc:
  - Document API integration and env vars.
- Logging bắt buộc:
  - Log E2E and browser verification.
- Pass criteria:
  - Golden path chat -> recommend -> add cart -> confirm works.

### Phase 5. Ops console

- Thời gian: 2-3 ngày.
- Dependencies: admin APIs, RBAC.
- Skills cần đọc trước: `frontend-skill`, `backend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - Dashboard.
  - Conversation management.
  - Order/payment views.
  - Takeover workflow.
- Testing bắt buộc:
  - Staff workflow E2E.
  - RBAC UI behavior.
  - Dashboard data correctness.
- Documentation bắt buộc:
  - Document ops flows and metric definitions.
- Logging bắt buộc:
  - Log staff E2E result.
- Pass criteria:
  - Staff xử lý được handoff/case lỗi.

### Phase 6. Polish/hardening

- Thời gian: 1-2 ngày.
- Dependencies: Phase 1-5.
- Skills cần đọc trước: `frontend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - Animation polish.
  - Accessibility fixes.
  - Performance optimization.
  - Visual QA.
- Testing bắt buộc:
  - Lighthouse/Core Web Vitals smoke.
  - axe accessibility.
  - Mobile viewport tests.
  - Manual browser verification.
- Documentation bắt buộc:
  - Document known UI limitations if any.
- Logging bắt buộc:
  - Log performance/accessibility result.
- Pass criteria:
  - Lighthouse/accessibility thresholds đạt mức đã chốt.

## 13. Definition of Done

- Customer golden path pass trên desktop/mobile.
- Ops staff workflow pass.
- Accessibility checks pass.
- UI không render raw HTML từ model.
- UTF-8 tiếng Việt render đúng.
- Performance smoke đạt threshold.
- Documentation và logs được cập nhật.

## 14. Rủi ro

- UI quá giống chatbot text -> phải render commerce blocks ngay từ đầu.
- Dashboard nhồi quá nhiều metrics -> ưu tiên actionable metrics.
- Animation gây chậm/rối -> dùng motion nhỏ và đo performance.
- Product card thiếu CTA -> card phải dẫn được tới hành động mua hàng.

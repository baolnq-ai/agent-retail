# Log coding frontend - 2026-05-29

## Nội dung đã làm
- Đọc lại `plan-skill` và `frontend-skill`.
- Khóa lại CSS cuối file cho home để rule cũ không đè ngược thiết kế mới.
- Giữ home theo hướng video-led: sản phẩm ở trung tâm, nền xanh đen, copy nhỏ, navbar mảnh, animation đổi frame mượt.
- Chuyển home carousel sang `HomeProductShowcase` client component để nút trước/sau bấm được thật.
- Mở home thành full-bleed để không còn mảng màu container đối chọi với nền ngoài.
- Thêm scrim nhẹ cho metadata sản phẩm, giảm cỡ chữ và tránh mất chữ khi ảnh cùng tông.
- Đồng bộ navbar home/products về cùng style.
- Khôi phục light/dark mode rõ ràng cho home và chỉnh màu scrollbar theo theme.
- Chuyển các chip deal strip thành link thật: `/products` và `/cart`.
- Thêm animation vào trang/section cho catalog và các section storefront.
- Giảm tiếp headline catalog sản phẩm để không còn cảm giác title lớn.
- Sửa reasoning/loading animation của chatbot: thêm class `.busy`, progress shimmer, panel sheen và dot flow độc lập với stream token.
- Sửa home bị vỡ size trên mobile: khóa `commerce-main:has(.product-led-home)` về block layout, ép hero/stage/image/search không vượt viewport, kiểm tra lại `scrollWidth = clientWidth`.
- Sửa mobile home hết lệch ngang và không còn hero/title bị cắt.
- Giữ products page dạng banner/list, chỉ chỉnh copy và giảm headline catalog cho chuyên nghiệp hơn.

## Kiểm tra
- `corepack pnpm --filter @retail-agent/web test`: pass 4/4.
- `corepack pnpm --filter @retail-agent/web typecheck`: pass.
- Chụp evidence desktop/mobile tại `tests/frontend tests/video-led-home-refinement-20260529/`.
 
## Final viewport/nav pass
- Khoa lai horizontal page overflow bang `overflow-x: clip` cho html/body/app shell.
- Ep home desktop thanh full-bleed 100vw, khong con nen bi dong trong app-shell 1500px.
- Dat lai home slide vao lane 1180px, dua nut previous/next ra ngoai lane noi dung va can giua theo viewport.
- Dong bo navbar bang rule chung cho home/products/detail, mobile van dung cung mot shell component.
- Giam catalog headline, khoa grid/filter/detail bang `minmax(0, ...)` de product/list/detail khong tran.
- Do Playwright: `/`, `/products`, `/products/prod_smart_10` desktop/mobile deu `scrollWidth = clientWidth`; next arrow tren home doi slide thanh cong.

## Navbar/button alignment pass
- Dong bo navbar home/products/detail bang cung grid columns, width, height, font size va uppercase style.
- Reset gap/padding cua brand de home va products khong lech logo/text.
- Doi arrow home sang hai stroke tuyet doi o tam nut, tranh border xoay bi lech thi giac.
- An arrow tren mobile de khong de len anh san pham.
- Mo overflow va dat min-height/line-height cho catalog toolbar, quick view, add-to-cart de nut khong bi cat.
- Do lai Playwright: desktop home/products/detail navbar cung `left=196`, `top=14`, `width=1180`, `height=58`; mobile home/products cung `left=10`, `top=8`, `width=370`, `height=120`; clipped button list rong.

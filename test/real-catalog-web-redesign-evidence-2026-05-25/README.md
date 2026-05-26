# Real Catalog Web Redesign Evidence

- Date: 2026-05-25
- App: `http://127.0.0.1:7000`
- API: `http://127.0.0.1:7010`
- Scope: 100-product real catalog seed, product media/source metadata, compact commerce redesign, dark/light theme, responsive screenshots.

## Results

| Check | Result |
| --- | --- |
| Local seed | Passed: 100 products in Postgres |
| Product metadata | Passed: sampled products include `imageUrl` and `sourceUrl` |
| API typecheck/build/test | Passed: 94 API tests |
| Runtime catalog API | Passed: product/search/knowledge HTTP test |
| Web typecheck/test/build | Passed |
| Browser evidence | Passed with reviewed screenshots |

## Screenshots

### App
- [01-home-desktop-dark.png](app/01-home-desktop-dark.png) - desktop dark home with real product image, search, category pills, hero product.
- [02-products-desktop-light.png](app/02-products-desktop-light.png) - desktop light catalog with compact filters, real images, 100-product count.

### Responsive
- [03-home-1366x768.png](responsive/03-home-1366x768.png) - 16:9 desktop framing.
- [04-products-ipad-light.png](responsive/04-products-ipad-light.png) - tablet light catalog layout.
- [05-product-mobile-dark.png](responsive/05-product-mobile-dark.png) - mobile product detail with media, source ribbon, compact header.

## Notes

- The catalog uses sourced product names/prices/spec snapshots and stores source attribution in product attributes.
- Some product images are direct retailer CDN assets; broader category rows use real photography URLs where exact product media was not reliably reachable from the local shell.
- The UI is inspired by compact retail patterns from The Gioi Di Dong/Điện Máy Xanh but is not a clone.

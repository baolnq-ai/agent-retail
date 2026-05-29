import { productImageUrl, productSourceName, productSpec, productUseCase } from './product-media.js';
import { HomeProductShowcase } from './home-product-showcase.js';

interface Product {
  id: string;
  title: string;
  brand: string;
  category: string;
  price: number;
  currency: 'VND';
  inventory: number;
  attributes: Record<string, string>;
  description: string;
}

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:3110';

export default async function HomePage() {
  const products = await loadProducts();
  const featuredProducts = products.slice(0, 10);
  const heroProduct = featuredProducts[0];
  const heroSlides = featuredProducts.slice(0, 4);
  const spotlightProducts = featuredProducts.slice(1, 4);
  const categories = Array.from(new Set(products.map((product) => product.category))).slice(0, 7);
  const heroCategory = heroProduct?.category ?? 'Gia dụng chọn lọc';

  return (
    <>
      <section className="storefront-hero commerce-banner motion-stage product-led-home" aria-label="Trang chủ NTC Store">
        <div className="home-watermark" aria-hidden="true">{heroCategory}</div>
        <div className="home-showcase-nav" aria-label="Danh mục nổi bật">
          {categories.slice(0, 5).map((category) => <a href={`/products?category=${encodeURIComponent(category)}`} key={category}>{category}</a>)}
        </div>

        <HomeProductShowcase products={heroSlides} />
        <div className="home-utility-panel">
          <form className="storefront-search" action="/products">
            <input name="q" aria-label="Tìm sản phẩm" placeholder="Tìm sản phẩm, thương hiệu, nhu cầu..." />
            <button type="submit">Tìm</button>
          </form>
          <div className="stage-mini-products" aria-label="Gợi ý nhanh">
            {spotlightProducts.map((product) => (
              <a href={`/products/${product.id}`} key={product.id}>
                <img src={productImageUrl(product)} alt={product.title} />
                <span>{product.category}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="deal-strip retail-marquee" aria-label="Ưu đãi mua sắm">
        <div>
          <a className="deal-chip-active" href="/products"><strong>Hàng chọn lọc</strong></a>
          <a href="/products">Tư vấn theo nhu cầu</a>
          <a href="/products">So sánh nhanh</a>
          <a href="/cart">Giỏ hàng theo tài khoản</a>
          <a href="/products">Xem tất cả</a>
        </div>
      </section>

      <section className="home-product-carousel motion-carousel" aria-label="Sản phẩm đang được quan tâm">
        <div className="section-intro">
          <p className="commerce-kicker">Đang được quan tâm</p>
          <h2>Lướt nhanh vài lựa chọn nổi bật</h2>
          <a href="/products">Mở catalog</a>
        </div>
        <div className="carousel-track">
          {featuredProducts.slice(0, 5).map((product) => (
            <a className="carousel-card" href={`/products/${product.id}`} key={product.id}>
              <img src={productImageUrl(product)} alt={product.title} loading="lazy" />
              <span>{product.category}</span>
              <strong>{product.title}</strong>
            </a>
          ))}
        </div>
      </section>

      <section className="commerce-grid storefront-grid" aria-label="Sản phẩm nổi bật trên trang chủ">
        {featuredProducts.map((product) => (
          <article className="commerce-product-card" key={product.id}>
            <a className="commerce-product-media" href={`/products/${product.id}`}>
              <img src={productImageUrl(product)} alt={product.title} loading="lazy" />
            </a>
            <div className="product-card-body">
              <span className="product-category">{product.category}</span>
              <h2><a href={`/products/${product.id}`}>{product.title}</a></h2>
              <p>{productSpec(product)}</p>
            </div>
            <footer>
              <strong>{formatMoney(product.price)}</strong>
              <details className="product-popover">
                <summary>Xem nhanh</summary>
                <div>
                  <b>{productUseCase(product)}</b>
                  <span>Nguồn: {productSourceName(product)}</span>
                  <span>Còn {product.inventory} sản phẩm</span>
                </div>
              </details>
            </footer>
          </article>
        ))}
      </section>
    </>
  );
}

async function loadProducts(): Promise<Product[]> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/products`, { next: { revalidate: 20 } });
    if (!response.ok) throw new Error(`Không tải được sản phẩm: ${response.status}`);
    const payload = await response.json() as { items: Product[] };
    return payload.items;
  } catch {
    return [];
  }
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
}

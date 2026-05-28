import { productImageUrl, productSourceName, productSpec, productUseCase } from './product-media.js';

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

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:6810';

export default async function HomePage() {
  const products = await loadProducts();
  const featuredProducts = products.slice(0, 8);
  const heroProduct = featuredProducts[0];
  const categories = Array.from(new Set(products.map((product) => product.category))).slice(0, 6);

  return (
    <>
      <section className="storefront-hero" aria-label="Trang chủ NTC AI Retail">
        <div className="storefront-hero-copy">
          <p className="eyebrow">NTC AI Retail</p>
          <h1>Catalog gia dụng vận hành cùng retail agent.</h1>
          <p className="hero-lead">Tra cứu sản phẩm, kiểm tồn kho, thao tác giỏ hàng và theo dõi pipeline AI từ cùng một hệ thống bán lẻ.</p>
          <form className="storefront-search" action="/products">
            <input name="q" aria-label="Tìm sản phẩm" placeholder="Tìm máy lọc, robot hút bụi, nồi chiên..." />
            <button type="submit">Tìm</button>
          </form>
          <a className="primary-commerce-link hero-cta" href="/products">Mua sắm ngay</a>
          <div className="home-category-row" aria-label="Danh mục nổi bật">
            {categories.map((category) => <a href={`/products?category=${encodeURIComponent(category)}`} key={category}>{category}</a>)}
          </div>
        </div>

        {heroProduct ? (
          <a className="hero-product-tile" href={`/products/${heroProduct.id}`} aria-label={`Xem ${heroProduct.title}`}>
            <img src={productImageUrl(heroProduct)} alt={heroProduct.title} />
            <span>{heroProduct.category}</span>
            <strong>{heroProduct.title}</strong>
            <em>{formatMoney(heroProduct.price)}</em>
          </a>
        ) : (
          <aside className="hero-product-tile empty-state">Danh sách sản phẩm đang được cập nhật.</aside>
        )}
      </section>

      <section className="deal-strip" aria-label="Năng lực hệ thống">
        <strong>Catalog retail có kiểm tồn</strong>
        <span>Chat agent bám dữ liệu sản phẩm và giỏ hàng</span>
        <span>Dashboard trace cho từng lượt xử lý</span>
        <a href="/products">Xem tất cả</a>
      </section>

      <section className="home-section-heading">
        <div>
          <p className="eyebrow">Đang nổi bật</p>
          <h2>Gợi ý nổi bật cho nhu cầu hằng ngày</h2>
        </div>
        <a href="/products">Xem danh mục</a>
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
                <summary>Chi tiết</summary>
                <div>
                  <b>{productUseCase(product)}</b>
                  <span>Dữ liệu catalog: {productSourceName(product)}</span>
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
    const response = await fetch(`${apiBaseUrl}/api/v1/products`, { cache: 'no-store' });
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

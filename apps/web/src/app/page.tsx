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

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:7010';

export default async function HomePage() {
  const products = await loadProducts();
  const featuredProducts = products.slice(0, 6);
  const categories = Array.from(new Set(products.map((product) => product.category))).slice(0, 5);
  const heroProduct = featuredProducts[0];

  return (
    <>
      <section className="home-hero-shell" aria-label="Trang chủ mua sắm hiện đại">
        <div className="home-hero-copy">
          <p className="eyebrow">Mua sắm xanh hiện đại</p>
          <h1>Mua sắm gia dụng thông minh, nhanh và đúng nhu cầu.</h1>
          <p>RetailHome tách rõ danh mục, chi tiết sản phẩm, tài khoản và giỏ hàng theo tài khoản để trải nghiệm giống một web bán hàng chuyên nghiệp.</p>
          <div className="home-hero-actions">
            <a className="primary-commerce-link" href="/products">Mua sắm ngay</a>
            <a className="secondary-commerce-link" href="/account">Đăng nhập để dùng giỏ</a>
          </div>
          <div className="home-category-row" aria-label="Danh mục nổi bật">
            {categories.map((category) => <a href={`/products?category=${encodeURIComponent(category)}`} key={category}>{category}</a>)}
          </div>
        </div>

        <aside className="home-hero-card" aria-label="Sản phẩm nổi bật">
          {heroProduct ? (
            <>
              <div className="home-hero-visual">{heroProduct.brand.slice(0, 2).toUpperCase()}</div>
              <p className="eyebrow">Sản phẩm nổi bật</p>
              <h2>{heroProduct.title}</h2>
              <p>{heroProduct.description}</p>
              <strong>{formatMoney(heroProduct.price)}</strong>
              <a href={`/products/${heroProduct.id}`}>Xem chi tiết</a>
            </>
          ) : <p>Đang tải sản phẩm nổi bật.</p>}
        </aside>
      </section>

      <section className="home-commerce-strip" aria-label="Lợi ích mua sắm">
        <article>
          <strong>Giỏ hàng theo tài khoản</strong>
          <p>Không dùng giỏ demo khi chưa đăng nhập, mọi thao tác giỏ hàng đi theo cookie HttpOnly.</p>
        </article>
        <article>
          <strong>Catalog nhiều trang</strong>
          <p>Danh sách, chi tiết sản phẩm, tài khoản và giỏ hàng được tách route rõ ràng.</p>
        </article>
        <article>
          <strong>Trợ lý bán hàng AI</strong>
          <p>Chatbot hỗ trợ tư vấn và thao tác giỏ hàng dựa trên trạng thái backend thật.</p>
        </article>
      </section>

      <section className="home-section-heading">
        <div>
          <p className="eyebrow">Bộ sưu tập nổi bật</p>
          <h2>Sản phẩm đang được quan tâm</h2>
        </div>
        <a href="/products">Xem tất cả</a>
      </section>

      <section className="commerce-grid" aria-label="Sản phẩm nổi bật trên trang chủ">
        {featuredProducts.map((product) => (
          <article className="commerce-product-card" key={product.id}>
            <a className="commerce-product-visual" href={`/products/${product.id}`}>{product.brand.slice(0, 2).toUpperCase()}</a>
            <p>{product.category}</p>
            <h2><a href={`/products/${product.id}`}>{product.title}</a></h2>
            <strong>{formatMoney(product.price)}</strong>
            <span>Còn {product.inventory} sản phẩm</span>
            <a className="product-card-link" href={`/products/${product.id}`}>Chi tiết sản phẩm</a>
          </article>
        ))}
      </section>
    </>
  );
}

async function loadProducts(): Promise<Product[]> {
  const response = await fetch(`${apiBaseUrl}/api/v1/products`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Không tải được sản phẩm: ${response.status}`);
  const payload = await response.json() as { items: Product[] };
  return payload.items;
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
}

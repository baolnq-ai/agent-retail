import { AddToCartButton } from '../../add-to-cart-button.js';
import { productImageUrl, productSourceName, productSourceUrl, productSpec, productUseCase } from '../../product-media.js';

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

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await loadProduct(id);
  const related = (await loadProducts()).filter((item) => item.category === product.category && item.id !== product.id).slice(0, 4);

  return (
    <>
      <nav className="product-breadcrumb" aria-label="Breadcrumb">
        <a href="/products">Sản phẩm</a>
        <span>/</span>
        <a href={`/products?category=${encodeURIComponent(product.category)}`}>{product.category}</a>
      </nav>

      <section className="product-detail-shell">
        <div className="product-detail-media">
          <img src={productImageUrl(product)} alt={product.title} />
          <div className="source-ribbon">Dữ liệu catalog: {productSourceName(product)}</div>
        </div>
        <article className="product-detail-card">
          <p className="eyebrow">{product.category}</p>
          <h1>{product.title}</h1>
          <strong className="detail-price">{formatPrice(product.price)}</strong>
          <p className="detail-stock">Còn {product.inventory} sản phẩm</p>
          <p className="detail-summary">{product.description}</p>
          <div className="detail-trust-grid" aria-label="Cam kết mua hàng">
            <span>Đổi trả 7 ngày</span>
            <span>Bảo hành chính hãng</span>
            <span>Giỏ hàng theo tài khoản</span>
          </div>
          <AddToCartButton apiBaseUrl={apiBaseUrl} productId={product.id} label="Thêm vào giỏ hàng" />
          <section className="detail-specs" aria-label="Thông số nổi bật">
            <h2>Thông số nổi bật</h2>
            <dl className="detail-attributes">
              <div><dt>Điểm chính</dt><dd>{productSpec(product)}</dd></div>
              <div><dt>Phù hợp</dt><dd>{productUseCase(product)}</dd></div>
              <div><dt>Thương hiệu</dt><dd>{product.brand}</dd></div>
              <div><dt>Dữ liệu catalog</dt><dd><a href={productSourceUrl(product)} target="_blank" rel="noreferrer">{productSourceName(product)}</a></dd></div>
            </dl>
          </section>
        </article>
      </section>

      <section className="related-products">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow">Sản phẩm liên quan</p>
            <h2>Cùng danh mục</h2>
          </div>
          <a href="/products">Xem tất cả</a>
        </div>
        <div className="commerce-grid small-grid">
          {related.map((item) => (
            <article className="commerce-product-card" key={item.id}>
              <a className="commerce-product-media" href={`/products/${item.id}`}><img src={productImageUrl(item)} alt={item.title} loading="lazy" /></a>
              <div className="product-card-body">
                <h3><a href={`/products/${item.id}`}>{item.title}</a></h3>
                <p>{productSpec(item)}</p>
              </div>
              <footer><strong>{formatPrice(item.price)}</strong><a href={`/products/${item.id}`}>Chi tiết</a></footer>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

async function loadProduct(id: string): Promise<Product> {
  const response = await fetch(`${apiBaseUrl}/api/v1/products/${id}`, { next: { revalidate: 20 } });
  if (!response.ok) throw new Error(`Không tải được sản phẩm: ${response.status}`);
  return response.json() as Promise<Product>;
}

async function loadProducts(): Promise<Product[]> {
  const response = await fetch(`${apiBaseUrl}/api/v1/products`, { next: { revalidate: 20 } });
  if (!response.ok) throw new Error(`Không tải được sản phẩm liên quan: ${response.status}`);
  const payload = await response.json() as { items: Product[] };
  return payload.items;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

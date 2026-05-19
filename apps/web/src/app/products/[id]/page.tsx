import { AddToCartButton } from '../../add-to-cart-button.js';

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

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await loadProduct(id);
  const related = (await loadProducts()).filter((item) => item.category === product.category && item.id !== product.id).slice(0, 3);

  return (
    <>
      <section className="product-detail-shell">
        <div className="product-detail-visual">{product.brand.slice(0, 2).toUpperCase()}</div>
        <article className="product-detail-card">
          <p className="eyebrow">{product.category}</p>
          <h1>{product.title}</h1>
          <p>{product.description}</p>
          <strong className="detail-price">{formatPrice(product.price)}</strong>
          <p className="detail-stock">Còn {product.inventory} sản phẩm</p>
          <AddToCartButton apiBaseUrl={apiBaseUrl} productId={product.id} label="Thêm vào giỏ hàng" />
          <dl className="detail-attributes">
            {Object.entries(product.attributes).map(([key, value]) => (
              <div key={key}><dt>{key}</dt><dd>{value}</dd></div>
            ))}
          </dl>
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
              <a className="commerce-product-visual" href={`/products/${item.id}`}>{item.brand.slice(0, 2).toUpperCase()}</a>
              <h3><a href={`/products/${item.id}`}>{item.title}</a></h3>
              <footer><strong>{formatPrice(item.price)}</strong><a href={`/products/${item.id}`}>Chi tiết</a></footer>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

async function loadProduct(id: string): Promise<Product> {
  const response = await fetch(`${apiBaseUrl}/api/v1/products/${id}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Không tải được sản phẩm: ${response.status}`);
  return response.json() as Promise<Product>;
}

async function loadProducts(): Promise<Product[]> {
  const response = await fetch(`${apiBaseUrl}/api/v1/products`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Không tải được sản phẩm liên quan: ${response.status}`);
  const payload = await response.json() as { items: Product[] };
  return payload.items;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

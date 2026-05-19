import { AddToCartButton } from '../add-to-cart-button.js';

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

export default async function ProductsPage() {
  const products = await loadProducts();
  const categories = Array.from(new Set(products.map((product) => product.category))).slice(0, 8);

  return (
    <>
      <section className="catalog-hero">
        <p className="eyebrow">Catalog</p>
        <h1>Tất cả sản phẩm gia dụng thông minh</h1>
        <p>Lọc nhanh theo danh mục, xem tồn kho và mở trang chi tiết sản phẩm như một web bán hàng chuyên nghiệp.</p>
        <div className="category-pills">
          {categories.map((category) => <span key={category}>{category}</span>)}
        </div>
      </section>

      <section className="commerce-grid" aria-label="Danh sách sản phẩm">
        {products.map((product) => (
          <article className="commerce-product-card" key={product.id}>
            <a className="commerce-product-visual" href={`/products/${product.id}`}>{product.brand.slice(0, 2).toUpperCase()}</a>
            <div>
              <span>{product.category}</span>
              <h2><a href={`/products/${product.id}`}>{product.title}</a></h2>
              <p>{product.description}</p>
            </div>
            <footer>
              <strong>{formatPrice(product.price)}</strong>
              <a href={`/products/${product.id}`}>Chi tiết</a>
            </footer>
            <AddToCartButton apiBaseUrl={apiBaseUrl} productId={product.id} />
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

function formatPrice(value: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

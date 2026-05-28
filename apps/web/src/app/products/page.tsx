import { AddToCartButton } from '../add-to-cart-button.js';
import { productImageUrl, productSourceName, productSpec, productUseCase } from '../product-media.js';

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

export default async function ProductsPage({ searchParams }: { searchParams?: Promise<{ category?: string; q?: string }> }) {
  const products = await loadProducts();
  const params = await searchParams;
  const selectedCategory = params?.category;
  const query = params?.q?.trim().toLocaleLowerCase('vi-VN') ?? '';
  const categories = Array.from(new Set(products.map((product) => product.category))).slice(0, 8);
  const visibleProducts = products
    .filter((product) => !selectedCategory || product.category === selectedCategory)
    .filter((product) => !query || `${product.title} ${product.brand} ${product.category} ${product.description} ${Object.values(product.attributes).join(' ')}`.toLocaleLowerCase('vi-VN').includes(query));

  return (
    <>
      <section className="catalog-hero">
        <div>
          <p className="eyebrow">Danh mục sản phẩm</p>
          <h1>Tìm đúng thiết bị cho không gian của bạn.</h1>
          <p>Lọc nhanh theo nhu cầu, xem thông số quan trọng và kiểm tra tồn kho trước khi thêm vào giỏ hàng.</p>
        </div>
        <form className="catalog-search" action="/products">
          <input name="q" defaultValue={query} aria-label="Tìm trong danh mục" placeholder="lọc không khí 25m2, robot hút bụi..." />
          {selectedCategory ? <input type="hidden" name="category" value={selectedCategory} /> : null}
          <button type="submit">Tìm</button>
        </form>
        <div className="catalog-toolbar" aria-label="Bộ lọc sản phẩm">
          <a className={!selectedCategory ? 'active' : ''} href="/products">Tất cả</a>
          {categories.map((category) => <a className={selectedCategory === category ? 'active' : ''} href={`/products?category=${encodeURIComponent(category)}`} key={category}>{category}</a>)}
        </div>
        <p className="catalog-count">Đang hiển thị {visibleProducts.length} / {products.length} sản phẩm{selectedCategory ? ` trong ${selectedCategory}` : ''}.</p>
      </section>

      <section className="commerce-grid catalog-product-grid" aria-label="Danh sách sản phẩm">
        {visibleProducts.map((product) => (
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
              <strong>{formatPrice(product.price)}</strong>
              <details className="product-popover">
                <summary>Xem nhanh</summary>
                <div>
                  <b>{productUseCase(product)}</b>
                  <span>Dữ liệu catalog: {productSourceName(product)}</span>
                  <span>Tồn kho: {product.inventory}</span>
                </div>
              </details>
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

'use client';

import { useMemo, useState } from 'react';
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

interface ProductsClientProps {
  apiBaseUrl: string;
  initialProducts: Product[];
  initialCategory?: string;
  initialQuery?: string;
}

export function ProductsClient({ apiBaseUrl, initialProducts, initialCategory, initialQuery = '' }: ProductsClientProps) {
  const [selectedCategory, setSelectedCategory] = useState(initialCategory ?? '');
  const [query, setQuery] = useState(initialQuery);
  const categories = useMemo(() => Array.from(new Set(initialProducts.map((product) => product.category))).slice(0, 8), [initialProducts]);
  const featuredProduct = initialProducts[0];
  const heroRail = initialProducts.slice(1, 5);
  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi-VN');
    return initialProducts
      .filter((product) => !selectedCategory || product.category === selectedCategory)
      .filter((product) => !normalizedQuery || `${product.title} ${product.brand} ${product.category} ${product.description} ${Object.values(product.attributes).join(' ')}`.toLocaleLowerCase('vi-VN').includes(normalizedQuery));
  }, [initialProducts, query, selectedCategory]);

  function chooseCategory(category: string) {
    setSelectedCategory(category);
    const nextParams = new URLSearchParams();
    if (category) nextParams.set('category', category);
    if (query.trim()) nextParams.set('q', query.trim());
    window.history.replaceState(null, '', `/products${nextParams.size ? `?${nextParams}` : ''}`);
  }

  function updateQuery(value: string) {
    setQuery(value);
    const nextParams = new URLSearchParams();
    if (selectedCategory) nextParams.set('category', selectedCategory);
    if (value.trim()) nextParams.set('q', value.trim());
    window.history.replaceState(null, '', `/products${nextParams.size ? `?${nextParams}` : ''}`);
  }

  return (
    <>
      <section className="catalog-showcase catalog-motion-stage" aria-label="Mua sắm sản phẩm gia dụng">
        <div className="stage-grid" aria-hidden="true" />
        <div className="catalog-banner">
          <div className="catalog-banner-copy">
            <span className="commerce-kicker">Bộ sưu tập chọn lọc</span>
            <h1>Tìm đúng món cần mua trong vài thao tác.</h1>
            <p>Lọc theo nhu cầu, so sánh nhanh và mở chi tiết sản phẩm ngay trên cùng một trải nghiệm mua sắm.</p>
          </div>
          {featuredProduct ? (
            <a className="catalog-banner-product" href={`/products/${featuredProduct.id}`}>
              <img src={productImageUrl(featuredProduct)} alt={featuredProduct.title} />
              <span>{featuredProduct.category}</span>
              <strong>{featuredProduct.title}</strong>
            </a>
          ) : null}
          <div className="catalog-rail" aria-label="Sản phẩm gợi ý">
            {heroRail.map((product) => (
              <a href={`/products/${product.id}`} key={product.id}>
                <img src={productImageUrl(product)} alt={product.title} />
                <span>{product.category}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="catalog-filter-bar">
          <label className="catalog-live-search">
            <span>Tìm</span>
            <input value={query} onChange={(event) => updateQuery(event.target.value)} placeholder="máy lọc không khí, robot hút bụi..." />
          </label>
          <div className="catalog-toolbar" aria-label="Bộ lọc sản phẩm">
            <button type="button" className={!selectedCategory ? 'active' : ''} onClick={() => chooseCategory('')}>Tất cả</button>
            {categories.map((category) => (
              <button type="button" className={selectedCategory === category ? 'active' : ''} onClick={() => chooseCategory(category)} key={category}>{category}</button>
            ))}
          </div>
          <p className="catalog-count">{visibleProducts.length} sản phẩm phù hợp</p>
        </div>
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
                  <span>Nguồn: {productSourceName(product)}</span>
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

function formatPrice(value: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

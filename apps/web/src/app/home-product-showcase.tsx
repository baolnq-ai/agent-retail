'use client';

import { useEffect, useMemo, useState } from 'react';
import { productImageUrl, productSpec } from './product-media.js';

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

export function HomeProductShowcase({ products }: { products: Product[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeProduct = products[activeIndex];
  const slideCount = products.length;

  useEffect(() => {
    if (slideCount < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slideCount);
    }, 6200);
    return () => window.clearInterval(timer);
  }, [slideCount]);

  const stageLabel = useMemo(() => activeProduct ? `Sản phẩm nổi bật: ${activeProduct.title}` : 'Sản phẩm nổi bật', [activeProduct]);

  function moveSlide(direction: 1 | -1) {
    if (!slideCount) return;
    setActiveIndex((current) => (current + direction + slideCount) % slideCount);
  }

  if (!slideCount) {
    return (
      <div className="stage-product-stack home-product-stage" aria-label="Sản phẩm nổi bật">
        <aside className="hero-product-tile empty-state">Danh sách sản phẩm đang được cập nhật.</aside>
      </div>
    );
  }

  return (
    <div className="stage-product-stack home-product-stage" aria-label={stageLabel}>
      <button className="home-arrow home-arrow-left" type="button" aria-label="Sản phẩm trước" onClick={() => moveSlide(-1)}>‹</button>
      {products.map((product, index) => (
        <article className={`home-motion-slide${index === activeIndex ? ' is-active' : ''}`} key={product.id}>
          <a className="hero-product-tile stage-product-main" href={`/products/${product.id}`} aria-label={`Xem ${product.title}`}>
            <img src={productImageUrl(product)} alt={product.title} />
          </a>
          <div className="home-product-meta">
            <div>
              <span>{product.brand}</span>
              <h1>{product.title}</h1>
              <p>{productSpec(product)}</p>
            </div>
            <strong>{formatMoney(product.price)}</strong>
            <a href={`/products/${product.id}`}>Xem chi tiết</a>
          </div>
        </article>
      ))}
      <button className="home-arrow home-arrow-right" type="button" aria-label="Sản phẩm tiếp theo" onClick={() => moveSlide(1)}>›</button>
    </div>
  );
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { resolveBrowserApiBaseUrl } from '../browser-api-base-url.js';
import { productImageUrl } from '../product-media.js';

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

interface CartItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface Cart {
  id: string;
  version: number;
  items: CartItem[];
  subtotal: number;
  grandTotal: number;
  status: 'active' | 'ordered';
}

interface AuthUser {
  id: string;
  name: string;
}

interface CartClientProps {
  apiBaseUrl: string;
  initialProducts: Product[];
}

export function CartClient({ apiBaseUrl, initialProducts }: CartClientProps) {
  const resolvedApiBaseUrl = resolveBrowserApiBaseUrl(apiBaseUrl);
  const [authUser, setAuthUser] = useState<AuthUser | undefined>();
  const [cart, setCart] = useState<Cart | undefined>();
  const [statusText, setStatusText] = useState('Đang kiểm tra đăng nhập...');
  const [isBusy, setIsBusy] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;
    loadCart(isMounted);

    function handleCartChanged(event: Event) {
      const nextCart = (event as CustomEvent<Cart>).detail;
      if (nextCart?.items) {
        setCart(nextCart);
        setStatusText('Giỏ hàng vừa được cập nhật.');
      } else {
        void loadCart(true);
      }
    }

    window.addEventListener('retail-cart-changed', handleCartChanged);
    return () => {
      isMounted = false;
      window.removeEventListener('retail-cart-changed', handleCartChanged);
    };
  }, [resolvedApiBaseUrl]);

  async function loadCart(isMounted = true) {
    try {
      const auth = await getJson<{ user: AuthUser }>(`${resolvedApiBaseUrl}/api/v1/auth/me`);
      if (!isMounted) return;
      setAuthUser(auth.user);
      try {
        const nextCart = await getJson<Cart>(`${resolvedApiBaseUrl}/api/v1/cart/current`);
        if (!isMounted) return;
        setCart(nextCart);
        setStatusText('Đã tải giỏ hàng của bạn.');
      } catch (error) {
        if (!isMounted) return;
        setCart(undefined);
        setStatusText(error instanceof Error ? readCartError(error.message) : 'Không tải được giỏ hàng.');
      }
    } catch (error) {
      if (!isMounted) return;
      setAuthUser(undefined);
      setCart(undefined);
      setStatusText(error instanceof Error ? readCartError(error.message) : 'Bạn cần đăng nhập để xem giỏ hàng.');
    } finally {
      if (isMounted) setIsChecking(false);
    }
  }

  const cartRows = useMemo(() => (cart?.items ?? []).map((item) => ({
    item,
    product: initialProducts.find((product) => product.id === item.productId),
  })), [cart?.items, initialProducts]);

  async function removeItem(productId: string) {
    if (isBusy) return;
    setIsBusy(true);
    setStatusText('Đang xoá sản phẩm...');
    try {
      const nextCart = await deleteJson<Cart>(`${resolvedApiBaseUrl}/api/v1/cart/current/items/${encodeURIComponent(productId)}`);
      setCart(nextCart);
      setStatusText('Đã xoá sản phẩm khỏi giỏ hàng.');
      window.dispatchEvent(new CustomEvent('retail-cart-changed', { detail: nextCart }));
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : 'Không xoá được sản phẩm.');
    } finally {
      setIsBusy(false);
    }
  }

  async function clearCart() {
    if (isBusy) return;
    setIsBusy(true);
    setStatusText('Đang xoá toàn bộ giỏ hàng...');
    try {
      const nextCart = await deleteJson<Cart>(`${resolvedApiBaseUrl}/api/v1/cart/current/items`);
      setCart(nextCart);
      setStatusText('Đã xoá toàn bộ giỏ hàng.');
      window.dispatchEvent(new CustomEvent('retail-cart-changed', { detail: nextCart }));
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : 'Không xoá được giỏ hàng.');
    } finally {
      setIsBusy(false);
    }
  }

  if (isChecking) {
    return <section className="cart-page-shell"><div className="surface-card"><p>Đang tải giỏ hàng...</p></div></section>;
  }

  if (!authUser) {
    return (
      <section className="cart-page-shell cart-empty-layout">
        <div className="cart-hero-copy">
          <p className="eyebrow">Giỏ hàng tài khoản</p>
          <h1>Giỏ hàng theo tài khoản</h1>
          <p>{statusText}</p>
        </div>
        <aside className="checkout-card account-required-card">
          <h2>Cần đăng nhập</h2>
          <p>Đăng nhập để xem giỏ hàng, xoá sản phẩm, xoá toàn bộ giỏ, tạo đơn và thanh toán.</p>
          <a href="/account">Đăng nhập hoặc đăng ký</a>
        </aside>
      </section>
    );
  }

  return (
    <section className="cart-page-shell authenticated-cart-shell">
      <div className="cart-page-header">
        <div>
          <p className="eyebrow">Giỏ hàng tài khoản</p>
          <h1>Giỏ hàng của {authUser.name}</h1>
          <p>{statusText}</p>
        </div>
        <a className="secondary-commerce-link" href="/products">Tiếp tục mua sắm</a>
      </div>

      <div className="cart-content-grid">
        <div className="cart-list account-cart-list">
          {cartRows.length > 0 ? cartRows.map(({ item, product }) => (
            <article className="cart-row" key={item.productId}>
              <div className="cart-row-media">{product ? <img src={productImageUrl(product)} alt={product.title} loading="lazy" /> : 'SP'}</div>
              <div className="cart-row-copy">
                <strong>{product?.title ?? item.productId}</strong>
                <p>{product?.category ?? 'Sản phẩm'} · {item.quantity} × {formatPrice(item.unitPrice)}</p>
              </div>
              <span>{formatPrice(item.lineTotal)}</span>
              <button type="button" disabled={isBusy} onClick={() => void removeItem(item.productId)}>Xoá</button>
            </article>
          )) : <div className="empty-state"><strong>Giỏ hàng account này đang trống.</strong><a href="/products">Xem sản phẩm</a></div>}
        </div>

        <aside className="checkout-card cart-summary-card">
          <h2>Tóm tắt đơn hàng</h2>
          <dl>
            <div><dt>Tạm tính</dt><dd>{formatPrice(cart?.grandTotal ?? 0)}</dd></div>
            <div><dt>Số dòng</dt><dd>{cart?.items.length ?? 0}</dd></div>
            <div><dt>Mã giỏ hàng</dt><dd>{cart?.id ?? '—'}</dd></div>
          </dl>
          <button type="button" disabled={isBusy || !cartRows.length} onClick={() => void clearCart()}>Xoá toàn bộ giỏ</button>
        </aside>
      </div>
    </section>
  );
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'include' });
  const text = await response.text();
  if (!response.ok) throw new Error(text || `Yêu cầu thất bại ${response.status}`);
  return JSON.parse(text) as T;
}

async function deleteJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { method: 'DELETE', credentials: 'include' });
  const text = await response.text();
  if (!response.ok) throw new Error(text || `Yêu cầu thất bại ${response.status}`);
  return JSON.parse(text) as T;
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

function readCartError(message: string): string {
  if (message.includes('not authenticated') || message.includes('401')) return 'Bạn cần đăng nhập để xem giỏ hàng.';
  return `Không tải được giỏ hàng: ${message}`;
}

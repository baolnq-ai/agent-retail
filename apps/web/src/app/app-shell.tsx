'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { RetailChatWidget, type AuthUser, type Cart, type Product } from './retail-client.js';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:7010';
const emptyCart: Cart = { id: 'account-required', version: 0, items: [], subtotal: 0, grandTotal: 0, status: 'active' };

export function AppShell({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | undefined>();
  const [cart, setCart] = useState<Cart>(emptyCart);
  const [products, setProducts] = useState<Product[]>([]);
  const [statusText, setStatusText] = useState('Đang kiểm tra tài khoản...');

  async function refreshSession() {
    try {
      const auth = await getJson<{ user: AuthUser }>(`${apiBaseUrl}/api/v1/auth/me`);
      setAuthUser(auth.user);
      const currentCart = await getJson<Cart>(`${apiBaseUrl}/api/v1/cart/current`);
      setCart(currentCart);
      setStatusText(`Đang đăng nhập: ${auth.user.name}`);
    } catch {
      setAuthUser(undefined);
      setCart(emptyCart);
      setStatusText('Đăng nhập để dùng giỏ hàng theo tài khoản');
    }
  }

  async function refreshProducts() {
    try {
      const payload = await getJson<{ items: Product[] }>(`${apiBaseUrl}/api/v1/products`);
      setProducts(payload.items);
    } catch {
      setProducts([]);
    }
  }

  useEffect(() => {
    void refreshSession();
    void refreshProducts();

    function handleAuthChanged() {
      void refreshSession();
    }

    function handleCartChanged(event: Event) {
      const nextCart = (event as CustomEvent<Cart>).detail;
      if (nextCart?.items) setCart(nextCart);
      else void refreshSession();
    }

    window.addEventListener('retail-auth-changed', handleAuthChanged);
    window.addEventListener('retail-cart-changed', handleCartChanged);
    return () => {
      window.removeEventListener('retail-auth-changed', handleAuthChanged);
      window.removeEventListener('retail-cart-changed', handleCartChanged);
    };
  }, []);

  async function handleLogout() {
    try {
      await postJson(`${apiBaseUrl}/api/v1/auth/logout`, {});
    } finally {
      setAuthUser(undefined);
      setCart(emptyCart);
      setStatusText('Đã đăng xuất');
      window.dispatchEvent(new CustomEvent('retail-auth-changed'));
      if (window.location.pathname === '/cart') window.location.assign('/account');
    }
  }

  return (
    <div className="app-shell">
      <header className="commerce-header">
        <a className="commerce-brand" href="/"><span>R</span><strong>RetailHome</strong></a>
        <nav className="commerce-nav" aria-label="Điều hướng chính">
          <a href="/products">Sản phẩm</a>
          <a href="/agent-dashboard">Bảng điều khiển</a>
          <a href="/agent-settings">Cấu hình API</a>
          <a href="/cart">Giỏ hàng {authUser ? <span>{cart.items.length}</span> : null}</a>
        </nav>
        <div className="commerce-account-actions">
          {authUser ? (
            <>
              <span className="user-chip">{authUser.name}</span>
              <button type="button" onClick={() => void handleLogout()}>Đăng xuất</button>
            </>
          ) : <a className="login-link" href="/account">Đăng nhập / Đăng ký</a>}
        </div>
      </header>
      <main className="commerce-main">{children}</main>
      <RetailChatWidget
        apiBaseUrl={apiBaseUrl}
        initialProducts={products}
        authUser={authUser}
        cart={cart}
        onCartChange={(nextCart) => {
          setCart(nextCart);
          window.dispatchEvent(new CustomEvent('retail-cart-changed', { detail: nextCart }));
        }}
        onRequireLogin={(message) => setStatusText(message ?? 'Bạn cần đăng nhập để dùng giỏ hàng')}
      />
      <div className="global-status" aria-live="polite">{statusText}</div>
    </div>
  );
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'include' });
  const text = await response.text();
  if (!response.ok) throw new Error(text || `Yêu cầu thất bại ${response.status}`);
  return JSON.parse(text) as T;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || `Yêu cầu thất bại ${response.status}`);
  return (text ? JSON.parse(text) : {}) as T;
}

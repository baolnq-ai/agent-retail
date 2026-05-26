'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { resolveBrowserApiBaseUrl } from './browser-api-base-url.js';
import { RetailChatWidget, type AuthUser, type Cart, type Product } from './retail-client.js';

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:7010';
const emptyCart: Cart = { id: 'account-required', version: 0, items: [], subtotal: 0, grandTotal: 0, status: 'active' };

export function AppShell({ children }: { children: ReactNode }) {
  const apiBaseUrl = resolveBrowserApiBaseUrl(configuredApiBaseUrl);
  const [isAgentDashboard, setAgentDashboard] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | undefined>();
  const [cart, setCart] = useState<Cart>(emptyCart);
  const [products, setProducts] = useState<Product[]>([]);
  const [statusText, setStatusText] = useState('Đang kiểm tra tài khoản...');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  async function refreshSession() {
    try {
      const auth = await getJson<{ user: AuthUser }>(`${apiBaseUrl}/api/v1/auth/me`);
      setAuthUser(auth.user);
      try {
        const currentCart = await getJson<Cart>(`${apiBaseUrl}/api/v1/cart/current`);
        setCart(currentCart);
      } catch {
        setCart(emptyCart);
      }
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
    setAgentDashboard(window.location.pathname === '/agent-dashboard');
    const requestedTheme = new URL(window.location.href).searchParams.get('theme');
    const storedTheme = window.localStorage.getItem('retail-theme');
    const initialTheme = requestedTheme === 'light' || requestedTheme === 'dark'
      ? requestedTheme
      : storedTheme === 'light' || storedTheme === 'dark'
        ? storedTheme
      : window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    setTheme(initialTheme);
    document.documentElement.dataset.theme = initialTheme;
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

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem('retail-theme', nextTheme);
  }

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
        <a className="commerce-brand" href="/" aria-label="RetailHome"><span>RH</span><strong>RetailHome</strong></a>
        <nav className="commerce-nav" aria-label="Điều hướng chính">
          <a href="/products">Sản phẩm</a>
          <a href="/cart">Giỏ hàng{authUser ? <em>{cart.items.length}</em> : null}</a>
        </nav>
        <div className="commerce-account-actions">
          <button className="theme-toggle" type="button" onClick={toggleTheme}>{theme === 'dark' ? 'Sáng' : 'Tối'}</button>
          {authUser ? (
            <>
              <span className="user-chip">{authUser.name}</span>
              <button type="button" onClick={() => void handleLogout()}>Đăng xuất</button>
            </>
          ) : <a className="login-link" href="/account">Tài khoản</a>}
        </div>
      </header>
      <main className="commerce-main">{children}</main>
      {isAgentDashboard ? null : <RetailChatWidget
        apiBaseUrl={apiBaseUrl}
        initialProducts={products}
        authUser={authUser}
        cart={cart}
        onCartChange={(nextCart) => {
          setCart(nextCart);
          window.dispatchEvent(new CustomEvent('retail-cart-changed', { detail: nextCart }));
        }}
        onRequireLogin={(message) => setStatusText(message ?? 'Bạn cần đăng nhập để dùng giỏ hàng')}
      />}
      {isAgentDashboard ? null : <div className="global-status" aria-live="polite">{statusText}</div>}
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

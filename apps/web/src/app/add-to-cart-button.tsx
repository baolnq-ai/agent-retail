'use client';

import { useEffect, useState } from 'react';
import type { AuthUser, Cart } from './retail-client.js';

interface AddToCartButtonProps {
  apiBaseUrl: string;
  productId: string;
  label?: string;
}

export function AddToCartButton({ apiBaseUrl, productId, label = 'Thêm vào giỏ' }: AddToCartButtonProps) {
  const [authUser, setAuthUser] = useState<AuthUser | undefined>();
  const [isChecking, setIsChecking] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [statusText, setStatusText] = useState('');

  useEffect(() => {
    let isMounted = true;
    getJson<{ user: AuthUser }>(`${apiBaseUrl}/api/v1/auth/me`)
      .then((response) => {
        if (isMounted) setAuthUser(response.user);
      })
      .catch(() => {
        if (isMounted) setAuthUser(undefined);
      })
      .finally(() => {
        if (isMounted) setIsChecking(false);
      });
    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl]);

  async function handleAddToCart() {
    if (!authUser) {
      window.location.assign('/account');
      return;
    }
    setIsBusy(true);
    setStatusText('Đang thêm...');
    try {
      const cart = await postJson<Cart>(`${apiBaseUrl}/api/v1/cart/current/items`, { productId, quantity: 1 });
      window.dispatchEvent(new CustomEvent('retail-cart-changed', { detail: cart }));
      setStatusText('Đã thêm vào giỏ thật');
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : 'Không thêm được sản phẩm');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="add-to-cart-action">
      <button type="button" disabled={isChecking || isBusy} onClick={() => void handleAddToCart()}>{authUser ? label : 'Đăng nhập để thêm giỏ'}</button>
      {statusText ? <span>{statusText}</span> : null}
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
  return JSON.parse(text) as T;
}

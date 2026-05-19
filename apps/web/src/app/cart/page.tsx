import { CartClient } from './cart-client.js';

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

export default async function CartPage() {
  const products = await loadProducts();
  return <CartClient apiBaseUrl={apiBaseUrl} initialProducts={products} />;
}

async function loadProducts(): Promise<Product[]> {
  const response = await fetch(`${apiBaseUrl}/api/v1/products`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Không tải được sản phẩm: ${response.status}`);
  const payload = await response.json() as { items: Product[] };
  return payload.items;
}

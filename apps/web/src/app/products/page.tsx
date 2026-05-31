import { ProductsClient } from './products-client.js';

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

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:3110';

export default async function ProductsPage({ searchParams }: { searchParams?: Promise<{ category?: string; q?: string }> }) {
  const products = await loadProducts();
  const params = await searchParams;
  return <ProductsClient apiBaseUrl={apiBaseUrl} initialProducts={products} initialCategory={params?.category} initialQuery={params?.q ?? ''} />;
}

async function loadProducts(): Promise<Product[]> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/products`, { next: { revalidate: 20 } });
    if (!response.ok) throw new Error(`Không tải được sản phẩm: ${response.status}`);
    const payload = await response.json() as { items: Product[] };
    return payload.items;
  } catch {
    return [];
  }
}

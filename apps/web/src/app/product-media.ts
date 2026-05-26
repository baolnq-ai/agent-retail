export interface ProductMediaLike {
  id: string;
  title: string;
  brand: string;
  category: string;
  price: number;
  inventory: number;
  attributes: Record<string, string>;
  description?: string;
}

export function productImageUrl(product: ProductMediaLike): string {
  return product.attributes.imageUrl ?? '';
}

export function productSourceName(product: ProductMediaLike): string {
  return product.attributes.sourceName ?? 'Nguồn sản phẩm';
}

export function productSourceUrl(product: ProductMediaLike): string {
  return product.attributes.sourceUrl ?? '#';
}

export function productSpec(product: ProductMediaLike): string {
  return product.attributes.spec ?? product.description ?? product.category;
}

export function productUseCase(product: ProductMediaLike): string {
  return product.attributes.useCase ?? product.category.toLocaleLowerCase('vi-VN');
}

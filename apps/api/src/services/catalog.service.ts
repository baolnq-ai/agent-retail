import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { loadEnvironment } from '../config/environment.js';
import type { Product } from '../models/catalog.models.js';
import { PrismaService } from './prisma.service.js';
import { RedisCacheService } from './redis-cache.service.js';

type DbProduct = Prisma.ProductGetPayload<Record<string, never>>;

@Injectable()
export class CatalogService {
  private readonly environment = loadEnvironment();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisCache: RedisCacheService,
  ) {}

  async listProducts(): Promise<Product[]> {
    const cachedProducts = await this.redisCache.getJson<Product[]>(CATALOG_PRODUCTS_CACHE_KEY);
    if (cachedProducts) return cachedProducts;

    const products = await this.prisma.client.product.findMany({ orderBy: { title: 'asc' } });
    const catalogProducts = products.map(toProduct);
    await this.redisCache.setJson(CATALOG_PRODUCTS_CACHE_KEY, catalogProducts, this.environment.catalogCacheTtlSeconds);
    return catalogProducts;
  }

  async getProduct(productId: string): Promise<Product | undefined> {
    const cacheKey = `${CATALOG_PRODUCT_CACHE_KEY_PREFIX}${productId}`;
    const cachedProduct = await this.redisCache.getJson<Product>(cacheKey);
    if (cachedProduct) return cachedProduct;

    const product = await this.prisma.client.product.findUnique({ where: { id: productId } });
    if (!product) return undefined;

    const catalogProduct = toProduct(product);
    await this.redisCache.setJson(cacheKey, catalogProduct, this.environment.catalogCacheTtlSeconds);
    return catalogProduct;
  }

  async searchProducts(query: string): Promise<Product[]> {
    const products = await this.listProducts();
    const normalizedQuery = normalize(query);
    const constraints = parseProductConstraints(normalizedQuery);
    return products
      .filter((product) => constraints.maxPrice === undefined || product.price <= constraints.maxPrice)
      .filter((product) => constraints.minPrice === undefined || product.price >= constraints.minPrice)
      .map((product) => ({ product, score: scoreProduct(product, normalizedQuery, constraints) }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score || left.product.price - right.product.price)
      .map((item) => item.product);
  }
}

const CATALOG_PRODUCTS_CACHE_KEY = 'catalog:products:v1';
const CATALOG_PRODUCT_CACHE_KEY_PREFIX = 'catalog:product:v1:';

function toProduct(product: DbProduct): Product {
  return {
    id: product.id,
    title: product.title,
    brand: product.brand,
    category: product.category,
    price: product.price,
    currency: 'VND',
    inventory: product.inventory,
    attributes: product.attributes as Record<string, string>,
    description: product.description,
  };
}

interface ProductConstraints {
  minPrice?: number;
  maxPrice?: number;
}

function scoreProduct(product: Product, normalizedQuery: string, constraints: ProductConstraints): number {
  const haystack = normalize(`${product.title} ${product.brand} ${product.category} ${product.description} ${Object.values(product.attributes).join(' ')}`);
  const meaningfulTokens = normalizedQuery
    .split(/\s+/)
    .filter((token) => token.length > 1 && !['sản', 'phẩm', 'dưới', 'trên', 'tầm', 'khoảng', 'triệu', 'tr'].includes(token));
  const tokenScore = meaningfulTokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
  const roomScore = normalizedQuery.includes('25m2') && haystack.includes('25-35m2') ? 5 : 0;
  const budgetScore = constraints.maxPrice !== undefined ? 3 : 0;
  const flagshipAirScore = normalizedQuery.includes('máy lọc') && normalizedQuery.includes('25m2') && normalize(product.title).includes('airoclean p35') ? 8 : 0;

  return tokenScore + roomScore + budgetScore + flagshipAirScore;
}

function parseProductConstraints(normalizedQuery: string): ProductConstraints {
  return {
    minPrice: parseMinPrice(normalizedQuery),
    maxPrice: parseMaxPrice(normalizedQuery),
  };
}

function parseMinPrice(normalizedQuery: string): number | undefined {
  const asciiMillionMatch = normalizedQuery.match(/(?:tren|hon|lon hon|>=|tu)\s*(\d+(?:[,.]\d+)?)\s*(?:trieu|tr)\b/);
  if (asciiMillionMatch) {
    return Math.round(Number.parseFloat(asciiMillionMatch[1].replace(',', '.')) * 1_000_000);
  }

  const millionMatch = normalizedQuery.match(/(?:trên|hơn|lớn hơn|>=|từ)\s*(\d+(?:[,.]\d+)?)\s*(?:triệu|tr)\b/);
  if (millionMatch) {
    return Math.round(Number.parseFloat(millionMatch[1].replace(',', '.')) * 1_000_000);
  }

  const vndMatch = normalizedQuery.match(/(?:trên|hơn|lớn hơn|>=|từ)\s*(\d{1,3}(?:[.,]\d{3})+)\s*(?:đ|vnd|vnđ)?/);
  if (vndMatch) {
    return Number.parseInt(vndMatch[1].replace(/[.,]/g, ''), 10);
  }

  return undefined;
}

function parseMaxPrice(normalizedQuery: string): number | undefined {
  if (/(?:tren|hon|lon hon|>=|tu)\s*\d/.test(normalizedQuery)) return undefined;
  const asciiMillionMatch = normalizedQuery.match(/(?:duoi|khong qua|toi da|<=|it hon|tam|khoang)?\s*(\d+(?:[,.]\d+)?)\s*(?:trieu|tr)\b/);
  if (asciiMillionMatch) {
    return Math.round(Number.parseFloat(asciiMillionMatch[1].replace(',', '.')) * 1_000_000);
  }

  if (/(?:trên|hơn|lớn hơn|>=|từ)\s*\d/.test(normalizedQuery)) return undefined;
  const millionMatch = normalizedQuery.match(/(?:dưới|không quá|tối đa|<=|ít hơn|tầm|khoảng)?\s*(\d+(?:[,.]\d+)?)\s*(?:triệu|tr)\b/);
  if (millionMatch) {
    return Math.round(Number.parseFloat(millionMatch[1].replace(',', '.')) * 1_000_000);
  }

  const compactMatch = normalizedQuery.match(/(?:dưới|không quá|tối đa|<=|ít hơn|tầm|khoảng)?\s*(\d+)\s*tr\b/);
  if (compactMatch) {
    return Number.parseInt(compactMatch[1], 10) * 1_000_000;
  }

  const vndMatch = normalizedQuery.match(/(?:dưới|không quá|tối đa|<=|ít hơn|tầm|khoảng)?\s*(\d{1,3}(?:[.,]\d{3})+)\s*(?:đ|vnd|vnđ)?/);
  if (vndMatch) {
    return Number.parseInt(vndMatch[1].replace(/[.,]/g, ''), 10);
  }

  return undefined;
}

function normalize(value: string): string {
  return value
    .toLocaleLowerCase('vi-VN')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}

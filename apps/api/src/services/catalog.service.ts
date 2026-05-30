import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { loadEnvironment } from '../config/environment.js';
import type { Product } from '../models/catalog.models.js';
import { withTransientPrismaRetry } from '../utils/prisma-retry.js';
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

    const products = await withTransientPrismaRetry(() => this.prisma.client.product.findMany({ orderBy: { title: 'asc' } }));
    const catalogProducts = products.map(toProduct);
    await this.redisCache.setJson(CATALOG_PRODUCTS_CACHE_KEY, catalogProducts, this.environment.catalogCacheTtlSeconds);
    return catalogProducts;
  }

  async getProduct(productId: string): Promise<Product | undefined> {
    const cacheKey = `${CATALOG_PRODUCT_CACHE_KEY_PREFIX}${productId}`;
    const cachedProduct = await this.redisCache.getJson<Product>(cacheKey);
    if (cachedProduct) return cachedProduct;

    const product = await withTransientPrismaRetry(() => this.prisma.client.product.findUnique({ where: { id: productId } }));
    if (!product) return undefined;

    const catalogProduct = toProduct(product);
    await this.redisCache.setJson(cacheKey, catalogProduct, this.environment.catalogCacheTtlSeconds);
    return catalogProduct;
  }

  async searchProducts(query: string): Promise<Product[]> {
    const products = await this.listProducts();
    const normalizedQuery = normalize(query);
    const constraints = parseProductConstraints(normalizedQuery);
    const queryPlan = buildProductQueryPlan(normalizedQuery, products);
    const scopedProducts = products
      .filter((product) => constraints.maxPrice === undefined || product.price <= constraints.maxPrice)
      .filter((product) => constraints.minPrice === undefined || product.price >= constraints.minPrice)
      .filter((product) => productMatchesQueryPlan(product, queryPlan));

    const strictMatches = scopedProducts
      .map((product) => ({ product, score: scoreProduct(product, normalizedQuery, constraints, queryPlan, 'strict') }))
      .filter((item) => item.score > 0)
      .sort(sortScoredProducts);
    if (strictMatches.length > 0) return strictMatches.map((item) => item.product);

    const relaxedPlan = relaxQueryPlan(queryPlan);
    return products
      .filter((product) => constraints.maxPrice === undefined || product.price <= constraints.maxPrice)
      .filter((product) => constraints.minPrice === undefined || product.price >= constraints.minPrice)
      .filter((product) => productMatchesQueryPlan(product, relaxedPlan))
      .map((product) => ({ product, score: scoreProduct(product, `${normalizedQuery} ${relaxedPlan.expansion ?? ''}`, constraints, relaxedPlan, 'relaxed') }))
      .filter((item) => item.score > 0)
      .sort(sortScoredProducts)
      .map((item) => item.product);
  }
}

const CATALOG_PRODUCTS_CACHE_KEY = 'catalog:products:v1';
const CATALOG_PRODUCT_CACHE_KEY_PREFIX = 'catalog:product:v1:';

interface ProductConstraints {
  minPrice?: number;
  maxPrice?: number;
  roomSizeM2?: number;
}

interface ProductQueryPlan {
  expansion?: string;
  requiredBrand?: string;
  requiredFamily?: ProductFamily;
}

interface ProductFamily {
  key: 'air_purifier' | 'air_cooling' | 'rice_cooker' | 'air_fryer' | 'vacuum' | 'camera' | 'health_scale' | 'personal_care' | 'blender';
  expansion: string;
  productPattern: RegExp;
  intentPattern: RegExp;
  exactProductPattern?: RegExp;
}

type MatchMode = 'strict' | 'relaxed';

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

function buildProductQueryPlan(normalizedQuery: string, products: Product[]): ProductQueryPlan {
  const requiredFamily = detectProductFamily(normalizedQuery);
  const requiredBrand = detectBrandFacet(normalizedQuery, products);
  return { requiredBrand, requiredFamily, expansion: requiredFamily?.expansion };
}

function relaxQueryPlan(queryPlan: ProductQueryPlan): ProductQueryPlan {
  if (!queryPlan.requiredFamily) return queryPlan;
  return { ...queryPlan, requiredBrand: undefined };
}

function productMatchesQueryPlan(product: Product, queryPlan: ProductQueryPlan): boolean {
  if (queryPlan.requiredBrand && normalize(product.brand) !== queryPlan.requiredBrand) return false;
  if (queryPlan.requiredFamily && !productMatchesFamily(product, queryPlan.requiredFamily)) return false;
  return true;
}

function scoreProduct(product: Product, normalizedQuery: string, constraints: ProductConstraints, queryPlan: ProductQueryPlan, mode: MatchMode): number {
  const haystack = normalize(productText(product));
  const haystackTokens = new Set(haystack.split(/\s+/));
  const meaningfulTokens = queryTokens(normalizedQuery);
  const tokenScore = meaningfulTokens.reduce((score, token) => score + (haystackTokens.has(token) ? 2 : haystack.includes(token) && token.length >= 4 ? 1 : 0), 0);
  const familyScore = queryPlan.requiredFamily && productMatchesFamily(product, queryPlan.requiredFamily) ? 16 : 0;
  const exactProductScore = queryPlan.requiredFamily?.exactProductPattern?.test(haystack) ? 18 : 0;
  const needFitScore = scoreNeedFit(haystack, normalizedQuery);
  const brandScore = queryPlan.requiredBrand && normalize(product.brand) === queryPlan.requiredBrand ? 14 : 0;
  const roomScore = constraints.roomSizeM2 ? scoreRoomFit(haystack, constraints.roomSizeM2) : 0;
  const budgetScore = constraints.maxPrice !== undefined && (tokenScore > 0 || familyScore > 0 || brandScore > 0) ? 3 : 0;
  const relaxedPenalty = mode === 'relaxed' ? -4 : 0;
  return tokenScore + familyScore + exactProductScore + needFitScore + brandScore + roomScore + budgetScore + relaxedPenalty;
}

function sortScoredProducts(left: { product: Product; score: number }, right: { product: Product; score: number }): number {
  return right.score - left.score || left.product.price - right.product.price;
}

function detectProductFamily(normalizedQuery: string): ProductFamily | undefined {
  return PRODUCT_FAMILIES.find((family) => family.intentPattern.test(normalizedQuery));
}

function detectBrandFacet(normalizedQuery: string, products: Product[]): string | undefined {
  const brands = [...new Set(products.map((product) => normalize(product.brand)).filter((brand) => brand.length > 1))]
    .sort((left, right) => right.length - left.length);
  return brands.find((brand) => new RegExp(`(?:^|\\s)${escapeRegExp(brand)}(?:\\s|$)`).test(normalizedQuery));
}

function productMatchesFamily(product: Product, family: ProductFamily): boolean {
  return family.productPattern.test(normalize(productText(product)));
}

function productText(product: Product): string {
  return `${product.title} ${product.brand} ${product.category} ${product.description} ${Object.values(product.attributes).join(' ')}`;
}

function parseProductConstraints(normalizedQuery: string): ProductConstraints {
  return {
    minPrice: parseMinPrice(normalizedQuery),
    maxPrice: parseMaxPrice(normalizedQuery),
    roomSizeM2: parseRoomSize(normalizedQuery),
  };
}

function parseRoomSize(normalizedQuery: string): number | undefined {
  const match = normalizedQuery.match(/(\d+)\s*(?:m2|m²|m vuong|met vuong)\b/);
  return match ? Number.parseInt(match[1], 10) : undefined;
}

function scoreRoomFit(haystack: string, roomSizeM2: number): number {
  const rangeMatch = haystack.match(/(\d+)\s*-\s*(\d+)\s*m2/);
  if (rangeMatch) {
    const min = Number.parseInt(rangeMatch[1], 10);
    const max = Number.parseInt(rangeMatch[2], 10);
    if (roomSizeM2 >= min && roomSizeM2 <= max) return 8;
    if (Math.abs(roomSizeM2 - max) <= 5 || Math.abs(roomSizeM2 - min) <= 5) return 4;
  }
  const underMatch = haystack.match(/(?:duoi|toi da)\s*(\d+)\s*m2/);
  if (underMatch) {
    const max = Number.parseInt(underMatch[1], 10);
    if (roomSizeM2 <= max) return 6;
    if (roomSizeM2 <= max + 5) return 2;
  }
  if (roomSizeM2 >= 22 && /phong ngu vua|can ho can lam mat nhanh|phong khach thong thoang|30 lit|40 lit|45 lit|50 lit/.test(haystack)) return 4;
  return 0;
}

function scoreNeedFit(haystack: string, normalizedQuery: string): number {
  if (/(canh bao|bao dong|cua ra vao|cam bien|mo cua|theo doi cua)/.test(normalizedQuery)
    && /(cam bien cua|door|window sensor|aqara|matter|thread)/.test(haystack)) return 24;
  if (/(cham soc ca nhan|bo me|nguoi lon tuoi|de dung|it thao tac|suc khoe)/.test(normalizedQuery)
    && /(can suc khoe|can thong minh|body composition|beurer|ban chai|may say toc)/.test(haystack)) return 12;
  return 0;
}

function parseMinPrice(normalizedQuery: string): number | undefined {
  const millionMatch = normalizedQuery.match(/(?:tren|hon|lon hon|>=|tu)\s*(\d+(?:[,.]\d+)?)\s*(?:trieu|tr)\b/);
  if (millionMatch) return Math.round(Number.parseFloat(millionMatch[1].replace(',', '.')) * 1_000_000);

  const vndMatch = normalizedQuery.match(/(?:tren|hon|lon hon|>=|tu)\s*(\d{1,3}(?:[.,]\d{3})+)\s*(?:d|vnd|vnd)?/);
  return vndMatch ? Number.parseInt(vndMatch[1].replace(/[.,]/g, ''), 10) : undefined;
}

function parseMaxPrice(normalizedQuery: string): number | undefined {
  if (/(?:tren|hon|lon hon|>=|tu)\s*\d/.test(normalizedQuery)) return undefined;
  const millionMatch = normalizedQuery.match(/(?:duoi|khong qua|toi da|<=|it hon|tam|khoang)?\s*(\d+(?:[,.]\d+)?)\s*(?:trieu|tr)\b/);
  if (millionMatch) return Math.round(Number.parseFloat(millionMatch[1].replace(',', '.')) * 1_000_000);

  const compactMatch = normalizedQuery.match(/(?:duoi|khong qua|toi da|<=|it hon|tam|khoang)?\s*(\d+)\s*tr\b/);
  if (compactMatch) return Number.parseInt(compactMatch[1], 10) * 1_000_000;

  const vndMatch = normalizedQuery.match(/(?:duoi|khong qua|toi da|<=|it hon|tam|khoang)?\s*(\d{1,3}(?:[.,]\d{3})+)\s*(?:d|vnd|vnd)?/);
  return vndMatch ? Number.parseInt(vndMatch[1].replace(/[.,]/g, ''), 10) : undefined;
}

function queryTokens(value: string): string[] {
  return value
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token) && !/^\d+$/.test(token));
}

function normalize(value: string): string {
  return value
    .toLocaleLowerCase('vi-VN')
    .normalize('NFD')
    .replace(/[đĐ]/g, 'd')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const STOP_WORDS = new Set([
  'ban',
  'cho',
  'toi',
  'minh',
  'can',
  'muon',
  'tim',
  'kiem',
  'vai',
  've',
  'di',
  'tam',
  'khoang',
  'duoi',
  'tren',
  'hon',
  'san',
  'pham',
  'cai',
  'mon',
  'nha',
  'nguoi',
  'cua',
  'hang',
  'trieu',
  'tr',
]);

const PRODUCT_FAMILIES: ProductFamily[] = [
  {
    key: 'rice_cooker',
    expansion: 'noi com dien rice cooker nau com bep dien',
    intentPattern: /\b(noi com|rice cooker)\b/,
    productPattern: /\b(noi com|rice cooker)\b/,
    exactProductPattern: /\bnoi com dien\b/,
  },
  {
    key: 'air_fryer',
    expansion: 'noi chien lo chien khong dau air fryer chien nuong nha bep cua kinh',
    intentPattern: /\b(noi chien|lo chien|air fryer|bep nho|nau nhanh|nha moi nhan|me toi kho tinh)\b/,
    productPattern: /\b(noi chien|lo chien|air fryer)\b/,
  },
  {
    key: 'air_cooling',
    expansion: 'quat dieu hoa quat lam mat lam mat phong',
    intentPattern: /\b(may lanh|dieu hoa|air conditioner|cooling|lam mat|quat dieu hoa|quat lam mat|quat|nong|oi buc|oi nong|bi nong|bi oi|mua nong|tiet kiem dien)\b/,
    productPattern: /\b(quat|quat dieu hoa|quat lam mat|lam mat bay hoi|cooling|cool|30 lit|40 lit|45 lit|50 lit|remote|dao gio)\b/,
    exactProductPattern: /\b(quat dieu hoa|quat lam mat)\b/,
  },
  {
    key: 'vacuum',
    expansion: 'may hut bui robot hut bui hut bui cam tay ve sinh nha cua lau nha',
    intentPattern: /\b(hut bui|hut bui cam tay|robot hut|lau nha|vacuum|nha sach|lam sach nha|lam sach san|don nha|don dep|san nha|san gach|nen nha|long thu cung|toc rung|rung long|cho meo|meo|thu cung|ve sinh nha)\b/,
    productPattern: /\b(hut bui|hut bui cam tay|robot hut|ve sinh|lau nha|vacuum)\b/,
  },
  {
    key: 'air_purifier',
    expansion: 'may loc khong khi may loc kk loc bui hepa pm2 5 phong ngu phong khach tre so sinh',
    intentPattern: /\b(may loc|loc kk|may loc kk|loc khong khi|air purifier|bui|min|pm2|di ung|khong khi|mui|tre so sinh|be so sinh|em be|nom am|phong kin|phong ngu)\b/,
    productPattern: /\b(may loc|loc khong khi|loc khi|khong khi|hepa|pm2|air purifier)\b/,
    exactProductPattern: /\bmay loc khong khi\b/,
  },
  {
    key: 'camera',
    expansion: 'camera wifi an ninh quan sat trong nha cam bien cua bao qua dien thoai nha thue it khoan duc',
    intentPattern: /\b(camera|quan sat|an ninh|smart home|bao dong|canh bao|bao qua dien thoai|bao ve dien thoai|cua ra vao|cam bien|cam bien cua|qua app|dien thoai|it khoan duc|nha thue)\b/,
    productPattern: /\b(camera|wifi|an ninh|cam bien cua|cam bien|bao dong|doorbell|chuong hinh|aqara|tp-link|tapo|ezviz|imou|homekit|zigbee|matter|thread)\b/,
    exactProductPattern: /\b(camera|cam bien cua|doorbell|chuong hinh|aqara|tapo|ezviz|imou|homekit|zigbee|matter|thread)\b/,
  },
  {
    key: 'health_scale',
    expansion: 'can suc khoe can thong minh theo doi co the',
    intentPattern: /\b(can suc khoe|can thong minh|body composition|scale|nguoi lon tuoi|suc khoe|chu to|it thao tac|de dung)\b/,
    productPattern: /\b(can suc khoe|can thong minh|body composition|scale)\b/,
  },
  {
    key: 'personal_care',
    expansion: 'cham soc ca nhan may say toc ban chai dien can suc khoe qua tang bo me nho gon di cong tac',
    intentPattern: /\b(cham soc ca nhan|bo me|qua tang nho gon|qua gia dung|do gia dung huu dung|goi y qua|goi y mon|nen mua gi|mua gi|cong tac|du lich|may say toc|say toc|ban chai dien|vua lam qua|lam qua|qua huu dung|huu dung|chung cu nho|khong thich do cong kenh|nho gon)\b/,
    productPattern: /\b(cham soc ca nhan|may say toc|say toc|ban chai|can suc khoe|can thong minh|body composition|oral|beurer|dyson|philips hp|panasonic eh)\b/,
  },
  {
    key: 'blender',
    expansion: 'may xay sinh to may ep xay da nha bep blender',
    intentPattern: /\b(may xay|may ep|xay sinh to|xay da|sinh to|blender)\b/,
    productPattern: /\b(may xay|may ep|xay sinh to|xay da|sinh to|blender)\b/,
  },
];

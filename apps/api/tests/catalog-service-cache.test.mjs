import assert from 'node:assert/strict';
import test from 'node:test';

const { CatalogService } = await import('../dist/services/catalog.service.js');

test('CatalogService caches product list in Redis-compatible cache', async () => {
  const cache = memoryCache();
  const prisma = fakePrisma();
  const service = new CatalogService(prisma, cache);

  const firstProducts = await service.listProducts();
  const secondProducts = await service.listProducts();

  assert.equal(prisma.calls.findMany, 1);
  assert.deepEqual(secondProducts, firstProducts);
  assert.equal(cache.lastTtlSeconds, 120);
});

test('CatalogService search reuses cached catalog list instead of querying DB again', async () => {
  const cache = memoryCache();
  const prisma = fakePrisma();
  const service = new CatalogService(prisma, cache);

  await service.listProducts();
  const results = await service.searchProducts('fresh home duoi 4 trieu');

  assert.equal(prisma.calls.findMany, 1);
  assert.equal(results[0].id, 'prod_air_clean_p35');
});

test('CatalogService caches product detail by id', async () => {
  const cache = memoryCache();
  const prisma = fakePrisma();
  const service = new CatalogService(prisma, cache);

  const firstProduct = await service.getProduct('prod_air_clean_p35');
  const secondProduct = await service.getProduct('prod_air_clean_p35');

  assert.equal(prisma.calls.findUnique, 1);
  assert.equal(firstProduct?.id, 'prod_air_clean_p35');
  assert.deepEqual(secondProduct, firstProduct);
});

function memoryCache() {
  const values = new Map();
  return {
    lastTtlSeconds: undefined,
    async getJson(key) {
      return values.get(key);
    },
    async setJson(key, value, ttlSeconds) {
      values.set(key, JSON.parse(JSON.stringify(value)));
      this.lastTtlSeconds = ttlSeconds;
    },
  };
}

function fakePrisma() {
  const calls = { findMany: 0, findUnique: 0 };
  return {
    calls,
    client: {
      product: {
        async findMany() {
          calls.findMany += 1;
          return dbProducts();
        },
        async findUnique({ where }) {
          calls.findUnique += 1;
          return dbProducts().find((product) => product.id === where.id) ?? null;
        },
      },
    },
  };
}

function dbProducts() {
  return [
    {
      id: 'prod_air_clean_p35',
      title: 'Fresh Home Air Clean P35',
      brand: 'Fresh Home',
      category: 'air purifier',
      price: 3500000,
      inventory: 41,
      attributes: { room: '25-35m2' },
      description: 'Air purifier for 25m2 rooms under 4 million VND.',
    },
    {
      id: 'prod_expensive',
      title: 'Premium Oven',
      brand: 'ChefMax',
      category: 'kitchen',
      price: 12000000,
      inventory: 8,
      attributes: {},
      description: 'Large kitchen oven.',
    },
  ];
}

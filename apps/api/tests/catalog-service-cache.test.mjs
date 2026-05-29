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

test('CatalogService keeps hard product intent and brand facets before broad fallback', async () => {
  const service = new CatalogService(fakePrisma(), memoryCache());

  const riceCookers = await service.searchProducts('Ban cho toi vai san pham ve noi com di tam 4 san pham');
  assert.deepEqual(new Set(riceCookers.slice(0, 2).map((product) => product.id)), new Set(['prod_rice_toshiba', 'prod_rice_sharp']));
  assert.equal(riceCookers.some((product) => product.id === 'prod_robot'), false);

  const toshibaRiceCooker = await service.searchProducts('duoi 5 trieu la noi com dien cua hang toshiba');
  assert.deepEqual(toshibaRiceCooker.map((product) => product.id), ['prod_rice_toshiba']);

  const airPurifiers = await service.searchProducts('may loc cho nha 4 nguoi');
  assert.equal(airPurifiers[0].id, 'prod_air_clean_p35');
  assert.equal(airPurifiers.some((product) => product.id === 'prod_robot'), false);
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
    {
      id: 'prod_rice_toshiba',
      title: 'Noi com dien Toshiba RC-18NMFVN',
      brand: 'Toshiba',
      category: 'Thiet bi nha bep',
      price: 1890000,
      inventory: 7,
      attributes: { capacity: '1.8L' },
      description: 'Noi com dien cho gia dinh 4 nguoi.',
    },
    {
      id: 'prod_rice_sharp',
      title: 'Noi com dien Sharp KS-COM18V',
      brand: 'Sharp',
      category: 'Thiet bi nha bep',
      price: 1590000,
      inventory: 9,
      attributes: { capacity: '1.8L' },
      description: 'Noi com dien nap roi.',
    },
    {
      id: 'prod_robot',
      title: 'Robot hut bui lau nha',
      brand: 'Ecovacs',
      category: 'Ve sinh nha cua',
      price: 9790000,
      inventory: 3,
      attributes: {},
      description: 'Robot hut bui lau nha.',
    },
  ];
}

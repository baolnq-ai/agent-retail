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

test('CatalogService maps natural retail shorthand to the correct product family', async () => {
  const service = new CatalogService(fakePrisma(), memoryCache());

  assert.equal((await service.searchProducts('may loc kk cho be so sinh'))[0].id, 'prod_air_clean_p35');
  assert.equal((await service.searchProducts('xay da lam sinh to cho 1 nguoi'))[0].id, 'prod_blender');
  assert.equal((await service.searchProducts('cam bien cua bao qua dien thoai'))[0].id, 'prod_sensor');
  assert.equal((await service.searchProducts('can suc khoe chu to cho nguoi lon tuoi'))[0].id, 'prod_scale');
  assert.equal((await service.searchProducts('lo chien khong dau cua kinh'))[0].id, 'prod_air_fryer');
  assert.equal((await service.searchProducts('shop oi may hut bui cam tay duoi 2 trieu'))[0].id, 'prod_vacuum');
  assert.equal((await service.searchProducts('shop oi camera cua it khoan duc cho nha thue'))[0].id, 'prod_sensor');
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
    {
      id: 'prod_vacuum',
      title: 'May hut bui cam tay Deerma DX700S',
      brand: 'Deerma',
      category: 'Ve sinh nha cua',
      price: 900000,
      inventory: 8,
      attributes: { suction: '15000 Pa' },
      description: 'May hut bui cam tay nho gon duoi 2 trieu.',
    },
    {
      id: 'prod_blender',
      title: 'May xay sinh to Philips HR2051',
      brand: 'Philips',
      category: 'Thiet bi nha bep',
      price: 690000,
      inventory: 5,
      attributes: { blade: 'xay da nho' },
      description: 'May xay sinh to nho gon cho 1 nguoi.',
    },
    {
      id: 'prod_sensor',
      title: 'Aqara Door and Window Sensor P2',
      brand: 'Aqara',
      category: 'Smart home',
      price: 790000,
      inventory: 11,
      attributes: { protocol: 'Matter Thread' },
      description: 'Cam bien cua bao qua dien thoai khi mo cua.',
    },
    {
      id: 'prod_scale',
      title: 'Can suc khoe Beurer GS203',
      brand: 'Beurer',
      category: 'Cham soc ca nhan',
      price: 590000,
      inventory: 8,
      attributes: { display: 'chu to' },
      description: 'Can suc khoe de dung cho nguoi lon tuoi.',
    },
    {
      id: 'prod_air_fryer',
      title: 'Lo chien khong dau Ferroli FAF-12M',
      brand: 'Ferroli',
      category: 'Thiet bi nha bep',
      price: 2490000,
      inventory: 6,
      attributes: { window: 'cua kinh' },
      description: 'Lo chien khong dau cua kinh nhin duoc do an.',
    },
  ];
}

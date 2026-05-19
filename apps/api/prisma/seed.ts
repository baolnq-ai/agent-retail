import { createPrismaClient } from '../src/utils/prisma-client.js';

const prisma = createPrismaClient();

interface SeedProduct {
  id: string;
  title: string;
  brand: string;
  category: string;
  price: number;
  inventory: number;
  attributes: Record<string, string>;
  description: string;
}

const requiredProducts: SeedProduct[] = [
  {
    id: 'prod_air_clean_p35',
    title: 'Máy lọc không khí AiroClean P35',
    brand: 'AiroClean',
    category: 'Điện gia dụng',
    price: 3490000,
    inventory: 42,
    attributes: { roomSize: '25-35m2', filter: 'HEPA H13', noise: '32dB', warranty: '24 tháng' },
    description: 'Máy lọc không khí phù hợp phòng ngủ 25-35m2, có cảm biến bụi PM2.5 và app control.',
  },
  {
    id: 'prod_fresh_home_mini_20',
    title: 'Máy lọc không khí FreshHome Mini 20',
    brand: 'FreshHome',
    category: 'Điện gia dụng',
    price: 1990000,
    inventory: 18,
    attributes: { roomSize: '15-22m2', filter: 'HEPA H12', noise: '28dB', warranty: '18 tháng' },
    description: 'Máy lọc không khí nhỏ gọn cho phòng 15-22m2, vận hành êm.',
  },
  {
    id: 'prod_chefmax_af55',
    title: 'Nồi chiên không dầu ChefMax AF55',
    brand: 'ChefMax',
    category: 'Thiết bị nhà bếp',
    price: 2290000,
    inventory: 35,
    attributes: { capacity: '5.5L', presets: '8', coating: 'Chống dính', warranty: '24 tháng' },
    description: 'Nồi chiên không dầu dung tích 5.5L với 8 chế độ nấu.',
  },
];

const generatedProducts = generateProducts();
const products = [...requiredProducts, ...generatedProducts].slice(0, 103);

for (const product of products) {
  await prisma.product.upsert({
    where: { id: product.id },
    update: {
      title: product.title,
      brand: product.brand,
      category: product.category,
      price: product.price,
      currency: 'VND',
      inventory: product.inventory,
      attributes: product.attributes,
      description: product.description,
    },
    create: {
      ...product,
      currency: 'VND',
    },
  });
}

const knowledgeDocuments = [
  {
    id: 'policy_returns_7_days',
    type: 'policy',
    title: 'Chính sách đổi trả 7 ngày',
    content: 'Đổi trả trong 7 ngày nếu sản phẩm lỗi từ nhà sản xuất. Đơn đã bàn giao vận chuyển không thể sửa sản phẩm.',
    trustLevel: 'official',
  },
  {
    id: 'policy_refund_3_7_days',
    type: 'policy',
    title: 'Thời gian hoàn tiền',
    content: 'Hoàn tiền trong 3-7 ngày làm việc tuỳ phương thức thanh toán.',
    trustLevel: 'official',
  },
  {
    id: 'faq_free_shipping',
    type: 'faq',
    title: 'Miễn phí giao hàng',
    content: 'Miễn phí giao hàng cho đơn từ 1.000.000 VND trong nội thành.',
    trustLevel: 'official',
  },
  {
    id: 'faq_air_purifier_room_size',
    type: 'faq',
    title: 'Chọn máy lọc theo diện tích phòng',
    content: 'Phòng 15-22m2 nên chọn máy mini, phòng 25-35m2 nên chọn máy có HEPA H13 và CADR cao hơn, phòng trên 40m2 nên chọn dòng công suất lớn.',
    trustLevel: 'official',
  },
];

for (const document of knowledgeDocuments) {
  await prisma.knowledgeDocument.upsert({
    where: { id: document.id },
    update: document,
    create: document,
  });
}

await prisma.$disconnect();

function generateProducts(): SeedProduct[] {
  const categories = [
    {
      key: 'air',
      category: 'Máy lọc không khí',
      brands: ['AiroClean', 'FreshHome', 'PureZen', 'BreezeCare', 'LumiAir'],
      names: ['Compact', 'Sleep', 'Plus', 'Max', 'Family'],
      basePrice: 1590000,
      step: 360000,
      attributes: (index: number) => ({
        roomSize: index % 4 === 0 ? '25-35m2' : index % 4 === 1 ? '15-22m2' : index % 4 === 2 ? '35-45m2' : '45-60m2',
        filter: index % 3 === 0 ? 'HEPA H13' : index % 3 === 1 ? 'HEPA H12' : 'HEPA H14',
        noise: `${26 + (index % 12)}dB`,
        warranty: `${12 + (index % 3) * 6} tháng`,
      }),
      description: (brand: string, name: string, index: number) => `Máy lọc không khí ${brand} ${name} phù hợp căn hộ hiện đại, vận hành êm và có cảm biến chất lượng không khí mức ${index % 5 + 1}.`,
    },
    {
      key: 'kitchen',
      category: 'Thiết bị nhà bếp',
      brands: ['ChefMax', 'CookMate', 'BếpXinh', 'HomeChef', 'KitchenPro'],
      names: ['AirFry', 'SteamPot', 'RiceSmart', 'BlendGo', 'GrillEase'],
      basePrice: 890000,
      step: 280000,
      attributes: (index: number) => ({
        capacity: `${2 + (index % 6)}.${index % 2 === 0 ? '0' : '5'}L`,
        power: `${900 + (index % 7) * 120}W`,
        material: index % 2 === 0 ? 'Inox' : 'Nhựa chịu nhiệt',
        warranty: `${12 + (index % 3) * 6} tháng`,
      }),
      description: (brand: string, name: string) => `Thiết bị bếp ${brand} ${name} hỗ trợ nấu nhanh, dễ vệ sinh và phù hợp gia đình bận rộn.`,
    },
    {
      key: 'clean',
      category: 'Vệ sinh nhà cửa',
      brands: ['CleanBot', 'DustAway', 'HomeSweep', 'MopMate', 'VacPro'],
      names: ['Robot S', 'Vacuum One', 'Mop Max', 'Dust Lite', 'Aqua Clean'],
      basePrice: 1290000,
      step: 420000,
      attributes: (index: number) => ({
        power: `${120 + (index % 8) * 25}W`,
        usage: index % 2 === 0 ? 'Sàn gỗ và gạch' : 'Thảm mỏng và sàn gạch',
        noise: `${50 + (index % 10)}dB`,
        warranty: `${12 + (index % 3) * 6} tháng`,
      }),
      description: (brand: string, name: string) => `${brand} ${name} giúp vệ sinh nhà cửa nhanh hơn, dễ dùng cho căn hộ và gia đình có thú cưng.`,
    },
    {
      key: 'smart',
      category: 'Nhà thông minh',
      brands: ['SmartNest', 'LumiHome', 'AqraLife', 'HomeLink', 'BrightHub'],
      names: ['Hub Mini', 'Sensor Kit', 'Camera View', 'Light Strip', 'Door Guard'],
      basePrice: 390000,
      step: 210000,
      attributes: (index: number) => ({
        connection: index % 2 === 0 ? 'Wi-Fi' : 'Zigbee',
        color: index % 3 === 0 ? 'Trắng' : index % 3 === 1 ? 'Đen' : 'Xám',
        usage: 'Điều khiển qua app',
        warranty: `${12 + (index % 2) * 6} tháng`,
      }),
      description: (brand: string, name: string) => `${brand} ${name} giúp tự động hoá nhà thông minh, dễ lắp đặt và quản lý bằng điện thoại.`,
    },
    {
      key: 'care',
      category: 'Chăm sóc cá nhân',
      brands: ['CarePlus', 'BeautyZen', 'OralPro', 'HairMate', 'WellGo'],
      names: ['Dryer Ion', 'Brush Sonic', 'Massager Mini', 'Scale Fit', 'Shaver Clean'],
      basePrice: 490000,
      step: 190000,
      attributes: (index: number) => ({
        power: `${30 + (index % 7) * 20}W`,
        color: index % 2 === 0 ? 'Trắng' : 'Hồng nhạt',
        usage: 'Dùng hằng ngày',
        warranty: `${12 + (index % 2) * 6} tháng`,
      }),
      description: (brand: string, name: string) => `${brand} ${name} nhỏ gọn, dễ sử dụng và phù hợp chăm sóc cá nhân tại nhà.`,
    },
    {
      key: 'climate',
      category: 'Làm mát và sưởi',
      brands: ['CoolMate', 'Windy', 'HeatHome', 'BreezeMax', 'ThermoCare'],
      names: ['Fan Tower', 'Desk Fan', 'Heater Mini', 'Air Cooler', 'Mist Fan'],
      basePrice: 690000,
      step: 250000,
      attributes: (index: number) => ({
        power: `${45 + (index % 8) * 35}W`,
        roomSize: index % 3 === 0 ? '15-25m2' : index % 3 === 1 ? '25-35m2' : '35-45m2',
        noise: `${32 + (index % 12)}dB`,
        warranty: `${12 + (index % 3) * 6} tháng`,
      }),
      description: (brand: string, name: string) => `${brand} ${name} hỗ trợ làm mát hoặc sưởi nhanh, phù hợp phòng ngủ và phòng khách nhỏ.`,
    },
  ];

  const products: SeedProduct[] = [];
  for (const group of categories) {
    for (let index = 1; index <= 17; index += 1) {
      const brand = group.brands[index % group.brands.length];
      const name = group.names[index % group.names.length];
      products.push({
        id: `prod_${group.key}_${String(index).padStart(2, '0')}`,
        title: `${brand} ${name} ${index}`,
        brand,
        category: group.category,
        price: group.basePrice + index * group.step + (index % 4) * 50000,
        inventory: 8 + (index * 7) % 70,
        attributes: group.attributes(index),
        description: group.description(brand, name, index),
      });
    }
  }

  return products;
}

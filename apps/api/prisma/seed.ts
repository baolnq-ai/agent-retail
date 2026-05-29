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

interface ProductInput {
  id?: string;
  title: string;
  brand: string;
  price: number;
  spec: string;
  useCase: string;
  sourceUrl?: string;
}

interface CatalogGroup {
  key: string;
  category: string;
  sourceName: string;
  sourceUrl: string;
  imageUrls: string[];
  products: ProductInput[];
}

const catalogGroups: CatalogGroup[] = [
  {
    key: 'air',
    category: 'Máy lọc không khí',
    sourceName: 'Điện Máy Xanh',
    sourceUrl: 'https://www.dienmayxanh.com/may-loc-khong-khi',
    imageUrls: [
      'https://cdn.tgdd.vn/2026/03/timerseo/271723-600x600-5.png',
      'https://cdn.tgdd.vn/2026/03/timerseo/273030-600x600-1.png',
      'https://cdn.tgdd.vn/Products/Images/5473/273030/levoit-core-mini-051222-033118.jpg',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80',
    ],
    products: [
      { id: 'prod_air_clean_p35', title: 'Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W', brand: 'Xiaomi', price: 2340000, spec: 'Phòng 25-35m2, cảm biến bụi, điều khiển app', useCase: 'phòng ngủ hoặc phòng khách nhỏ', sourceUrl: 'https://www.dienmayxanh.com/may-loc-khong-khi/xiaomi-smart-air-purifier-4-lite' },
      { id: 'prod_fresh_home_mini_20', title: 'Máy lọc không khí Levoit Core Mini 7W', brand: 'Levoit', price: 1290000, spec: 'Phòng dưới 17m2, lọc PM0.3, khay tinh dầu', useCase: 'bàn làm việc và phòng ngủ nhỏ', sourceUrl: 'https://www.dienmayxanh.com/may-loc-khong-khi/levoit-core-mini' },
      { title: 'Máy lọc không khí Xiaomi Smart Air Purifier 4 Compact EU (BHR5860EU) 27W', brand: 'Xiaomi', price: 1580000, spec: 'Thiết kế gọn, lọc phòng nhỏ, app Xiaomi Home', useCase: 'căn hộ nhỏ' },
      { title: 'Máy lọc không khí Acerpure Pro P2 Classic AP352-10W 33W', brand: 'Acerpure', price: 3490000, spec: 'Cảm biến chất lượng khí, màn hình hiển thị', useCase: 'phòng khách hiện đại' },
      { title: 'Máy lọc không khí kết hợp quạt Acerpure Cool C2-UVC AC553-50W 65W', brand: 'Acerpure', price: 6090000, spec: 'Lọc khí kết hợp quạt, đèn UVC', useCase: 'không gian cần làm mát nhẹ' },
      { title: 'Máy lọc không khí Sharp FP-S40V-W 23W', brand: 'Sharp', price: 3690000, spec: 'Plasmacluster ion, phòng khoảng 30m2', useCase: 'gia đình có trẻ nhỏ' },
      { title: 'Máy lọc không khí Electrolux FA41-402GY 45W', brand: 'Electrolux', price: 3990000, spec: 'Cảm biến bụi, nhiều cấp lọc', useCase: 'phòng khách nhiều bụi mịn' },
      { title: 'Máy lọc không khí Midea MAP-550GJA32 38W', brand: 'Midea', price: 2990000, spec: 'Màng lọc HEPA, diện tích trung bình', useCase: 'ngân sách dưới 3 triệu' },
      { title: 'Máy lọc không khí Levoit Core 400S 38W', brand: 'Levoit', price: 4790000, spec: 'Kết nối app, HEPA H13, lọc phòng lớn', useCase: 'nhà có thú cưng' },
      { title: 'Máy lọc không khí kết hợp quạt Philips AMF765/30 40W', brand: 'Philips', price: 7990000, spec: 'Lọc khí kiêm quạt, cảm biến thông minh', useCase: 'phòng khách cao cấp' },
      { title: 'Máy lọc không khí Xiaomi Smart Air Purifier 4 Pro (BHR5056EU) 50W', brand: 'Xiaomi', price: 4980000, spec: 'Màn OLED, CADR cao, app control', useCase: 'phòng lớn cần lọc nhanh' },
      { title: 'Máy lọc không khí Philips AC3360/11 75W', brand: 'Philips', price: 5990000, spec: 'Công suất lớn, lọc bụi mịn', useCase: 'không gian sinh hoạt chung' },
      { title: 'Máy lọc không khí tạo ẩm Philips AC3420/10 43W', brand: 'Philips', price: 8990000, spec: 'Lọc khí và tạo ẩm', useCase: 'phòng dùng điều hòa lâu' },
      { title: 'Máy lọc không khí Samsung AX32BG3100GBSV 41W', brand: 'Samsung', price: 3590000, spec: 'Thiết kế tháp, lọc bụi mịn', useCase: 'căn hộ gia đình' },
      { title: 'Máy lọc không khí Sharp FP-J80EV-H 48W', brand: 'Sharp', price: 7990000, spec: 'Plasmacluster, lọc phòng lớn', useCase: 'nhà phố gần đường' },
      { title: 'Máy lọc không khí Levoit Core 200S 26W', brand: 'Levoit', price: 2690000, spec: 'Kết nối app, vận hành êm', useCase: 'phòng ngủ êm ban đêm' },
      { title: 'Máy lọc không khí Sharp FP-J60E-W 38W', brand: 'Sharp', price: 5290000, spec: 'Ion Plasmacluster, HEPA', useCase: 'phòng khách vừa' },
      { title: 'Máy lọc không khí Panasonic F-PXJ30A 30W', brand: 'Panasonic', price: 3490000, spec: 'Nanoe, lọc bụi và mùi', useCase: 'phòng ngủ gia đình' },
    ],
  },
  {
    key: 'kitchen',
    category: 'Thiết bị nhà bếp',
    sourceName: 'Điện Máy Xanh',
    sourceUrl: 'https://www.dienmayxanh.com/noi-chien-khong-dau',
    imageUrls: [
      'https://cdn.tgdd.vn/2026/05/timerseo/240291.jpg',
      'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=900&q=80',
    ],
    products: [
      { id: 'prod_chefmax_af55', title: 'Nồi chiên không dầu AVA 5.5 lít 55K07A', brand: 'AVA', price: 1490000, spec: '5.5 lít, 1350W, nút vặn, mặt trước trong suốt', useCase: 'gia đình 3-4 người', sourceUrl: 'https://www.dienmayxanh.com/noi-chien-khong-dau/ava-55k07a-55-lit' },
      { title: 'Nồi chiên không dầu AVA 7.5 lít KDF-593D', brand: 'AVA', price: 1890000, spec: '7.5 lít, điều khiển điện tử', useCase: 'nướng gà nguyên con' },
      { title: 'Nồi chiên không dầu Sunhouse 6 lít SHD4026', brand: 'Sunhouse', price: 1590000, spec: '6 lít, chống dính, hẹn giờ', useCase: 'bữa ăn gia đình' },
      { title: 'Lò chiên không dầu Hawonkoo 18 lít AFH-180-GR', brand: 'Hawonkoo', price: 2890000, spec: '18 lít, nhiều khay nướng', useCase: 'nấu nhiều món cùng lúc' },
      { title: 'Nồi chiên không dầu Philips 4.1 lít HD9200/90', brand: 'Philips', price: 2490000, spec: 'Rapid Air, 4.1 lít', useCase: 'nấu ít dầu ổn định' },
      { title: 'Nồi chiên không dầu Magic 6.5 lít A-805', brand: 'Magic', price: 2060000, spec: '6.5 lít, giỏ chiên chống dính', useCase: 'ngân sách khoảng 2 triệu' },
      { title: 'Nồi chiên không dầu Kangaroo 5.2 lít KG55AF1', brand: 'Kangaroo', price: 1990000, spec: '5.2 lít, công suất cao', useCase: 'chiên nướng hằng ngày' },
      { title: 'Lò chiên không dầu Ferroli 12 lít FAF-12M', brand: 'Ferroli', price: 1990000, spec: '12 lít, cửa kính', useCase: 'cần quan sát món nướng' },
      { title: 'Nồi chiên không dầu Tefal Window 6 lít EY821868', brand: 'Tefal', price: 1690000, spec: '6 lít, cửa sổ quan sát', useCase: 'bếp nhỏ hiện đại' },
      { title: 'Nồi chiên không dầu Joyoung 6 lít JAF-579', brand: 'Joyoung', price: 1990000, spec: '6 lít, chương trình nấu sẵn', useCase: 'người mới dùng nồi chiên' },
      { title: 'Nồi chiên không dầu Magic Eco 5.5 lít AC-102', brand: 'Magic Eco', price: 2090000, spec: '5.5 lít, dễ vệ sinh', useCase: 'bữa ăn ít dầu' },
      { title: 'Nồi chiên không dầu Kangaroo 8 lít KG8AF1A', brand: 'Kangaroo', price: 1790000, spec: '8 lít, dung tích lớn', useCase: 'gia đình đông người' },
      { title: 'Nồi chiên không dầu Electrolux 5 lít E6AF1-520K', brand: 'Electrolux', price: 2870000, spec: '5 lít, thiết kế tối giản', useCase: 'bếp cần đồ bền đẹp' },
      { title: 'Lò chiên không dầu Ferroli 12 lít FAF-12D', brand: 'Ferroli', price: 2290000, spec: '12 lít, điều khiển điện tử', useCase: 'nướng và sấy thực phẩm' },
      { title: 'Nồi chiên không dầu kết hợp hấp Magic Eco 5 lít S05', brand: 'Magic Eco', price: 2259000, spec: '5 lít, chiên kết hợp hấp', useCase: 'món mềm ẩm hơn' },
      { title: 'Lò chiên không dầu Kalite 15 lít KL-1500', brand: 'Kalite', price: 3190000, spec: '15 lít, 1700W, 10 chương trình', useCase: 'nấu đa dạng cho gia đình lớn', sourceUrl: 'https://www.dienmayxanh.com/noi-chien-khong-dau/lo-chien-khong-dau-kalite-kl-1500-15-lit' },
    ],
  },
  {
    key: 'clean',
    category: 'Vệ sinh nhà cửa',
    sourceName: 'Điện Máy Xanh',
    sourceUrl: 'https://www.dienmayxanh.com/robot-hut-bui',
    imageUrls: [
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=80',
    ],
    products: [
      { title: 'Robot hút bụi lau nhà Ecovacs Deebot N30 PRO OMNI', brand: 'Ecovacs', price: 9790000, spec: 'Tự động hút lau, giặt giẻ, sạc 6.5 giờ', useCase: 'nhà bận rộn cần tự động hóa' },
      { title: 'Máy hút bụi không dây Magic A-061 8500 Pa', brand: 'Magic', price: 940000, spec: '8500 Pa, 80 dB, không dây', useCase: 'dọn nhanh bụi hằng ngày' },
      { title: 'Máy hút bụi cầm tay RAF R.8672 16000 Pa', brand: 'RAF', price: 665000, spec: '16000 Pa, cầm tay gọn', useCase: 'xe hơi và góc nhỏ' },
      { title: 'Máy hút bụi cầm tay Deerma DX700 15000 Pa', brand: 'Deerma', price: 790000, spec: '15000 Pa, đầu hút đa năng', useCase: 'căn hộ nhỏ' },
      { title: 'Máy hút bụi dạng hộp Bosch BGS21WHYG 82 dB', brand: 'Bosch', price: 4190000, spec: 'Dạng hộp, lực hút ổn định', useCase: 'nhà nhiều phòng' },
      { title: 'Máy hút bụi không dây Bosch BCS61113', brand: 'Bosch', price: 6690000, spec: 'Không dây, pin tháo rời', useCase: 'dọn dẹp linh hoạt' },
      { title: 'Máy hút bụi dạng hộp Bosch BGC05AAA2', brand: 'Bosch', price: 2190000, spec: 'Dạng hộp nhỏ, 78 dB', useCase: 'dọn phòng khách' },
      { title: 'Máy hút bụi cầm tay Deerma DX700S 15000 Pa', brand: 'Deerma', price: 900000, spec: '15000 Pa, 75 dB', useCase: 'ngân sách dưới 1 triệu' },
      { title: 'Robot hút bụi lau nhà Ecovacs Deebot Y1 PRO', brand: 'Ecovacs', price: 4290000, spec: 'Sạc 5 giờ, dùng 180 phút', useCase: 'căn hộ cần vừa hút vừa lau', sourceUrl: 'https://www.dienmayxanh.com/robot-hut-bui/robot-hut-bui-lau-nha-ecovacs-y1-pro' },
      { title: 'Robot hút bụi lau nhà Xiaomi Robot Vacuum X20 Pro', brand: 'Xiaomi', price: 9990000, spec: '7000 Pa, trạm giặt sấy giẻ', useCase: 'nhà nhiều sàn cứng', sourceUrl: 'https://www.dienmayxanh.com/robot-hut-bui/robot-hut-bui-lau-nha-xiaomi-x20-pro' },
      { title: 'Robot hút bụi lau nhà Hitachi RV-X20P', brand: 'Hitachi', price: 6990000, spec: '5000 Pa, LDS, pin 4700 mAh', useCase: 'dọn phòng dưới 140m2', sourceUrl: 'https://www.dienmayxanh.com/robot-hut-bui/robot-hut-bui-lau-nha-hitachi-rv-x20p' },
      { title: 'Robot hút bụi lau nhà Dreame L10s Pro Ultra', brand: 'Dreame', price: 13990000, spec: 'Trạm tự giặt sấy, lực hút cao', useCase: 'nhà cao cấp nhiều lịch dọn' },
      { title: 'Robot hút bụi Roborock Q Revo', brand: 'Roborock', price: 14990000, spec: 'Lau xoay, tự giặt giẻ', useCase: 'dọn tự động sâu' },
      { title: 'Robot hút bụi Ecovacs T30 Pro Omni', brand: 'Ecovacs', price: 16990000, spec: 'Trạm omni, chống rối tóc', useCase: 'nhà có thú cưng' },
      { title: 'Robot hút bụi Xiaomi Robot Vacuum X10', brand: 'Xiaomi', price: 7990000, spec: 'Tự đổ bụi, lập bản đồ', useCase: 'căn hộ thông minh' },
      { title: 'Máy hút bụi Samsung Jet Bot', brand: 'Samsung', price: 8990000, spec: 'Cảm biến LiDAR, robot hút bụi', useCase: 'nhà dùng hệ sinh thái Samsung' },
    ],
  },
  {
    key: 'smart',
    category: 'Nhà thông minh',
    sourceName: 'The Gioi Di Dong / Điện Máy Xanh',
    sourceUrl: 'https://www.dienmayxanh.com/camera-giam-sat',
    imageUrls: [
      'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1518444065439-e933c06ce9cd?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1545259741-2ea3ebf61fa3?auto=format&fit=crop&w=900&q=80',
    ],
    products: [
      { title: 'Camera Wi-Fi TP-Link Tapo C200', brand: 'TP-Link', price: 490000, spec: 'Full HD, xoay 360 độ, đàm thoại 2 chiều', useCase: 'trông nhà cơ bản' },
      { title: 'Camera Wi-Fi TP-Link Tapo C210', brand: 'TP-Link', price: 590000, spec: '2K, xoay quét, phát hiện chuyển động', useCase: 'phòng khách hoặc cửa hàng nhỏ' },
      { title: 'Camera Wi-Fi TP-Link Tapo C220', brand: 'TP-Link', price: 790000, spec: '2K QHD, AI phát hiện người', useCase: 'giám sát rõ hơn ban đêm' },
      { title: 'Camera IP Ezviz H8C', brand: 'Ezviz', price: 890000, spec: 'Ngoài trời, xoay 360 độ, chống nước', useCase: 'sân trước và ban công' },
      { title: 'Camera IP Ezviz C6N', brand: 'Ezviz', price: 650000, spec: 'Full HD, xoay ngang dọc', useCase: 'phòng trẻ em' },
      { title: 'Camera Wi-Fi Imou Ranger 2', brand: 'Imou', price: 590000, spec: 'Full HD, theo dõi chuyển động', useCase: 'phòng làm việc' },
      { title: 'Camera Xiaomi Smart Camera C300', brand: 'Xiaomi', price: 890000, spec: '2K, AI người, xoay 360 độ', useCase: 'căn hộ Xiaomi Home' },
      { title: 'Camera Xiaomi Smart Camera C400', brand: 'Xiaomi', price: 1190000, spec: '2.5K, nhìn đêm màu', useCase: 'cần hình rõ hơn' },
      { title: 'Aqara Hub M2', brand: 'Aqara', price: 1490000, spec: 'Zigbee hub, hồng ngoại, HomeKit', useCase: 'trung tâm nhà thông minh' },
      { title: 'Aqara Door and Window Sensor P2', brand: 'Aqara', price: 790000, spec: 'Matter, Thread, cảm biến cửa', useCase: 'theo dõi cửa ra vào' },
      { title: 'Google Nest Hub 2nd Gen', brand: 'Google', price: 1890000, spec: 'Màn hình thông minh, Google Assistant', useCase: 'điều khiển nhà bằng giọng nói' },
      { title: 'Xiaomi Smart Doorbell 3', brand: 'Xiaomi', price: 1490000, spec: 'Chuông hình, pin sạc, nhận diện người', useCase: 'cửa căn hộ' },
      { title: 'Ổ cắm thông minh TP-Link Tapo P110', brand: 'TP-Link', price: 290000, spec: 'Đo điện năng, điều khiển app', useCase: 'quản lý thiết bị nhỏ' },
      { title: 'Bóng đèn Philips Hue White Ambiance E27', brand: 'Philips Hue', price: 690000, spec: 'Đổi nhiệt màu, dimming', useCase: 'ánh sáng phòng ngủ' },
      { title: 'Aqara Presence Sensor FP2', brand: 'Aqara', price: 1990000, spec: 'mmWave, nhận diện hiện diện', useCase: 'tự động hóa đèn chính xác' },
      { title: 'SwitchBot Hub 2', brand: 'SwitchBot', price: 1690000, spec: 'Matter hub, IR blaster, cảm biến nhiệt ẩm', useCase: 'kết nối đồ gia dụng cũ' },
    ],
  },
  {
    key: 'blender',
    category: 'Thiết bị nhà bếp',
    sourceName: 'Điện Máy Xanh / hãng sản xuất',
    sourceUrl: 'https://www.dienmayxanh.com/may-xay-sinh-to',
    imageUrls: [
      'https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1576675466969-38eeae4b41f6?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=900&q=80',
    ],
    products: [
      { title: 'Máy xay sinh tố Philips HR2041/50', brand: 'Philips', price: 899000, spec: '450W, 3 cối, xay đá nhỏ', useCase: 'sinh tố gia đình', sourceUrl: 'https://www.dienmayxanh.com/may-xay-sinh-to/philips-hr2041-50' },
      { title: 'Máy xay sinh tố Philips HR2051/00', brand: 'Philips', price: 690000, spec: '350W, cối nhựa, xay cơ bản', useCase: 'người dùng cá nhân' },
      { title: 'Máy xay sinh tố Panasonic MX-M200GRA', brand: 'Panasonic', price: 1090000, spec: '450W, 2 cối, lưỡi thép không gỉ', useCase: 'xay thực phẩm hằng ngày' },
      { title: 'Máy xay sinh tố Sunhouse SHD5112', brand: 'Sunhouse', price: 490000, spec: '350W, 2 cối', useCase: 'ngân sách tiết kiệm' },
      { title: 'Máy xay sinh tố Bluestone BLB-5335W', brand: 'Bluestone', price: 1190000, spec: '800W, cối thủy tinh', useCase: 'xay mạnh hơn' },
      { title: 'Máy xay sinh tố Kangaroo KG3B2', brand: 'Kangaroo', price: 790000, spec: '380W, 3 cối', useCase: 'xay gia vị và sinh tố' },
      { title: 'Máy xay sinh tố Tefal BL42Q166', brand: 'Tefal', price: 1290000, spec: '600W, lưỡi Powelix', useCase: 'xay mịn nhanh' },
      { title: 'Máy ép chậm Lock&Lock EJM462', brand: 'Lock&Lock', price: 2490000, spec: 'Ép chậm, giữ dưỡng chất', useCase: 'nước ép rau củ' },
      { id: 'prod_rice_sharp_ks_com18v', title: 'Nồi cơm điện Sharp KS-COM18V', brand: 'Sharp', price: 1090000, spec: '1.8 lít, lòng chống dính', useCase: 'gia đình 4-6 người' },
      { id: 'prod_rice_cuckoo_cr_0675f', title: 'Nồi cơm điện Cuckoo CR-0675F', brand: 'Cuckoo', price: 1290000, spec: '1 lít, giữ ấm tốt', useCase: 'gia đình nhỏ' },
      { id: 'prod_rice_tiger_jbv_s10w', title: 'Nồi cơm điện tử Tiger JBV-S10W', brand: 'Tiger', price: 2690000, spec: '1 lít, nấu đa chế độ', useCase: 'bữa cơm chất lượng' },
      { id: 'prod_rice_toshiba_rc_18nmfvn', title: 'Nồi cơm điện Toshiba RC-18NMFVN', brand: 'Toshiba', price: 2390000, spec: '1.8 lít, Fuzzy Logic', useCase: 'nấu cơm ổn định' },
      { id: 'prod_rice_panasonic_sr_cx188sra', title: 'Nồi cơm điện Panasonic SR-CX188SRA', brand: 'Panasonic', price: 2190000, spec: '1.8 lít, nắp gài', useCase: 'gia đình dùng hằng ngày' },
      { title: 'Máy làm sữa hạt Bear LLJ-D04B1', brand: 'Bear', price: 1590000, spec: '1.75 lít, nấu xay tự động', useCase: 'sữa hạt tại nhà' },
      { title: 'Máy ép chậm Kalite KL-530', brand: 'Kalite', price: 2990000, spec: 'Ép chậm trục đứng', useCase: 'ép trái cây ít bọt' },
      { title: 'Máy làm sữa hạt Unie V8S', brand: 'Unie', price: 2490000, spec: 'Nấu xay, vệ sinh tự động', useCase: 'đồ uống lành mạnh' },
    ],
  },
  {
    key: 'care',
    category: 'Chăm sóc cá nhân',
    sourceName: 'The Gioi Di Dong / hãng sản xuất',
    sourceUrl: 'https://www.thegioididong.com/do-gia-dung',
    imageUrls: [
      'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=900&q=80',
    ],
    products: [
      { title: 'Máy sấy tóc Philips HP8233', brand: 'Philips', price: 790000, spec: '2200W, ion âm, sấy mát', useCase: 'tóc dày cần khô nhanh' },
      { title: 'Máy sấy tóc Panasonic EH-NE66', brand: 'Panasonic', price: 1090000, spec: '2000W, ionity', useCase: 'giảm xơ rối' },
      { title: 'Máy sấy tóc Dyson Supersonic HD15', brand: 'Dyson', price: 11990000, spec: 'Động cơ số, kiểm soát nhiệt', useCase: 'chăm tóc cao cấp' },
      { title: 'Máy sấy tóc Bluestone HDB-1821', brand: 'Bluestone', price: 390000, spec: '1000W, gọn nhẹ', useCase: 'du lịch' },
      { title: 'Máy sấy tóc Xiaomi Mijia H300', brand: 'Xiaomi', price: 690000, spec: 'Ion nước, gọn nhẹ', useCase: 'tóc ngắn và vừa' },
      { title: 'Bàn chải điện Oral-B Pro 1', brand: 'Oral-B', price: 990000, spec: 'Dao động xoay, hẹn giờ 2 phút', useCase: 'chăm sóc răng miệng' },
      { title: 'Bàn chải điện Philips Sonicare 3100', brand: 'Philips', price: 1290000, spec: 'Sonic, báo thay đầu chải', useCase: 'nướu nhạy cảm' },
      { title: 'Bàn chải điện Xiaomi Mijia T500', brand: 'Xiaomi', price: 690000, spec: 'Sonic, app tracking', useCase: 'theo dõi thói quen chải' },
      { title: 'Máy cạo râu Panasonic ES534DP', brand: 'Panasonic', price: 390000, spec: 'Dùng pin, lưỡi kép', useCase: 'cạo nhanh hằng ngày' },
      { title: 'Máy cạo râu Philips S1103', brand: 'Philips', price: 790000, spec: '3 đầu cạo, dùng khô', useCase: 'da mặt thường' },
      { title: 'Máy cạo râu Braun Series 3 300s', brand: 'Braun', price: 1490000, spec: '3 lưỡi cạo, chống nước', useCase: 'cạo sạch ổn định' },
      { title: 'Cân sức khỏe Beurer GS203', brand: 'Beurer', price: 590000, spec: 'Mặt kính, đo cân nặng', useCase: 'theo dõi cơ bản' },
      { title: 'Máy đo huyết áp Omron HEM-7121', brand: 'Omron', price: 1190000, spec: 'Bắp tay, phát hiện nhịp tim bất thường', useCase: 'theo dõi sức khỏe tại nhà' },
      { title: 'Cân thông minh Xiaomi Body Composition Scale S400', brand: 'Xiaomi', price: 690000, spec: 'Đo thành phần cơ thể, app Mi Fitness', useCase: 'người tập luyện' },
      { title: 'Máy rửa mặt Foreo Luna Mini 3', brand: 'Foreo', price: 3290000, spec: 'Sonic, silicone y tế', useCase: 'làm sạch da mặt' },
      { title: 'Máy sấy tóc Philips BHD510', brand: 'Philips', price: 1390000, spec: 'ThermoShield, ion âm', useCase: 'bảo vệ tóc khi sấy thường xuyên' },
    ],
  },
  {
    key: 'climate',
    category: 'Làm mát và sưởi',
    sourceName: 'Điện Máy Xanh',
    sourceUrl: 'https://www.dienmayxanh.com/quat-dieu-hoa',
    imageUrls: [
      'https://images.unsplash.com/photo-1581783898377-1c85bf937427?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=80',
    ],
    products: [
      { title: 'Quạt điều hòa Kangaroo KG50F79', brand: 'Kangaroo', price: 3990000, spec: '50 lít, làm mát bay hơi', useCase: 'phòng khách thông thoáng' },
      { title: 'Quạt điều hòa Sunhouse SHD7727', brand: 'Sunhouse', price: 2990000, spec: '40 lít, đảo gió', useCase: 'ngân sách tầm 3 triệu' },
      { title: 'Quạt điều hòa Midea AC120-16AR', brand: 'Midea', price: 2490000, spec: '30 lít, remote', useCase: 'phòng ngủ vừa' },
      { title: 'Quạt điều hòa Daikiosan DKA-04000C', brand: 'Daikiosan', price: 5490000, spec: 'Công suất lớn, lọc bụi', useCase: 'không gian rộng' },
      { title: 'Quạt điều hòa Honeywell CL30XC', brand: 'Honeywell', price: 6990000, spec: '30 lít, thương hiệu Mỹ', useCase: 'nhà cần máy bền' },
      { title: 'Quạt tháp thông minh Xiaomi Smart Tower Fan 2', brand: 'Xiaomi', price: 2390000, spec: 'Điều khiển app, gió tự nhiên', useCase: 'phòng ngủ yên tĩnh' },
      { title: 'Quạt đứng Panasonic F-409K', brand: 'Panasonic', price: 1490000, spec: '3 tốc độ, đảo gió', useCase: 'dùng hằng ngày' },
      { title: 'Quạt lửng Mitsubishi LV16-RA', brand: 'Mitsubishi', price: 1790000, spec: 'Động cơ bền, gió êm', useCase: 'phòng khách nhỏ' },
      { title: 'Quạt đứng Senko LTS1636', brand: 'Senko', price: 490000, spec: '3 cánh, 3 tốc độ', useCase: 'ngân sách thấp' },
      { title: 'Quạt DC Toshiba F-LSD10', brand: 'Toshiba', price: 1990000, spec: 'Động cơ DC, tiết kiệm điện', useCase: 'dùng lâu trong phòng ngủ' },
      { title: 'Quạt đứng Sharp PJ-T40RV-LG', brand: 'Sharp', price: 1590000, spec: 'Điều khiển từ xa, hẹn giờ', useCase: 'phòng sinh hoạt chung' },
      { title: 'Máy sưởi gốm Rapido Turbo 6000D', brand: 'Rapido', price: 1890000, spec: 'Sưởi gốm, chống quá nhiệt', useCase: 'mùa lạnh phía Bắc' },
      { title: 'Máy sưởi dầu Delites BR-A12', brand: 'Delites', price: 2190000, spec: '12 thanh sưởi, không đốt oxy', useCase: 'phòng ngủ mùa lạnh' },
      { title: 'Quạt sưởi Kangaroo KG730', brand: 'Kangaroo', price: 690000, spec: 'Sưởi nhanh, gọn nhẹ', useCase: 'bàn làm việc' },
      { title: 'Quạt hộp Sunhouse SHD7006', brand: 'Sunhouse', price: 590000, spec: 'Gọn, an toàn cho trẻ', useCase: 'phòng ngủ nhỏ' },
      { title: 'Quạt điều hòa Daewoo DWF-KA451', brand: 'Daewoo', price: 3490000, spec: '45 lít, remote', useCase: 'căn hộ cần làm mát nhanh' },
    ],
  },
];

const products = catalogGroups.flatMap((group, index) => toSeedProducts(group).slice(0, index === 0 ? 16 : 14));
const productIds = products.map((product) => product.id);

await prisma.cartItem.deleteMany({ where: { productId: { notIn: productIds } } });
await prisma.productEmbedding.deleteMany({ where: { productId: { notIn: productIds } } });
await prisma.productSearchDocument.deleteMany({ where: { productId: { notIn: productIds } } });
await prisma.product.deleteMany({ where: { id: { notIn: productIds } } });

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
    content: 'Phòng 15-22m2 nên chọn máy mini, phòng 25-35m2 nên chọn máy có HEPA H13 hoặc CADR cao hơn, phòng trên 40m2 nên chọn dòng công suất lớn.',
    trustLevel: 'official',
  },
  {
    id: 'store_profile_retailhome',
    type: 'store',
    title: 'Giới thiệu RetailHome',
    content: 'RetailHome là cửa hàng gia dụng và smart-home tập trung vào máy lọc không khí, thiết bị bếp, vệ sinh nhà cửa, camera an ninh, chăm sóc cá nhân và thiết bị làm mát. Tư vấn phải đi từ nhu cầu, diện tích, ngân sách, thói quen dùng, sau đó hướng dẫn chọn sản phẩm, chính sách mua hàng, giao nhận và hậu mãi.',
    trustLevel: 'official',
  },
  {
    id: 'store_contact_channels',
    type: 'support',
    title: 'Kênh liên hệ và giờ hỗ trợ',
    content: 'RetailHome hỗ trợ qua chat website, hotline 1900 2026, email cskh@retailhome.vn và quầy bảo hành tại 12 Nguyễn Trãi, Quận 1. Giờ hỗ trợ 8:00-21:30 hằng ngày; yêu cầu bảo hành, đổi trả và thiếu phụ kiện được tiếp nhận trong cùng ngày làm việc.',
    trustLevel: 'official',
  },
  {
    id: 'policy_returns_7_days',
    type: 'policy',
    title: 'Chính sách đổi trả 7 ngày',
    content: 'Khách được đổi trả trong 7 ngày từ lúc nhận hàng nếu sản phẩm lỗi nhà sản xuất, giao sai mẫu, thiếu phụ kiện chính hoặc không đúng mô tả trên đơn. Sản phẩm cần còn số serial, phụ kiện kèm theo và hóa đơn điện tử. Đơn đã bàn giao vận chuyển không thể sửa sản phẩm trực tiếp trên đơn cũ; cần tạo yêu cầu đổi trả hoặc đơn mới.',
    trustLevel: 'official',
  },
  {
    id: 'policy_refund_3_7_days',
    type: 'policy',
    title: 'Thời gian hoàn tiền',
    content: 'Hoàn tiền sau khi kho xác nhận hàng hoàn đủ điều kiện. Thanh toán ví/thẻ hoàn trong 3-7 ngày làm việc, chuyển khoản hoàn trong 1-3 ngày làm việc, COD hoàn qua tài khoản ngân hàng khách cung cấp. Phí vận chuyển chỉ hoàn nếu lỗi thuộc RetailHome hoặc nhà sản xuất.',
    trustLevel: 'official',
  },
  {
    id: 'policy_warranty_standard',
    type: 'warranty',
    title: 'Bảo hành tiêu chuẩn đồ gia dụng',
    content: 'Hầu hết sản phẩm gia dụng có bảo hành 12-24 tháng theo hãng. RetailHome hỗ trợ kiểm tra serial, tạo phiếu bảo hành, điều phối gửi trung tâm hãng và theo dõi tiến độ. Bảo hành không áp dụng cho rơi vỡ, vào nước sai hướng dẫn, tự tháo máy, hao mòn vật tư như lõi lọc, pin, chổi quét, gioăng hoặc phụ kiện tiêu hao.',
    trustLevel: 'official',
  },
  {
    id: 'policy_warranty_air_purifier_filters',
    type: 'warranty',
    title: 'Bảo hành máy lọc không khí và lõi lọc',
    content: 'Máy lọc không khí bảo hành thân máy, cảm biến và bo mạch theo hãng; lõi lọc là vật tư tiêu hao nên không bảo hành hao mòn thông thường. Khi khách than máy báo lỗi bụi, mùi lạ hoặc tiếng ồn, hướng dẫn kiểm tra màng bọc lõi, vệ sinh cảm biến, đặt máy cách tường tối thiểu 20 cm rồi mới tạo phiếu kỹ thuật.',
    trustLevel: 'official',
  },
  {
    id: 'policy_shipping_hcm_hanoi',
    type: 'shipping',
    title: 'Giao hàng nội thành',
    content: 'Đơn nội thành TP.HCM và Hà Nội giao trong 2-24 giờ tùy tồn kho. Miễn phí giao hàng cho đơn từ 1.000.000 VND trong nội thành; đơn dưới mức này tính phí 25.000-45.000 VND. Hàng cồng kềnh như quạt điều hòa, robot trạm sạc lớn hoặc máy lọc phòng lớn có thể hẹn khung giờ giao riêng.',
    trustLevel: 'official',
  },
  {
    id: 'policy_shipping_province',
    type: 'shipping',
    title: 'Giao hàng tỉnh và kiểm tra hàng',
    content: 'Đơn tỉnh giao 2-5 ngày làm việc qua đối tác vận chuyển. Khách được đồng kiểm ngoại quan, model, phụ kiện và tình trạng móp vỡ trước khi ký nhận. Nếu phát hiện sai hàng hoặc móp vỡ, khách nên từ chối nhận và báo RetailHome ngay trong 24 giờ kèm ảnh kiện hàng.',
    trustLevel: 'official',
  },
  {
    id: 'policy_payment_methods',
    type: 'payment',
    title: 'Thanh toán',
    content: 'RetailHome hỗ trợ COD, chuyển khoản, thẻ nội địa, thẻ quốc tế, ví điện tử và thanh toán tại cửa hàng. Đơn giá trị cao có thể đặt cọc để giữ hàng. Không gửi link thanh toán qua tên miền lạ; nhân viên chỉ dùng cổng thanh toán RetailHome hoặc mã QR tài khoản công ty.',
    trustLevel: 'official',
  },
  {
    id: 'policy_installation_smart_home',
    type: 'after_sales',
    title: 'Lắp đặt và hướng dẫn smart-home',
    content: 'Camera, cảm biến cửa, hub, robot hút bụi và thiết bị app có thể được hỗ trợ cài đặt cơ bản: kết nối Wi-Fi 2.4 GHz, tạo tài khoản app, ghép thiết bị, kiểm tra firmware và hướng dẫn chia sẻ quyền dùng. Dịch vụ lắp đặt nâng cao tại nhà cần đặt lịch trước và báo phí theo khu vực.',
    trustLevel: 'official',
  },
  {
    id: 'policy_after_sales_30_days',
    type: 'after_sales',
    title: 'Hậu mãi 30 ngày đầu',
    content: 'Trong 30 ngày đầu, khách có thể nhắn lại để được hướng dẫn sử dụng, vệ sinh, thay lõi, tối ưu vị trí đặt máy, xử lý lỗi app và chọn phụ kiện phù hợp. Với sản phẩm cần bảo trì như robot hút bụi, máy lọc không khí, máy xay và nồi chiên, tư vấn phải nhắc lịch vệ sinh hoặc thay vật tư nếu liên quan.',
    trustLevel: 'official',
  },
  {
    id: 'promotion_bundle_filters',
    type: 'promotion',
    title: 'Ưu đãi combo vật tư',
    content: 'Khi mua máy lọc không khí, robot hút bụi hoặc máy hút bụi, khách có thể được gợi ý combo lõi lọc, chổi quét, túi bụi, khăn lau hoặc dung dịch vệ sinh nếu phù hợp. Không tự hứa giảm giá cố định; chỉ nói có thể kiểm tra ưu đãi hiện hành trong giỏ hoặc tại bước thanh toán.',
    trustLevel: 'official',
  },
  {
    id: 'promotion_large_order',
    type: 'promotion',
    title: 'Ưu đãi đơn hàng lớn',
    content: 'Đơn từ 10 triệu hoặc mua nhiều thiết bị cho căn hộ, văn phòng, homestay có thể chuyển CSKH kiểm tra ưu đãi gói, giao cùng lịch và hỗ trợ xuất hóa đơn VAT. Nhân viên cần hỏi số lượng, địa chỉ giao, thời hạn cần hàng và nhóm sản phẩm quan tâm.',
    trustLevel: 'official',
  },
  {
    id: 'faq_air_purifier_room_size',
    type: 'faq',
    title: 'Chọn máy lọc theo diện tích phòng',
    content: 'Phòng dưới 17m2 nên chọn máy mini để bàn hoặc phòng ngủ nhỏ. Phòng 25-35m2 nên ưu tiên HEPA H13, CADR phù hợp và cảm biến bụi. Phòng trên 40m2 nên chọn dòng công suất lớn hoặc nhiều máy theo từng khu vực. Nếu nhà có trẻ nhỏ, thú cưng hoặc gần đường lớn, nên ưu tiên lọc bụi mịn và vận hành êm.',
    trustLevel: 'official',
  },
  {
    id: 'faq_kitchen_appliance_guidance',
    type: 'faq',
    title: 'Tư vấn thiết bị bếp gia dụng',
    content: 'Nồi cơm nên hỏi số người ăn, dung tích, nhu cầu nấu nhanh hay cơm ngon ổn định. Nồi chiên không dầu nên hỏi dung tích, cửa kính, điều khiển cơ hay điện tử. Máy xay và máy ép nên hỏi công suất, loại cối, nhu cầu xay đá, xay gia vị hay ép chậm. Tư vấn phải ưu tiên đúng loại sản phẩm khách hỏi.',
    trustLevel: 'official',
  },
  {
    id: 'faq_complaint_resolution_flow',
    type: 'support',
    title: 'Quy trình xử lý khiếu nại',
    content: 'Khi khách báo lỗi, giao sai, thiếu phụ kiện hoặc chưa nhận hàng, nhân viên cần xin mã đơn hoặc số điện thoại, xác định tình trạng, yêu cầu ảnh/video nếu cần, tạo ticket CSKH, nêu mốc phản hồi dự kiến và không đổ lỗi cho khách hay hãng. Với lỗi nghiêm trọng, ưu tiên đổi mới nếu còn trong 7 ngày và đủ điều kiện.',
    trustLevel: 'official',
  },
];

await prisma.knowledgeDocument.deleteMany({ where: { id: { notIn: knowledgeDocuments.map((document) => document.id) } } });

for (const document of knowledgeDocuments) {
  await prisma.knowledgeDocument.upsert({
    where: { id: document.id },
    update: document,
    create: document,
  });
}

await prisma.$disconnect();

function toSeedProducts(group: CatalogGroup): SeedProduct[] {
  return group.products.map((product, index) => {
    const id = product.id ?? `prod_${group.key}_${String(index + 1).padStart(2, '0')}`;
    const imageUrl = group.imageUrls[index % group.imageUrls.length];
    const sourceUrl = product.sourceUrl ?? group.sourceUrl;
    const inventory = 8 + ((index + 3) * 11) % 73;
    return {
      id,
      title: product.title,
      brand: product.brand,
      category: group.category,
      price: product.price,
      inventory,
      attributes: {
        spec: product.spec,
        useCase: product.useCase,
        warranty: index % 3 === 0 ? '24 tháng' : '12 tháng',
        sourceName: group.sourceName,
        sourceUrl,
        imageUrl,
        imageSource: imageUrl.includes('tgdd.vn') ? 'TGDD CDN' : 'Unsplash',
        dataSnapshot: '2026-05-25',
      },
      description: `${product.title} thuộc nhóm ${group.category.toLowerCase()} của ${product.brand}, phù hợp cho ${product.useCase}. Sản phẩm có giá tham khảo rõ ràng, thông số nổi bật và nguồn tham khảo để khách hàng dễ so sánh trước khi mua.`,
    };
  });
}

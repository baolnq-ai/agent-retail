import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NTC AI Retail Agent',
    short_name: 'NTC AI',
    description: 'Nền tảng retail agent cho catalog, giỏ hàng, tư vấn sản phẩm và dashboard pipeline AI.',
    start_url: '/',
    display: 'standalone',
    background_color: '#050806',
    theme_color: '#050806',
    icons: [
      {
        src: '/logo.png',
        sizes: '128x128',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '128x128',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from './app-shell.js';
import './styles.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://127.0.0.1:3120';
const siteTitle = 'NTC Store';
const siteDescription = 'Cửa hàng gia dụng thông minh với tìm kiếm nhanh, giỏ hàng theo tài khoản và trợ lý mua sắm.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteTitle,
  title: {
    default: siteTitle,
    template: `%s | ${siteTitle}`,
  },
  description: siteDescription,
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: '/',
    siteName: siteTitle,
    title: siteTitle,
    description: siteDescription,
    images: [{ url: '/og-image.png', width: 128, height: 128, alt: siteTitle }],
  },
  twitter: {
    card: 'summary',
    title: siteTitle,
    description: siteDescription,
    images: ['/og-image.png'],
  },
  alternates: { canonical: '/' },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}

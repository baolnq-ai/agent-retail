import type { ReactNode } from 'react';
import { AppShell } from './app-shell.js';
import './styles.css';

export const metadata = {
  title: 'Trợ lý bán lẻ AI',
  description: 'Trải nghiệm mua sắm với chatbot tư vấn bán hàng',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'QR Menu Admin',
  description: 'Manage your restaurant QR menu',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

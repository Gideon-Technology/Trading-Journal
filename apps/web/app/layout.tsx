import type { Metadata } from 'next';
import './globals.css';
import { Shell } from '@/components/Shell';

export const metadata: Metadata = {
  title: 'G-Trade — Professional Forex Trading Journal',
  description: 'Track, review, and improve your forex trading performance.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg-base text-text">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}

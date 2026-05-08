import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '@/components/Nav';

export const metadata: Metadata = {
  title: 'FX Journal — Professional Forex Trading Journal',
  description: 'Track, review, and improve your forex trading performance.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg-base text-text min-h-screen">
        <Nav />
        <main className="ml-56 min-h-screen">
          <div className="max-w-7xl mx-auto px-6 py-6">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}

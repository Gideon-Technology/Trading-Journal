'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useJournalStore } from '@/lib/store';
import type { Trade } from '@forex-journal/shared';

function needsReview(trade: Trade): boolean {
  if (trade.reviewStatus === 'REVIEWED') return false;
  if (!trade.wentWell) return true;
  if (!trade.improvement) return true;
  if ((trade.qualityScore?.total ?? 0) < 5) return true;
  if (trade.followedPlan === 'NO') return true;
  if (trade.psychology?.revengeTrade) return true;
  if (trade.reviewStatus === 'FLAGGED') return true;
  return false;
}

const NAV_LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/trades/new', label: 'New Trade' },
  { href: '/trades', label: 'Trade History' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/risk', label: 'Risk Dashboard' },
  { href: '/review-queue', label: 'Review Queue', badge: true },
  { href: '/calendar', label: 'Calendar' },
  { href: '/review/daily', label: 'Daily Review' },
  { href: '/review/weekly', label: 'Weekly Review' },
  { href: '/review/monthly', label: 'Monthly Review' },
  { href: '/settings', label: 'Import / Export' },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const trades = useJournalStore(s => s.trades);
  const reviewCount = useMemo(() => trades.filter(needsReview).length, [trades]);

  // Close sidebar on route change (mobile)
  useEffect(() => { setOpen(false); }, [pathname]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="min-h-screen bg-bg-base">

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed left-0 top-0 h-full w-56 bg-bg-card border-r border-bg-border flex flex-col z-30 transition-transform duration-200',
        open ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0'
      )}>
        {/* Sidebar header */}
        <div className="px-5 py-5 border-b border-bg-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-accent text-xl">📈</span>
            <div>
              <p className="text-text font-semibold text-sm leading-tight">G-Trade</p>
              <p className="text-muted text-xs">Pro Trading Journal</p>
            </div>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={() => setOpen(false)}
            className="lg:hidden text-muted hover:text-text p-1 rounded hover:bg-bg-elevated transition-colors"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-3">
          <p className="px-4 py-1 text-muted text-xs font-semibold uppercase tracking-wider mb-1">Menu</p>
          {NAV_LINKS.map(({ href, label, badge }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center justify-between gap-3 px-4 py-2.5 text-sm rounded-md mx-2 transition-colors',
                  active
                    ? 'bg-accent/10 text-accent font-medium'
                    : 'text-muted hover:text-text hover:bg-bg-elevated'
                )}
              >
                <span>{label}</span>
                {badge && reviewCount > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-loss text-white text-xs flex items-center justify-center font-semibold">
                    {reviewCount > 99 ? '99+' : reviewCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-bg-border">
          <p className="text-muted text-xs">All data stored locally.</p>
          <p className="text-muted text-xs">Export regularly to back up.</p>
        </div>
      </aside>

      {/* Main area */}
      <div className="lg:ml-56 min-h-screen flex flex-col">

        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-bg-base border-b border-bg-border px-4 py-3 flex items-center gap-3 lg:hidden">
          <button
            onClick={() => setOpen(true)}
            className="text-muted hover:text-text p-1.5 rounded hover:bg-bg-elevated transition-colors"
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <rect y="3" width="20" height="2" rx="1" />
              <rect y="9" width="20" height="2" rx="1" />
              <rect y="15" width="20" height="2" rx="1" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-accent">📈</span>
            <span className="text-text font-semibold text-sm">G-Trade</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 py-5 md:px-6 md:py-6 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

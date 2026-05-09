'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useJournalStore } from '@/lib/store';
import type { Trade } from '@forex-journal/shared';
import { AUTOMATION_LEVEL_LABELS } from '@forex-journal/shared';

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
  { href: '/command-center', label: 'Command Center', group: 'Core' },
  { href: '/plan', label: 'Trade Plan', group: 'Core' },
  { href: '/', label: 'Dashboard', group: 'Core' },
  { href: '/trades/new', label: 'New Trade', group: 'Core' },
  { href: '/quick-log', label: 'Quick Log', group: 'Core' },
  { href: '/trades', label: 'Trade History', group: 'Core' },
  { href: '/analytics', label: 'Analytics', group: 'Core' },
  { href: '/playbook', label: 'Playbook', group: 'Core' },
  { href: '/risk', label: 'Risk Dashboard', group: 'Core' },
  { href: '/calendar', label: 'Calendar', group: 'Core' },
  { href: '/review-queue', label: 'Review Queue', badge: true, group: 'Core' },
  { href: '/import-review', label: 'Import Review', group: 'Core' },
  { href: '/review/daily', label: 'Daily Review', group: 'Core' },
  { href: '/review/weekly', label: 'Weekly Review', group: 'Core' },
  { href: '/review/monthly', label: 'Monthly Review', group: 'Core' },
  { href: '/settings', label: 'Import / Export', group: 'Core' },
  // Automation
  { href: '/signals', label: 'Signals', group: 'Automation' },
  { href: '/import/tradingview', label: 'Import Alert', group: 'Automation' },
  { href: '/paper', label: 'Paper Trading', group: 'Automation' },
  { href: '/approvals', label: 'Approvals', group: 'Automation', approvalBadge: true },
  { href: '/automation-rules', label: 'Automation Rules', group: 'Automation' },
  { href: '/ai-coach', label: 'AI Coach', group: 'Automation' },
  { href: '/audit-log', label: 'Audit Log', group: 'Automation' },
] satisfies ReadonlyArray<{ href: string; label: string; group: 'Core' | 'Automation'; badge?: boolean; approvalBadge?: boolean }>;

export function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const trades = useJournalStore(s => s.trades);
  const signals = useJournalStore(s => s.signals);
  const automationRules = useJournalStore(s => s.automationRules);
  const reviewCount = useMemo(() => trades.filter(needsReview).length, [trades]);
  const pendingApprovals = useMemo(() => signals.filter(s => s.approvalStatus === 'PENDING').length, [signals]);

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

        {/* Kill switch banner */}
        {automationRules.killSwitchEnabled && (
          <div className="mx-2 my-2 px-3 py-2 bg-red-900/40 border border-red-700 rounded-lg">
            <p className="text-red-400 text-xs font-bold">⚠ KILL SWITCH ACTIVE</p>
            <a href="/automation-rules" className="text-red-300 text-xs hover:underline">Deactivate →</a>
          </div>
        )}

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-3">
          {(['Core', 'Automation'] as const).map(group => (
            <div key={group}>
              <p className="px-4 pt-2 pb-1 text-muted text-xs font-semibold uppercase tracking-wider">{group}</p>
              {NAV_LINKS.filter(l => l.group === group).map(({ href, label, badge, approvalBadge }) => {
                const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
                const count = badge ? reviewCount : approvalBadge ? pendingApprovals : 0;
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
                    {count > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-loss text-white text-xs flex items-center justify-center font-semibold">
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
          {/* Automation level indicator */}
          <div className="px-4 pt-3 pb-1">
            <p className="text-muted text-xs">Level {automationRules.allowedAutomationLevel}: {AUTOMATION_LEVEL_LABELS[automationRules.allowedAutomationLevel]}</p>
          </div>
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

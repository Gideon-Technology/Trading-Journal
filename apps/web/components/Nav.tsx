'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const links = [
  { href: '/', label: 'Dashboard', icon: '⬛' },
  { href: '/trades/new', label: 'New Trade', icon: '＋' },
  { href: '/trades', label: 'Trade History', icon: '≡' },
  { href: '/analytics', label: 'Analytics', icon: '◈' },
  { href: '/review/daily', label: 'Daily Review', icon: '◷' },
  { href: '/review/weekly', label: 'Weekly', icon: '◈' },
  { href: '/review/monthly', label: 'Monthly', icon: '◉' },
  { href: '/settings', label: 'Import / Export', icon: '⇅' },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-bg-card border-r border-bg-border flex flex-col z-10">
      <div className="px-5 py-5 border-b border-bg-border">
        <div className="flex items-center gap-2">
          <span className="text-accent text-xl">📈</span>
          <div>
            <p className="text-text font-semibold text-sm leading-tight">G-Trade</p>
            <p className="text-muted text-xs">Pro Trading Journal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        <p className="px-4 py-1 text-muted text-xs font-semibold uppercase tracking-wider mb-1">Menu</p>
        {links.map(({ href, label }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 text-sm rounded-md mx-2 transition-colors',
                active
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-muted hover:text-text hover:bg-bg-elevated'
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-bg-border">
        <p className="text-muted text-xs">All data stored locally.</p>
        <p className="text-muted text-xs">Export regularly to back up.</p>
      </div>
    </aside>
  );
}

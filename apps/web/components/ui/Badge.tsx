import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'win' | 'loss' | 'breakeven' | 'accent' | 'muted';
}

export function Badge({ children, className, variant = 'muted' }: BadgeProps) {
  const variants = {
    win: 'bg-win/10 text-win border border-win/20',
    loss: 'bg-loss/10 text-loss border border-loss/20',
    breakeven: 'bg-breakeven/10 text-breakeven border border-breakeven/20',
    accent: 'bg-accent/10 text-accent border border-accent/20',
    muted: 'bg-bg-elevated text-muted border border-bg-border',
  };

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
}

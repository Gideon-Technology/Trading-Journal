import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  valueClass?: string;
}

export function StatCard({ label, value, sub, valueClass }: StatCardProps) {
  return (
    <div className="bg-bg-card border border-bg-border rounded-lg p-4">
      <p className="text-muted text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className={cn('text-2xl font-bold font-mono', valueClass ?? 'text-text')}>{value}</p>
      {sub && <p className="text-muted text-xs mt-1">{sub}</p>}
    </div>
  );
}

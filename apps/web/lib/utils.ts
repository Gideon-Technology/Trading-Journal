import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs.toFixed(2);
  return value >= 0 ? `+$${formatted}` : `-$${formatted}`;
}

export function formatPips(value: number): string {
  return value >= 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
}

export function outcomeColor(outcome: string): string {
  if (outcome === 'WIN') return 'text-win';
  if (outcome === 'LOSS') return 'text-loss';
  return 'text-breakeven';
}

export function outcomeBg(outcome: string): string {
  if (outcome === 'WIN') return 'bg-win/10 text-win border border-win/20';
  if (outcome === 'LOSS') return 'bg-loss/10 text-loss border border-loss/20';
  return 'bg-breakeven/10 text-breakeven border border-breakeven/20';
}

export function scoreColor(score: number): string {
  if (score <= 4) return 'text-loss';
  if (score <= 6) return 'text-breakeven';
  if (score <= 8) return 'text-win';
  return 'text-accent';
}

export function scoreBg(score: number): string {
  if (score <= 4) return 'bg-loss/10 text-loss border border-loss/20';
  if (score <= 6) return 'bg-breakeven/10 text-breakeven border border-breakeven/20';
  if (score <= 8) return 'bg-win/10 text-win border border-win/20';
  return 'bg-accent/10 text-accent border border-accent/20';
}

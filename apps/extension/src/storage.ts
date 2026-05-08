import type { Trade } from '@forex-journal/shared';

const KEY = 'fx-journal-trades';

export function getTrades(): Trade[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveTrades(trades: Trade[]): void {
  localStorage.setItem(KEY, JSON.stringify(trades));
}

export function addTrade(trade: Trade): void {
  const trades = getTrades();
  saveTrades([trade, ...trades]);
}

export function exportToJSON(): string {
  return JSON.stringify({ trades: getTrades() }, null, 2);
}

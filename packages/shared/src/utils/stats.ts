import type { Trade } from '../types/trade';

export interface TradeStats {
  totalTrades: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: number;
  totalPnlDollar: number;
  totalPnlPips: number;
  avgRR: number;
  avgQualityScore: number;
  bestPair: string;
  worstPair: string;
  bestSession: string;
  worstSession: string;
  mostProfitableSetup: string;
  mostRepeatedMistake: string;
}

export function computeStats(trades: Trade[]): TradeStats {
  if (!trades.length) return emptyStats();

  const wins = trades.filter(t => t.outcome === 'WIN').length;
  const losses = trades.filter(t => t.outcome === 'LOSS').length;
  const breakevens = trades.filter(t => t.outcome === 'BREAKEVEN').length;

  const totalPnlDollar = trades.reduce((s, t) => s + (t.profitLossDollar ?? 0), 0);
  const totalPnlPips = trades.reduce((s, t) => s + (t.profitLossPips ?? 0), 0);
  const avgRR = average(trades.map(t => t.rrAchieved ?? 0));
  const avgQualityScore = average(trades.map(t => t.qualityScore?.total ?? 0));

  return {
    totalTrades: trades.length,
    wins,
    losses,
    breakevens,
    winRate: trades.length ? (wins / trades.length) * 100 : 0,
    totalPnlDollar,
    totalPnlPips,
    avgRR,
    avgQualityScore,
    bestPair: bestByPnl(trades),
    worstPair: worstByPnl(trades),
    bestSession: bestSessionByWinRate(trades),
    worstSession: worstSessionByWinRate(trades),
    mostProfitableSetup: bestSetup(trades),
    mostRepeatedMistake: topMistake(trades),
  };
}

function average(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = key(item);
    (acc[k] = acc[k] ?? []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

function bestByPnl(trades: Trade[]): string {
  const groups = groupBy(trades, t => t.pair);
  let best = '';
  let bestPnl = -Infinity;
  for (const [pair, ts] of Object.entries(groups)) {
    const pnl = ts.reduce((s, t) => s + (t.profitLossDollar ?? 0), 0);
    if (pnl > bestPnl) { bestPnl = pnl; best = pair; }
  }
  return best;
}

function worstByPnl(trades: Trade[]): string {
  const groups = groupBy(trades, t => t.pair);
  let worst = '';
  let worstPnl = Infinity;
  for (const [pair, ts] of Object.entries(groups)) {
    const pnl = ts.reduce((s, t) => s + (t.profitLossDollar ?? 0), 0);
    if (pnl < worstPnl) { worstPnl = pnl; worst = pair; }
  }
  return worst;
}

function bestSessionByWinRate(trades: Trade[]): string {
  const groups = groupBy(trades, t => t.session);
  let best = '';
  let bestRate = -1;
  for (const [session, ts] of Object.entries(groups)) {
    const rate = ts.filter(t => t.outcome === 'WIN').length / ts.length;
    if (rate > bestRate) { bestRate = rate; best = session; }
  }
  return best;
}

function worstSessionByWinRate(trades: Trade[]): string {
  const groups = groupBy(trades, t => t.session);
  let worst = '';
  let worstRate = Infinity;
  for (const [session, ts] of Object.entries(groups)) {
    const rate = ts.filter(t => t.outcome === 'WIN').length / ts.length;
    if (rate < worstRate) { worstRate = rate; worst = session; }
  }
  return worst;
}

function bestSetup(trades: Trade[]): string {
  const groups = groupBy(trades, t => t.setupType);
  let best = '';
  let bestPnl = -Infinity;
  for (const [setup, ts] of Object.entries(groups)) {
    const pnl = ts.reduce((s, t) => s + (t.profitLossDollar ?? 0), 0);
    if (pnl > bestPnl) { bestPnl = pnl; best = setup; }
  }
  return best;
}

function topMistake(trades: Trade[]): string {
  const counts: Record<string, number> = {};
  for (const trade of trades) {
    if (!trade.mistakes) continue;
    for (const [key, val] of Object.entries(trade.mistakes)) {
      if (val) counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'None';
}

function emptyStats(): TradeStats {
  return {
    totalTrades: 0, wins: 0, losses: 0, breakevens: 0,
    winRate: 0, totalPnlDollar: 0, totalPnlPips: 0,
    avgRR: 0, avgQualityScore: 0,
    bestPair: '—', worstPair: '—',
    bestSession: '—', worstSession: '—',
    mostProfitableSetup: '—', mostRepeatedMistake: '—',
  };
}

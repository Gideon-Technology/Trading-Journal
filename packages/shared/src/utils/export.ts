import type { Trade } from '../types/trade';

export function tradesToCSV(trades: Trade[]): string {
  if (!trades.length) return '';

  const headers = [
    'Date', 'Session', 'Pair', 'Direction', 'Setup', 'Market Condition',
    'Entry', 'Stop Loss', 'TP1', 'TP2', 'TP3', 'Lot Size',
    'Risk %', 'Risk $', 'Outcome', 'P&L ($)', 'P&L (pips)',
    'RR Targeted', 'RR Achieved', 'Quality Score', 'Followed Plan',
    'Entry Reason', 'Went Well', 'Improvement',
  ];

  const rows = trades.map(t => [
    t.date, t.session, t.pair, t.direction, t.setupType, t.marketCondition,
    t.entryPrice, t.stopLoss, t.tp1, t.tp2, t.tp3, t.lotSize,
    t.riskPercent, t.riskAmount, t.outcome, t.profitLossDollar, t.profitLossPips,
    t.rrTargeted, t.rrAchieved, t.qualityScore?.total ?? 0, t.followedPlan,
    `"${(t.entryReason ?? '').replace(/"/g, '""')}"`,
    `"${(t.wentWell ?? '').replace(/"/g, '""')}"`,
    `"${(t.improvement ?? '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function exportJSON(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

export function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

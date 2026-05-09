import type { Signal } from '../types/signal';

export interface SignalStats {
  total: number;
  byStatus: Record<string, number>;
  winRate: number;           // 0–100
  paperWinRate: number;      // 0–100 (paper-only)
  avgConfidenceScore: number;
  avgAiScore: number;
  avgFinalScore: number;
  totalPaperPnl: number;
  totalPaperWins: number;
  totalPaperLosses: number;
  confirmationHitRate: Record<string, number>;  // liq/fvg/etc → %
  topSetupTypes: Array<{ type: string; count: number; winRate: number }>;
}

export function calculateSignalStats(signals: Signal[]): SignalStats {
  const total = signals.length;
  const byStatus: Record<string, number> = {};

  let winCount = 0, lossCount = 0;
  let paperWins = 0, paperLosses = 0;
  let sumConf = 0, sumAi = 0, sumFinal = 0;
  let confCount = 0, aiCount = 0, finalCount = 0;
  let totalPaperPnl = 0;

  const confirmationCounts = { liq: 0, fvg: 0, br: 0, sr: 0, rc: 0 };
  const setupMap: Record<string, { wins: number; total: number }> = {};

  for (const s of signals) {
    byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;

    if (s.status === 'WON') winCount++;
    if (s.status === 'LOST') lossCount++;

    if (s.paperMode) {
      if (s.paperOutcome === 'WIN') paperWins++;
      if (s.paperOutcome === 'LOSS') paperLosses++;
      if (typeof s.paperProfitLossDollar === 'number') totalPaperPnl += s.paperProfitLossDollar;
    }

    if (typeof s.confidenceScore === 'number') { sumConf += s.confidenceScore; confCount++; }
    if (typeof s.aiScore === 'number') { sumAi += s.aiScore; aiCount++; }
    if (typeof s.finalScore === 'number') { sumFinal += s.finalScore; finalCount++; }

    if (s.liquiditySwept) confirmationCounts.liq++;
    if (s.fvgPresent) confirmationCounts.fvg++;
    if (s.breakRetestConfirmed) confirmationCounts.br++;
    if (s.srRespected) confirmationCounts.sr++;
    if (s.rejectionCandle) confirmationCounts.rc++;

    const setup = s.signalType ?? 'Unknown';
    if (!setupMap[setup]) setupMap[setup] = { wins: 0, total: 0 };
    setupMap[setup].total++;
    if (s.status === 'WON' || s.paperOutcome === 'WIN') setupMap[setup].wins++;
  }

  const resolved = winCount + lossCount;
  const paperResolved = paperWins + paperLosses;

  const confirmationHitRate: Record<string, number> = {};
  if (total > 0) {
    confirmationHitRate.liquiditySwept = Math.round((confirmationCounts.liq / total) * 100);
    confirmationHitRate.fvgPresent = Math.round((confirmationCounts.fvg / total) * 100);
    confirmationHitRate.breakRetestConfirmed = Math.round((confirmationCounts.br / total) * 100);
    confirmationHitRate.srRespected = Math.round((confirmationCounts.sr / total) * 100);
    confirmationHitRate.rejectionCandle = Math.round((confirmationCounts.rc / total) * 100);
  }

  const topSetupTypes = Object.entries(setupMap)
    .map(([type, { wins, total: t }]) => ({
      type,
      count: t,
      winRate: t > 0 ? Math.round((wins / t) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    total,
    byStatus,
    winRate: resolved > 0 ? Math.round((winCount / resolved) * 100) : 0,
    paperWinRate: paperResolved > 0 ? Math.round((paperWins / paperResolved) * 100) : 0,
    avgConfidenceScore: confCount > 0 ? Math.round((sumConf / confCount) * 10) / 10 : 0,
    avgAiScore: aiCount > 0 ? Math.round((sumAi / aiCount) * 10) / 10 : 0,
    avgFinalScore: finalCount > 0 ? Math.round((sumFinal / finalCount) * 10) / 10 : 0,
    totalPaperPnl: Math.round(totalPaperPnl * 100) / 100,
    totalPaperWins: paperWins,
    totalPaperLosses: paperLosses,
    confirmationHitRate,
    topSetupTypes,
  };
}

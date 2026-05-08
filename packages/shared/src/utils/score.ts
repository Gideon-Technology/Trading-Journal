import type { Trade, QualityScore } from '../types/trade';

export function calculateQualityScore(trade: Partial<Trade>): QualityScore {
  const c = trade.checklist;
  const m = trade.management;
  const p = trade.psychology;

  const scores: QualityScore = {
    htfAligned: !!c?.priceWithHTF,
    liquiditySwept: !!c?.liquiditySwept,
    fvgPresent: !!c?.fvgPresent,
    breakAndRetest: !!c?.breakAndRetest,
    srRespected: !!(c?.supportLevel || c?.resistanceLevel),
    rejectionCandle: !!c?.rejectionCandle,
    rrMinimum: !!c?.rrMinimum,
    afterCandleClose: !!c?.afterCandleClose,
    noNewsConflict: !!c?.newsChecked,
    emotionControlled: p ? p.patience >= 4 && p.followedRiskRule && !p.revengeTrade : false,
    total: 0,
  };

  scores.total = Object.entries(scores)
    .filter(([key]) => key !== 'total')
    .reduce((sum, [, val]) => sum + (val ? 1 : 0), 0);

  return scores;
}

export function getScoreGrade(score: number): {
  label: string;
  color: string;
  description: string;
} {
  if (score <= 4) return { label: 'Poor', color: '#F85149', description: 'Do not increase size. Review setup criteria.' };
  if (score <= 6) return { label: 'Average', color: '#D29922', description: 'Acceptable but has gaps. Identify what was missing.' };
  if (score <= 8) return { label: 'Good', color: '#3FB950', description: 'Well-executed. Minor refinements possible.' };
  return { label: 'A+ Setup', color: '#58A6FF', description: 'Screenshot and study this trade. Repeat the process.' };
}

export function countMistakes(trade: Partial<Trade>): number {
  if (!trade.mistakes) return 0;
  return Object.values(trade.mistakes).filter(Boolean).length;
}

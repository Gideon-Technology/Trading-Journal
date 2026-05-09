import type { Signal } from '../types/signal';

interface SignalScoreBreakdown {
  total: number;           // 0–10
  confirmationPoints: number;
  riskRewardPoints: number;
  aiPoints: number;
  penaltyPoints: number;
  details: string[];
}

/**
 * Calculates a composite 0–10 signal score from confirmations, R:R, and AI.
 * Weights: confirmations 40%, R:R 30%, AI 30% (if available, else split 50/50).
 */
export function calculateSignalScore(signal: Partial<Signal>): SignalScoreBreakdown {
  const details: string[] = [];
  let penaltyPoints = 0;

  // ── Confirmation score (0–5 confirmations → scaled to 0–10) ──────────────
  const confirmations = [
    signal.liquiditySwept,
    signal.fvgPresent,
    signal.breakRetestConfirmed,
    signal.srRespected,
    signal.rejectionCandle,
  ].filter(Boolean).length;

  const confirmationScore = (confirmations / 5) * 10;
  details.push(`Confirmations: ${confirmations}/5 → ${confirmationScore.toFixed(1)}`);

  // ── R:R score ─────────────────────────────────────────────────────────────
  let rrScore = 0;
  if (signal.entryPrice && signal.stopLoss && signal.tp1) {
    const risk = Math.abs(signal.entryPrice - signal.stopLoss);
    const reward = Math.abs(signal.tp1 - signal.entryPrice);
    if (risk > 0) {
      const rr = reward / risk;
      if (rr >= 3) rrScore = 10;
      else if (rr >= 2.5) rrScore = 9;
      else if (rr >= 2) rrScore = 7.5;
      else if (rr >= 1.5) rrScore = 5;
      else if (rr >= 1) rrScore = 3;
      else rrScore = 1;
      details.push(`R:R ${rr.toFixed(2)}:1 → ${rrScore}`);
    }
  } else {
    details.push('R:R: insufficient price data');
  }

  // ── AI score ──────────────────────────────────────────────────────────────
  const hasAI = typeof signal.aiScore === 'number';
  const aiScore = hasAI ? signal.aiScore! : 0;
  if (hasAI) details.push(`AI score: ${aiScore}`);

  // ── Penalties ─────────────────────────────────────────────────────────────
  if (!signal.setupReason || signal.setupReason === 'Unknown') {
    penaltyPoints += 0.5;
    details.push('Penalty: missing setup reason -0.5');
  }
  if (!signal.timeframe || signal.timeframe === 'UNKNOWN') {
    penaltyPoints += 0.5;
    details.push('Penalty: missing timeframe -0.5');
  }

  // ── Weighted composite ────────────────────────────────────────────────────
  let total: number;
  if (hasAI) {
    total = confirmationScore * 0.4 + rrScore * 0.3 + aiScore * 0.3;
  } else {
    total = confirmationScore * 0.5 + rrScore * 0.5;
  }
  total = Math.max(0, total - penaltyPoints);
  total = Math.min(10, total);

  return {
    total: Math.round(total * 10) / 10,
    confirmationPoints: Math.round(confirmationScore * 10) / 10,
    riskRewardPoints: Math.round(rrScore * 10) / 10,
    aiPoints: Math.round(aiScore * 10) / 10,
    penaltyPoints,
    details,
  };
}

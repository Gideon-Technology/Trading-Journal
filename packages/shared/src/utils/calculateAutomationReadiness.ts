import type { Trade } from '../types/trade';
import type { Signal } from '../types/signal';
import type { AutomationReadinessResult, ReadinessGrade } from '../types/automation';

interface ReadinessInput {
  trades: Trade[];
  signals: Signal[];
  daysActive: number;
}

function gradeFromScore(score: number): ReadinessGrade {
  if (score < 40) return 'NOT_READY';
  if (score < 60) return 'COLLECTING_DATA';
  if (score < 75) return 'PAPER_ONLY';
  if (score < 90) return 'HUMAN_APPROVAL';
  return 'AUTOMATION_CANDIDATE';
}

/**
 * Calculates an automation readiness score (0–100) based on trade history,
 * signal data quality, and consistency.
 *
 * Categories (weights):
 *   - Data volume       20pts  (min 50 trades, 30 signals)
 *   - Win rate          20pts  (target ≥ 55%)
 *   - Risk discipline   20pts  (avg risk ≤ 1.5%, no outsized losses)
 *   - Consistency       20pts  (avg execution score ≥ 70)
 *   - Signal quality    20pts  (avg final score ≥ 7, confirmations present)
 */
export function calculateAutomationReadiness(input: ReadinessInput): AutomationReadinessResult {
  const { trades, signals, daysActive } = input;
  const reasons: string[] = [];
  const warnings: string[] = [];
  let score = 0;

  // ── 1. Data volume (20pts) ─────────────────────────────────────────────────
  const tradeVol = Math.min(20, (trades.length / 50) * 20);
  const signalVol = Math.min(5, (signals.length / 30) * 5);
  const daysVol = Math.min(5, (daysActive / 30) * 5);
  const volumeScore = tradeVol * 0.7 + signalVol * 0.15 + daysVol * 0.15;
  score += volumeScore;

  if (trades.length < 20) {
    reasons.push(`Insufficient trade history: ${trades.length} trades (need 50+)`);
  } else if (trades.length < 50) {
    warnings.push(`Trade history building: ${trades.length}/50 trades`);
  }
  if (signals.length < 10) {
    reasons.push(`Insufficient signal history: ${signals.length} signals (need 30+)`);
  }

  // ── 2. Win rate (20pts) ───────────────────────────────────────────────────
  const closedTrades = trades.filter(t => t.outcome === 'WIN' || t.outcome === 'LOSS');
  let winRateScore = 0;
  if (closedTrades.length >= 10) {
    const wins = closedTrades.filter(t => t.outcome === 'WIN').length;
    const winRate = wins / closedTrades.length;
    if (winRate >= 0.6) winRateScore = 20;
    else if (winRate >= 0.55) winRateScore = 16;
    else if (winRate >= 0.5) winRateScore = 12;
    else if (winRate >= 0.4) winRateScore = 6;
    else {
      reasons.push(`Win rate too low: ${Math.round(winRate * 100)}% (need ≥ 55%)`);
    }
  } else {
    warnings.push('Need at least 10 closed trades to assess win rate');
  }
  score += winRateScore;

  // ── 3. Risk discipline (20pts) ─────────────────────────────────────────────
  const tradesWithRisk = trades.filter(t => typeof t.riskPercent === 'number' && t.riskPercent > 0);
  let riskScore = 0;
  if (tradesWithRisk.length > 0) {
    const avgRisk = tradesWithRisk.reduce((s, t) => s + t.riskPercent, 0) / tradesWithRisk.length;
    const oversized = tradesWithRisk.filter(t => t.riskPercent > 2).length;
    const oversizedPct = oversized / tradesWithRisk.length;

    if (avgRisk <= 1 && oversizedPct < 0.05) riskScore = 20;
    else if (avgRisk <= 1.5 && oversizedPct < 0.1) riskScore = 16;
    else if (avgRisk <= 2 && oversizedPct < 0.2) riskScore = 10;
    else {
      riskScore = 4;
      reasons.push(`Avg risk ${avgRisk.toFixed(2)}% is too high (need ≤ 1.5%)`);
    }
    if (oversizedPct >= 0.1) {
      warnings.push(`${Math.round(oversizedPct * 100)}% of trades exceeded 2% risk`);
    }
  } else {
    warnings.push('No risk data available for analysis');
  }
  score += riskScore;

  // ── 4. Consistency / execution (20pts) ────────────────────────────────────
  const scoredTrades = trades.filter(t => typeof t.executionScore === 'number');
  let consistencyScore = 0;
  if (scoredTrades.length >= 10) {
    const avgExec = scoredTrades.reduce((s, t) => s + (t.executionScore ?? 0), 0) / scoredTrades.length;
    if (avgExec >= 85) consistencyScore = 20;
    else if (avgExec >= 70) consistencyScore = 16;
    else if (avgExec >= 55) consistencyScore = 10;
    else {
      consistencyScore = 4;
      warnings.push(`Avg execution score ${avgExec.toFixed(0)} is below target (70+)`);
    }
  } else {
    warnings.push('Need 10+ scored trades to assess execution consistency');
  }
  score += consistencyScore;

  // ── 5. Signal quality (20pts) ─────────────────────────────────────────────
  const scoredSignals = signals.filter(s => typeof s.finalScore === 'number');
  let signalScore = 0;
  if (scoredSignals.length >= 5) {
    const avgFinal = scoredSignals.reduce((s, sig) => s + (sig.finalScore ?? 0), 0) / scoredSignals.length;
    const withConfirmations = signals.filter(s =>
      s.liquiditySwept || s.fvgPresent || s.breakRetestConfirmed || s.srRespected
    ).length;
    const confirmRate = signals.length > 0 ? withConfirmations / signals.length : 0;

    if (avgFinal >= 8 && confirmRate >= 0.8) signalScore = 20;
    else if (avgFinal >= 7 && confirmRate >= 0.6) signalScore = 16;
    else if (avgFinal >= 6 && confirmRate >= 0.4) signalScore = 10;
    else {
      signalScore = 4;
      warnings.push(`Signal quality avg ${avgFinal.toFixed(1)}/10 — improve confirmation tracking`);
    }
  } else {
    warnings.push('Need 5+ scored signals for signal quality assessment');
  }
  score += signalScore;

  const finalScore = Math.min(100, Math.round(score));
  const grade = gradeFromScore(finalScore);

  const recommendations: Record<ReadinessGrade, string> = {
    NOT_READY: 'Continue manual journaling. Build trade history and maintain risk discipline before enabling any automation.',
    COLLECTING_DATA: 'You\'re building a foundation. Focus on consistency: log every trade, use confirmations on every signal.',
    PAPER_ONLY: 'Enable Paper Trading mode. Validate setups without real risk. Target 50+ paper signals with ≥55% win rate.',
    HUMAN_APPROVAL: 'Strong foundation. Enable Human-Approved Execution (Level 4) so the system prepares orders for your final approval.',
    AUTOMATION_CANDIDATE: 'Your data meets the requirements. You may consider Level 5 (paper/demo only) with strict daily loss limits.',
  };

  return {
    score: finalScore,
    grade,
    reasons,
    warnings,
    recommendation: recommendations[grade],
  };
}

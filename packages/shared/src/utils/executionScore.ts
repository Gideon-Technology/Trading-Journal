import type { Trade } from '../types/trade';

type ExecutionInput = Pick<Trade,
  | 'entryPrice' | 'stopLoss' | 'tp1' | 'riskPercent' | 'rrAchieved'
  | 'plannedEntry' | 'plannedStopLoss' | 'plannedTP1' | 'plannedRiskPercent' | 'plannedRR'
  | 'management'
>;

export function calcExecutionScore(trade: ExecutionInput): number {
  let score = 100;
  let checks = 0;

  // Entry slippage: if planned entry set, compare deviation
  if (trade.plannedEntry && trade.entryPrice) {
    checks++;
    const slippage = Math.abs(trade.entryPrice - trade.plannedEntry) / trade.plannedEntry;
    if (slippage > 0.005) score -= 20;     // >0.5% off plan
    else if (slippage > 0.002) score -= 10; // >0.2% off plan
  }

  // SL placement: if planned SL set, compare
  if (trade.plannedStopLoss && trade.stopLoss) {
    checks++;
    const diff = Math.abs(trade.stopLoss - trade.plannedStopLoss) / trade.plannedStopLoss;
    if (diff > 0.005) score -= 15;
    else if (diff > 0.002) score -= 7;
  }

  // Risk: if planned risk %, compare actual
  if (trade.plannedRiskPercent && trade.riskPercent) {
    checks++;
    if (trade.riskPercent > trade.plannedRiskPercent * 1.2) score -= 20; // 20%+ over planned
    else if (trade.riskPercent > trade.plannedRiskPercent * 1.05) score -= 10;
  }

  // TP hit / early exit
  if (trade.management?.exitedEarly) {
    score -= 15;
    checks++;
  }

  // Unnecessary interference
  if (trade.management?.interferedUnnecessarily) {
    score -= 15;
    checks++;
  }

  // Achieved vs planned R:R
  if (trade.plannedRR && trade.rrAchieved) {
    checks++;
    const ratio = trade.rrAchieved / trade.plannedRR;
    if (ratio < 0.5) score -= 10;
  }

  // No plan set — return null-ish (use NaN sentinel, caller should treat 0 checks = no score)
  if (checks === 0) return -1;

  return Math.max(0, Math.min(100, score));
}

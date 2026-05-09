import type { Trade } from '../types/trade';
import type { DailyPlan } from '../types/plan';

export interface ComplianceResult {
  outsidePlan: boolean;
  outsidePlanReasons: string[];
  planComplianceScore: number;  // 0–100
}

export function checkPlanCompliance(
  trade: Pick<Trade, 'pair' | 'direction' | 'session' | 'riskPercent'>,
  plan: DailyPlan
): ComplianceResult {
  const reasons: string[] = [];
  let deductions = 0;

  // Instrument check
  if (plan.allowedInstruments.length > 0 && !plan.allowedInstruments.includes(trade.pair)) {
    reasons.push(`${trade.pair} not in allowed instruments (${plan.allowedInstruments.join(', ')})`);
    deductions += 30;
  }

  // Bias conflict
  const isSell = trade.direction === 'SELL' || trade.direction === 'SHORT';
  const isBuy = trade.direction === 'BUY' || trade.direction === 'LONG';
  if (plan.marketBias === 'BULLISH' && isSell) {
    reasons.push(`Sold against BULLISH plan bias`);
    deductions += 25;
  } else if (plan.marketBias === 'BEARISH' && isBuy) {
    reasons.push(`Bought against BEARISH plan bias`);
    deductions += 25;
  }

  // Risk exceeded
  if (plan.maxRiskPerTrade > 0 && trade.riskPercent > plan.maxRiskPerTrade) {
    reasons.push(`Risk ${trade.riskPercent}% exceeded plan max ${plan.maxRiskPerTrade}%`);
    deductions += 20;
  }

  // Session conflict
  if (plan.preferredSession && trade.session !== plan.preferredSession) {
    reasons.push(`Traded ${trade.session} (plan: ${plan.preferredSession})`);
    deductions += 15;
  }

  return {
    outsidePlan: reasons.length > 0,
    outsidePlanReasons: reasons,
    planComplianceScore: Math.max(0, 100 - deductions),
  };
}

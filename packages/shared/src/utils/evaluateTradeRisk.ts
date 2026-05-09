import type { Signal } from '../types/signal';
import type { AutomationRules, RiskEvaluationResult } from '../types/automation';

interface RiskContext {
  signal: Partial<Signal>;
  rules: AutomationRules;
  todaySignalCount: number;
  todayTradeCount: number;
  todayRealizedPnl: number;    // negative = loss
  weeklyRealizedPnl: number;   // negative = loss
  consecutiveLosses: number;
  accountSize: number;
  isNewsTime: boolean;
  automationLevel: number;
}

function rejectWith(reasons: string[], msg: string) {
  reasons.push(msg);
}

/**
 * 24-rule safety engine. Returns allowed=false if ANY hard rule is violated.
 * Never enables live execution regardless of rules — that gate is elsewhere.
 */
export function evaluateTradeRisk(ctx: RiskContext): RiskEvaluationResult {
  const { signal, rules, accountSize } = ctx;
  const reasons: string[] = [];
  const warnings: string[] = [];
  let riskScore = 0;

  // ── HARD BLOCKS (immediate reject) ────────────────────────────────────────

  // Rule 1: Kill switch
  if (rules.killSwitchEnabled) {
    rejectWith(reasons, 'Kill switch is active — all automation blocked');
  }

  // Rule 2: Live execution never allowed
  if (rules.allowLiveExecution) {
    rejectWith(reasons, 'SYSTEM: Live execution is disabled in this build');
  }

  // Rule 3: Automation level gate
  if (ctx.automationLevel < rules.allowedAutomationLevel) {
    rejectWith(reasons, `Automation level ${ctx.automationLevel} below required ${rules.allowedAutomationLevel}`);
  }

  // Rule 4: Paper mode enforcement
  if (!rules.paperModeOnly && ctx.automationLevel < 4) {
    rejectWith(reasons, 'Paper mode required at this automation level');
  }

  // Rule 5: Signal instrument allowed
  if (
    rules.allowedInstruments.length > 0 &&
    signal.symbol &&
    !rules.allowedInstruments.includes(signal.symbol)
  ) {
    rejectWith(reasons, `Instrument ${signal.symbol} not in allowed list`);
  }

  // Rule 6: Session allowed
  if (
    rules.allowedSessions.length > 0 &&
    signal.session &&
    !rules.allowedSessions.includes(signal.session)
  ) {
    rejectWith(reasons, `Session ${signal.session} not in allowed sessions`);
  }

  // Rule 7: Daily signal limit
  if (ctx.todaySignalCount >= rules.maxSignalsPerDay) {
    rejectWith(reasons, `Max signals per day reached (${rules.maxSignalsPerDay})`);
  }

  // Rule 8: Daily trade limit
  if (ctx.todayTradeCount >= rules.maxTradesPerDay) {
    rejectWith(reasons, `Max trades per day reached (${rules.maxTradesPerDay})`);
  }

  // Rule 9: Daily loss limit
  if (ctx.todayRealizedPnl <= -Math.abs(rules.dailyLossLimit)) {
    rejectWith(reasons, `Daily loss limit of $${rules.dailyLossLimit} hit`);
  }

  // Rule 10: Weekly loss limit
  if (ctx.weeklyRealizedPnl <= -Math.abs(rules.weeklyLossLimit)) {
    rejectWith(reasons, `Weekly loss limit of $${rules.weeklyLossLimit} hit`);
  }

  // Rule 11: Consecutive losses
  if (ctx.consecutiveLosses >= rules.stopAfterLosses) {
    rejectWith(reasons, `${ctx.consecutiveLosses} consecutive losses — circuit breaker active`);
  }

  // Rule 12: Minimum signal score
  const sigScore = signal.confidenceScore ?? signal.finalScore;
  if (typeof sigScore === 'number' && sigScore < rules.minimumSignalScore) {
    rejectWith(reasons, `Signal score ${sigScore} below minimum ${rules.minimumSignalScore}`);
  }

  // Rule 13: Minimum AI score
  if (typeof signal.aiScore === 'number' && signal.aiScore < rules.minimumAiScore) {
    rejectWith(reasons, `AI score ${signal.aiScore} below minimum ${rules.minimumAiScore}`);
  }

  // Rule 14: Minimum automation readiness
  // (caller passes this in; checked externally — warning only here)

  // Rule 15: News filter
  if (rules.noTradeDuringNews && ctx.isNewsTime) {
    rejectWith(reasons, 'News event in progress — trading blocked');
  }

  // Rule 16: Human approval required
  const requiresApproval = rules.requireHumanApproval && ctx.automationLevel >= 4;

  // Rule 17: Entry price present
  if (!signal.entryPrice || signal.entryPrice <= 0) {
    rejectWith(reasons, 'Entry price missing or invalid');
  }

  // Rule 18: Stop loss present
  if (!signal.stopLoss || signal.stopLoss <= 0) {
    rejectWith(reasons, 'Stop loss missing or invalid');
  }

  // Rule 19: Stop loss direction check
  if (signal.entryPrice && signal.stopLoss) {
    const isBuy = signal.direction === 'BUY' || signal.direction === 'LONG';
    if (isBuy && signal.stopLoss >= signal.entryPrice) {
      rejectWith(reasons, 'BUY stop loss must be below entry price');
    }
    if (!isBuy && signal.stopLoss <= signal.entryPrice) {
      rejectWith(reasons, 'SELL stop loss must be above entry price');
    }
  }

  // Rule 20: Risk per trade
  let positionSizeRecommendation = 1;
  let maxContracts = rules.maxContracts;
  if (signal.entryPrice && signal.stopLoss && accountSize > 0) {
    const riskPts = Math.abs(signal.entryPrice - signal.stopLoss);
    const riskDollar = (rules.maxRiskPerTrade / 100) * accountSize;
    const contractRisk = riskPts * 20; // NQ default tick value — simplified
    if (contractRisk > 0) {
      positionSizeRecommendation = Math.floor(riskDollar / contractRisk);
      positionSizeRecommendation = Math.max(1, Math.min(positionSizeRecommendation, rules.maxContracts));
    }
  }

  // Rule 21: Max contracts hard cap
  if (positionSizeRecommendation > rules.maxContracts) {
    warnings.push(`Position size capped at ${rules.maxContracts} contracts`);
    positionSizeRecommendation = rules.maxContracts;
    maxContracts = rules.maxContracts;
  }

  // Rule 22: R:R check (warning if < 1.5)
  if (signal.entryPrice && signal.stopLoss && signal.tp1) {
    const risk = Math.abs(signal.entryPrice - signal.stopLoss);
    const reward = Math.abs(signal.tp1 - signal.entryPrice);
    const rr = risk > 0 ? reward / risk : 0;
    if (rr < 1.0) {
      rejectWith(reasons, `R:R ${rr.toFixed(2)} is below 1.0 minimum`);
    } else if (rr < 1.5) {
      warnings.push(`R:R ${rr.toFixed(2)} is below recommended 1.5`);
      riskScore += 20;
    }
  }

  // Rule 23: Playbook setup filter
  if (rules.allowOnlyPlaybookSetups && rules.allowedPlaybookSetupIds.length > 0) {
    warnings.push('Playbook setup ID verification not yet implemented — manual check required');
  }

  // Rule 24: Account size minimum
  if (accountSize < 5000) {
    warnings.push(`Account size $${accountSize} is below recommended $5,000 minimum`);
    riskScore += 10;
  }

  // ── Risk score accumulation ────────────────────────────────────────────────
  riskScore += ctx.consecutiveLosses * 8;
  riskScore += Math.max(0, ctx.todayTradeCount - Math.floor(rules.maxTradesPerDay * 0.7)) * 10;
  if (ctx.isNewsTime) riskScore += 20;
  if (!signal.liquiditySwept && !signal.fvgPresent) riskScore += 15;
  riskScore = Math.min(100, riskScore);

  return {
    allowed: reasons.length === 0,
    riskScore,
    reasons,
    warnings,
    positionSizeRecommendation,
    maxContracts,
    requiredHumanApproval: requiresApproval,
  };
}

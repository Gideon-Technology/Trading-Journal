import type { Signal } from '../types/signal';
import type { Trade } from '../types/trade';
import { calculateSignalScore } from './calculateSignalScore';

/**
 * Converts a Signal into a partial Trade draft for paper mode or human review.
 * Required Trade fields (outcome, profitLoss, checklist, etc.) must be filled
 * in later when the trade is closed/reviewed.
 */
export function convertSignalToTrade(signal: Signal, options?: {
  paperMode?: boolean;
  contracts?: number;
  riskPercent?: number;
  notes?: string;
}): Partial<Trade> {
  const scoreResult = calculateSignalScore(signal);
  const isPaper = options?.paperMode ?? true;

  return {
    pair: signal.symbol,
    assetClass: signal.assetClass,
    direction: signal.direction,
    analysisTimeframe: signal.timeframe,
    entryTimeframe: signal.timeframe,
    session: signal.session as Trade['session'],
    setupType: (signal.signalType as Trade['setupType']) ?? 'Other',

    entryPrice: signal.entryPrice,
    stopLoss: signal.stopLoss,
    tp1: signal.tp1,
    tp2: signal.tp2,
    tp3: signal.tp3,
    positionSize: options?.contracts ?? 1,
    riskPercent: options?.riskPercent ?? 1,

    plannedEntry: signal.entryPrice,
    plannedStopLoss: signal.stopLoss,
    plannedTP1: signal.tp1,
    plannedTP2: signal.tp2,
    plannedTP3: signal.tp3,

    entryReason: signal.setupReason,
    notes: options?.notes ?? signal.notes,

    outsidePlan: false,
    outsidePlanReasons: [],

    paperMode: isPaper,
    linkedSignalId: signal.id,
    tradeSource: 'SIGNAL',

    confidenceScore: signal.confidenceScore,
    aiScore: signal.aiScore,
    riskScore: signal.riskScore,
    finalScore: scoreResult.total,

    approvalStatus: signal.approvalStatus ?? 'NOT_REQUIRED',
    rejectionReasons: signal.rejectionReasons,
  };
}

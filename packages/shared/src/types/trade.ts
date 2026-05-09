export type Session = 'Asian' | 'London' | 'New York' | 'London-NY Overlap' | 'Pre-Market' | 'Regular Hours' | 'After Hours';
export type Direction = 'BUY' | 'SELL' | 'LONG' | 'SHORT';
export type MarketCondition = 'Trending' | 'Ranging' | 'Reversal' | 'Breakout';
export type Outcome = 'WIN' | 'LOSS' | 'BREAKEVEN';
export type PlanAdherence = 'YES' | 'MOSTLY' | 'NO';
export type AssetClass = 'Forex' | 'Futures' | 'Crypto';
export type ReviewStatus = 'PENDING' | 'REVIEWED' | 'FLAGGED';

export type SetupType =
  | 'Liquidity Sweep + FVG'
  | 'Break & Retest'
  | 'S/R Retest'
  | 'Trendline Retest'
  | 'FVG Only'
  | 'Other';

export interface PreTradeChecklist {
  htfBias: string;
  supportLevel: string;
  resistanceLevel: string;
  liquidityPresent: boolean;
  liquiditySwept: boolean;
  fvgPresent: boolean;
  breakAndRetest: boolean;
  rejectionCandle: boolean;
  goodZone: boolean;
  afterCandleClose: boolean;
  newsChecked: boolean;
  rrMinimum: boolean;
  priceWithHTF: boolean;
  noEarlyEntry: boolean;
  alignedWithPlan: boolean;
}

export interface TradeManagement {
  movedInFavor: boolean;
  breakevenMoved: boolean;
  breakevenPrice: string;
  partialTP1: boolean;
  partialTP1Percent: number;
  partialTP2: boolean;
  partialTP2Percent: number;
  runnerTP3: boolean;
  exitedEarly: boolean;
  exitReason: string;
  interferedUnnecessarily: boolean;
  // Exit quality
  tp1Hit?: boolean;
  tp2Hit?: boolean;
  tp3Hit?: boolean;
  movedTpEmotionally?: boolean;
  letWinnerBecomeLoss?: boolean;
}

export interface MistakeTracker {
  noLiquiditySweep: boolean;
  noFvgConfirmation: boolean;
  againstStructure: boolean;
  enteredTooLate: boolean;
  enteredTooEarly: boolean;
  ignoredSR: boolean;
  ignoredNews: boolean;
  tooLargeLot: boolean;
  movedSlWrong: boolean;
  closedTooEarly: boolean;
  revengeTrade: boolean;
  tooManyTrades: boolean;
  noPartialTP1: boolean;
  skippedChecklist: boolean;
  tradedDuringNews: boolean;
}

export interface PsychologyReview {
  feelingBefore: string;
  patience: number;
  fomo: boolean;
  revengeTrade: boolean;
  overtrade: boolean;
  movedSlEmotionally: boolean;
  closedTooEarly: boolean;
  followedRiskRule: boolean;
  distracted: boolean;
  mainEmotion: string;
  disciplinedAction: string;
}

export interface QualityScore {
  htfAligned: boolean;
  liquiditySwept: boolean;
  fvgPresent: boolean;
  breakAndRetest: boolean;
  srRespected: boolean;
  rejectionCandle: boolean;
  rrMinimum: boolean;
  afterCandleClose: boolean;
  noNewsConflict: boolean;
  emotionControlled: boolean;
  total: number;
}

export interface Trade {
  id: string;
  createdAt: string;
  updatedAt: string;

  // Trade information
  date: string;
  session: Session;
  assetClass: AssetClass;
  pair: string;
  analysisTimeframe: string;
  entryTimeframe: string;
  direction: Direction;
  setupType: SetupType;
  marketCondition: MarketCondition;

  // Pre-trade checklist
  checklist: PreTradeChecklist;

  // Entry details
  entryPrice: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  tp3: number;
  positionSize: number;
  riskPercent: number;
  riskAmount: number;
  entryReason: string;
  screenshotBefore: boolean;

  // Trade management
  management: TradeManagement;

  // Result
  outcome: Outcome;
  profitLossDollar: number;
  profitLossPoints: number;
  rrTargeted: number;
  rrAchieved: number;
  followedPlan: PlanAdherence;
  mistakesMade: string;
  wentWell: string;
  improvement: string;
  screenshotAfter: boolean;

  // Psychology
  psychology: PsychologyReview;

  // Mistake tracker
  mistakes: MistakeTracker;

  // Quality score (auto-calculated)
  qualityScore: QualityScore;

  // Tagging & review
  tags?: string[];
  reviewStatus?: ReviewStatus;

  // Playbook link
  playbookSetupId?: string;

  // Import tracking
  importBatchId?: string;
  importSource?: string;

  // Plan compliance (auto-calculated when a DailyPlan exists for the trade date)
  outsidePlan?: boolean;
  outsidePlanReasons?: string[];
  planComplianceScore?: number;  // 0–100

  // Planned vs actual execution
  plannedEntry?: number;
  plannedStopLoss?: number;
  plannedTP1?: number;
  plannedTP2?: number;
  plannedTP3?: number;
  plannedRiskPercent?: number;
  plannedRR?: number;
  executionScore?: number;  // 0–100, auto-calculated
}

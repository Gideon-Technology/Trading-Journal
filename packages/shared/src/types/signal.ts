export type SignalStatus = 'NEW' | 'WATCHING' | 'TAKEN' | 'SKIPPED' | 'EXPIRED' | 'WON' | 'LOST' | 'BREAKEVEN';
export type SignalSource = 'TRADINGVIEW_PASTE' | 'TRADINGVIEW_WEBHOOK' | 'MANUAL' | 'INDICATOR' | 'AI' | 'OTHER';
export type PaperOutcome = 'OPEN' | 'WIN' | 'LOSS' | 'BREAKEVEN';
export type ApprovalStatus = 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Signal {
  id: string;
  createdAt: string;
  updatedAt: string;

  symbol: string;
  assetClass: 'Forex' | 'Futures' | 'Crypto';
  timeframe: string;
  direction: 'BUY' | 'SELL' | 'LONG' | 'SHORT';
  signalType: string;
  setupReason: string;

  entryPrice?: number;
  stopLoss?: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;

  session?: string;
  marketBias?: string;

  // Confirmations
  liquiditySwept?: boolean;
  fvgPresent?: boolean;
  breakRetestConfirmed?: boolean;
  srRespected?: boolean;
  rejectionCandle?: boolean;

  // Scoring
  confidenceScore?: number;   // 0–10, set by user/parser
  aiScore?: number;           // 0–10, set by AI review
  riskScore?: number;         // 0–10, from risk engine (lower = safer)
  finalScore?: number;        // 0–10, weighted composite

  status: SignalStatus;
  linkedTradeId?: string;
  notes?: string;
  source?: SignalSource;

  // Paper mode tracking
  paperMode?: boolean;
  paperOutcome?: PaperOutcome;
  paperProfitLossDollar?: number;
  paperProfitLossPoints?: number;
  paperRR?: number;
  paperNotes?: string;

  // Risk / Approval
  rejectionReasons?: string[];
  approvalStatus?: ApprovalStatus;
  approvedAt?: string;
  approvedBy?: string;
}

export interface ParsedAlertResult {
  signal: Partial<Signal>;
  errors: string[];
  valid: boolean;
}

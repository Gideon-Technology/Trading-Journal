export type MarketBias = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type PlanStatus = 'READY' | 'NOT_READY';

export interface DailyPlan {
  id: string;
  date: string;
  marketBias: MarketBias;
  allowedInstruments: string[];
  preferredSession: string;
  maxTrades: number;
  maxRiskPerTrade: number;     // %
  dailyStopLoss: number;       // $
  dailyProfitTarget: number;   // $
  keyLevels: string;
  newsToAvoid: string;
  mainSetup: string;
  noTradeConditions: string;
  emotionalState: string;
  status: PlanStatus;
  notes: string;
  createdAt: string;
}

export interface PlaybookSetup {
  id: string;
  name: string;
  description: string;
  bestInstruments: string[];
  bestSessions: string[];
  marketCondition: string;
  requiredConfirmations: string[];
  invalidConditions: string;
  entryRule: string;
  stopLossRule: string;
  tpRule: string;
  minimumRR: number;
  commonMistakes: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  tradeCount?: number;   // computed, not stored
}

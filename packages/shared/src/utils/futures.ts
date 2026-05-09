export interface FuturesInstrumentMeta {
  code: string;
  name: string;
  pointValue: number;   // $ per point
  tickSize: number;     // minimum price movement in points
  tickValue: number;    // $ per tick
  exchange: string;
  micro: boolean;
}

export const FUTURES_META: Record<string, FuturesInstrumentMeta> = {
  'ES (S&P 500)':       { code: 'ES',  name: 'S&P 500',       pointValue: 50,   tickSize: 0.25, tickValue: 12.50, exchange: 'CME',   micro: false },
  'NQ (Nasdaq 100)':    { code: 'NQ',  name: 'Nasdaq 100',    pointValue: 20,   tickSize: 0.25, tickValue: 5.00,  exchange: 'CME',   micro: false },
  'YM (Dow Jones)':     { code: 'YM',  name: 'Dow Jones',     pointValue: 5,    tickSize: 1,    tickValue: 5.00,  exchange: 'CBOT',  micro: false },
  'RTY (Russell 2000)': { code: 'RTY', name: 'Russell 2000',  pointValue: 50,   tickSize: 0.10, tickValue: 5.00,  exchange: 'CME',   micro: false },
  'MES (Micro S&P)':    { code: 'MES', name: 'Micro S&P 500', pointValue: 5,    tickSize: 0.25, tickValue: 1.25,  exchange: 'CME',   micro: true  },
  'MNQ (Micro Nasdaq)': { code: 'MNQ', name: 'Micro Nasdaq',  pointValue: 2,    tickSize: 0.25, tickValue: 0.50,  exchange: 'CME',   micro: true  },
  'MYM (Micro Dow)':    { code: 'MYM', name: 'Micro Dow',     pointValue: 0.50, tickSize: 1,    tickValue: 0.50,  exchange: 'CBOT',  micro: true  },
  'M2K (Micro Russ)':   { code: 'M2K', name: 'Micro Russell', pointValue: 5,    tickSize: 0.10, tickValue: 0.50,  exchange: 'CME',   micro: true  },
  'CL (Crude Oil)':     { code: 'CL',  name: 'Crude Oil',     pointValue: 1000, tickSize: 0.01, tickValue: 10.00, exchange: 'NYMEX', micro: false },
  'GC (Gold)':          { code: 'GC',  name: 'Gold',          pointValue: 100,  tickSize: 0.10, tickValue: 10.00, exchange: 'COMEX', micro: false },
  'SI (Silver)':        { code: 'SI',  name: 'Silver',        pointValue: 5000, tickSize: 0.005, tickValue: 25.00, exchange: 'COMEX', micro: false },
  'ZB (30yr Bond)':     { code: 'ZB',  name: '30-Year T-Bond', pointValue: 1000, tickSize: 0.03125, tickValue: 31.25, exchange: 'CBOT', micro: false },
  'ZN (10yr Note)':     { code: 'ZN',  name: '10-Year T-Note', pointValue: 1000, tickSize: 0.015625, tickValue: 15.625, exchange: 'CBOT', micro: false },
};

export function getFuturesMeta(instrument: string): FuturesInstrumentMeta | null {
  return FUTURES_META[instrument] ?? null;
}

export interface ContractSizingResult {
  riskPerContract: number;
  recommendedContracts: number;
  dollarRisk: number;
  pointsRisk: number;
  ticksRisk: number;
  rrToTP1: number;
  rrToTP2: number;
  rrToTP3: number;
  warning: string | null;
}

export function calcContractSizing(params: {
  instrument: string;
  accountSize: number;
  riskPercent: number;
  entry: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  tp3: number;
  direction: 'LONG' | 'SHORT' | 'BUY' | 'SELL';
}): ContractSizingResult | null {
  const meta = getFuturesMeta(params.instrument);
  if (!meta) return null;

  const { accountSize, riskPercent, entry, stopLoss, tp1, tp2, tp3, direction } = params;
  const isLong = direction === 'LONG' || direction === 'BUY';

  const pointsRisk = Math.abs(entry - stopLoss);
  if (pointsRisk === 0) return null;

  const riskPerContract = pointsRisk * meta.pointValue;
  const maxDollarRisk = (riskPercent / 100) * accountSize;
  const recommendedContracts = Math.max(1, Math.floor(maxDollarRisk / riskPerContract));
  const dollarRisk = riskPerContract * recommendedContracts;
  const ticksRisk = pointsRisk / meta.tickSize;

  const tpPoints1 = tp1 ? Math.abs(tp1 - entry) : 0;
  const tpPoints2 = tp2 ? Math.abs(tp2 - entry) : 0;
  const tpPoints3 = tp3 ? Math.abs(tp3 - entry) : 0;

  // Validate TP direction
  const tpValid = isLong
    ? (!tp1 || tp1 > entry) && (!tp2 || tp2 > entry) && (!tp3 || tp3 > entry)
    : (!tp1 || tp1 < entry) && (!tp2 || tp2 < entry) && (!tp3 || tp3 < entry);

  let warning: string | null = null;
  if (dollarRisk > maxDollarRisk * 1.1) warning = 'Dollar risk exceeds your rule — reduce contracts.';
  if (!tpValid) warning = 'Take profit levels do not match trade direction.';
  if (recommendedContracts === 0) warning = 'Risk per contract exceeds your max dollar risk.';

  return {
    riskPerContract,
    recommendedContracts,
    dollarRisk,
    pointsRisk,
    ticksRisk,
    rrToTP1: tpPoints1 / pointsRisk,
    rrToTP2: tpPoints2 / pointsRisk,
    rrToTP3: tpPoints3 / pointsRisk,
    warning,
  };
}

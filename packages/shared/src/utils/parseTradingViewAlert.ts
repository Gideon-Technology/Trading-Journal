import type { Signal, ParsedAlertResult } from '../types/signal';

const DIRECTION_MAP: Record<string, Signal['direction']> = {
  BUY: 'BUY', SELL: 'SELL', LONG: 'LONG', SHORT: 'SHORT',
  buy: 'BUY', sell: 'SELL', long: 'LONG', short: 'SHORT',
};

function parseBool(val?: string): boolean | undefined {
  if (val === undefined) return undefined;
  return val === 'true' || val === '1' || val === 'yes';
}

function parseNum(val?: string): number | undefined {
  if (val === undefined) return undefined;
  const n = parseFloat(val);
  return isNaN(n) ? undefined : n;
}

/**
 * Parses a TradingView pipe-delimited alert string.
 *
 * Expected format:
 * GTRADE_SIGNAL|symbol=NQ|tf=5M|direction=BUY|entry=21350|sl=21310|
 * tp1=21430|tp2=21470|tp3=21550|setup=Liquidity Sweep + FVG Retest|
 * liq=true|fvg=true|br=true|sr=true|rc=false|score=8|session=NY|bias=Bullish
 */
export function parseTradingViewAlert(raw: string): ParsedAlertResult {
  const errors: string[] = [];
  const signal: Partial<Signal> = {
    source: 'TRADINGVIEW_PASTE',
    status: 'NEW',
  };

  const trimmed = raw.trim();

  if (!trimmed.startsWith('GTRADE_SIGNAL')) {
    errors.push('Alert must start with GTRADE_SIGNAL');
    return { signal, errors, valid: false };
  }

  const parts = trimmed.split('|');
  const kvPairs = parts.slice(1); // skip "GTRADE_SIGNAL"

  const map: Record<string, string> = {};
  for (const pair of kvPairs) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    const key = pair.slice(0, eqIdx).trim().toLowerCase();
    const value = pair.slice(eqIdx + 1).trim();
    map[key] = value;
  }

  // Required fields
  if (!map['symbol']) errors.push('Missing required field: symbol');
  else signal.symbol = map['symbol'].toUpperCase();

  if (!map['direction']) {
    errors.push('Missing required field: direction');
  } else {
    const dir = DIRECTION_MAP[map['direction']];
    if (!dir) errors.push(`Invalid direction: ${map['direction']}`);
    else signal.direction = dir;
  }

  if (!map['entry'] && !map['entryprice']) {
    errors.push('Missing required field: entry');
  } else {
    signal.entryPrice = parseNum(map['entry'] ?? map['entryprice']);
    if (signal.entryPrice === undefined) errors.push('Invalid entry price');
  }

  if (!map['sl'] && !map['stoploss']) {
    errors.push('Missing required field: sl (stop loss)');
  } else {
    signal.stopLoss = parseNum(map['sl'] ?? map['stoploss']);
    if (signal.stopLoss === undefined) errors.push('Invalid stop loss');
  }

  // Optional fields
  if (map['tf'] ?? map['timeframe']) signal.timeframe = (map['tf'] ?? map['timeframe']).toUpperCase();
  if (map['setup'] ?? map['setupreason']) signal.setupReason = map['setup'] ?? map['setupreason'];
  if (map['type'] ?? map['signaltype']) signal.signalType = map['type'] ?? map['signaltype'];
  if (map['session']) signal.session = map['session'];
  if (map['bias'] ?? map['marketbias']) signal.marketBias = map['bias'] ?? map['marketbias'];
  if (map['notes']) signal.notes = map['notes'];

  signal.tp1 = parseNum(map['tp1']);
  signal.tp2 = parseNum(map['tp2']);
  signal.tp3 = parseNum(map['tp3']);

  // Confirmations
  signal.liquiditySwept = parseBool(map['liq'] ?? map['liquidityswept']);
  signal.fvgPresent = parseBool(map['fvg'] ?? map['fvgpresent']);
  signal.breakRetestConfirmed = parseBool(map['br'] ?? map['breakretestconfirmed']);
  signal.srRespected = parseBool(map['sr'] ?? map['srrespected']);
  signal.rejectionCandle = parseBool(map['rc'] ?? map['rejectioncandle']);

  // Scores
  signal.confidenceScore = parseNum(map['score'] ?? map['confidencescore']);

  // Infer asset class from symbol
  const sym = signal.symbol ?? '';
  if (['NQ', 'ES', 'RTY', 'YM', 'CL', 'GC', 'SI', 'ZB', 'ZN', 'ZF'].includes(sym)) {
    signal.assetClass = 'Futures';
  } else if (['BTC', 'ETH', 'SOL', 'XRP', 'ADA'].some(c => sym.includes(c))) {
    signal.assetClass = 'Crypto';
  } else {
    signal.assetClass = 'Forex';
  }

  if (!signal.setupReason) signal.setupReason = signal.signalType ?? 'Unknown';
  if (!signal.signalType) signal.signalType = 'TV Alert';
  if (!signal.timeframe) signal.timeframe = 'UNKNOWN';

  return { signal, errors, valid: errors.length === 0 };
}

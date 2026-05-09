import type { Trade, AssetClass, Direction, Outcome, Session } from '../types/trade';

export type BrokerFormat =
  | 'ninjatrader'   // Topstep, Apex, FTMO futures via NinjaTrader
  | 'mt4'           // MT4 / MT5 account statement
  | 'tradovate'     // Tradovate trade history
  | 'ibkr'          // Interactive Brokers flex query
  | 'tradestation'  // TradeStation trade activity
  | 'generic';      // Unknown — manual mapping

export interface ParsedRow {
  date: string;           // yyyy-MM-dd
  time?: string;
  instrument: string;
  direction: Direction;
  positionSize: number;
  entryPrice: number;
  exitPrice?: number;
  profitLossDollar: number;
  profitLossPoints?: number;
  outcome: Outcome;
  session?: Session;
  commission?: number;
  rawRow: Record<string, string>;
}

export interface ImportPreview {
  broker: BrokerFormat;
  brokerLabel: string;
  rows: ParsedRow[];
  skipped: number;
  errors: string[];
}

// ─── CSV parsing ────────────────────────────────────────────────────────────

export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = splitCSVLine(lines[i]);
    if (vals.every(v => !v.trim())) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h.trim()] = (vals[idx] ?? '').trim(); });
    rows.push(row);
  }
  return rows;
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ─── Broker detection ────────────────────────────────────────────────────────

const SIGNATURES: Record<BrokerFormat, string[]> = {
  ninjatrader: ['Market pos.', 'Entry price', 'Exit price', 'Entry time', 'Exit time'],
  mt4:         ['Open Time', 'Open Price', 'Close Price', 'Close Time', 'Lots'],
  tradovate:   ['Realized PnL', 'Avg Price', 'Side', 'Qty'],
  ibkr:        ['FifoPnlRealized', 'TradePrice', 'Buy/Sell', 'AssetClass'],
  tradestation: ['Exec Price', 'P/L Trade', 'Buy/Sell', 'EXDate'],
  generic:     [],
};

export function detectBroker(headers: string[]): BrokerFormat {
  const set = new Set(headers.map(h => h.trim()));
  for (const [broker, sigs] of Object.entries(SIGNATURES) as [BrokerFormat, string[]][]) {
    if (broker === 'generic') continue;
    if (sigs.every(s => set.has(s))) return broker;
  }
  return 'generic';
}

export const BROKER_LABELS: Record<BrokerFormat, string> = {
  ninjatrader:  'NinjaTrader / Topstep / Apex',
  mt4:          'MetaTrader 4 / 5',
  tradovate:    'Tradovate',
  ibkr:         'Interactive Brokers',
  tradestation: 'TradeStation',
  generic:      'Unknown (generic)',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseNum(s: string): number {
  return parseFloat(s.replace(/[$,\s]/g, '')) || 0;
}

function parseDate(s: string): string {
  if (!s) return new Date().toISOString().split('T')[0];
  // Try yyyy-MM-dd HH:mm:ss
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  // Try MM/DD/YYYY
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (us) return `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`;
  // Try DD.MM.YYYY (MT4)
  const eu = s.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (eu) return `${eu[3]}-${eu[2]}-${eu[1]}`;
  return new Date().toISOString().split('T')[0];
}

function sessionFromTime(timeStr?: string): Session {
  if (!timeStr) return 'Regular Hours';
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return 'Regular Hours';
  const hour = parseInt(match[1], 10);
  // UTC hours → rough session mapping
  if (hour >= 0 && hour < 6)   return 'Asian';
  if (hour >= 7 && hour < 12)  return 'London';
  if (hour >= 12 && hour < 14) return 'London-NY Overlap';
  if (hour >= 14 && hour < 21) return 'New York';
  return 'Regular Hours';
}

function directionFromStr(s: string): Direction {
  const u = s.toUpperCase();
  if (u === 'LONG' || u === 'BUY' || u === 'B') return 'LONG';
  return 'SHORT';
}

function outcomeFromPnL(pnl: number): Outcome {
  if (pnl > 0) return 'WIN';
  if (pnl < 0) return 'LOSS';
  return 'BREAKEVEN';
}

function normalizeInstrument(raw: string): string {
  const s = raw.trim().toUpperCase();
  // Futures contract codes — strip expiry (e.g. "ES 09-24" → "ES (S&P 500)")
  const futuresMap: Record<string, string> = {
    ES: 'ES (S&P 500)', NQ: 'NQ (Nasdaq 100)', YM: 'YM (Dow Jones)',
    RTY: 'RTY (Russell 2000)', MES: 'MES (Micro S&P)', MNQ: 'MNQ (Micro Nasdaq)',
    CL: 'CL (Crude Oil)', GC: 'GC (Gold)', SI: 'SI (Silver)',
    ZB: 'ZB (30yr Bond)', ZN: 'ZN (10yr Note)',
  };
  const code = s.split(/[\s\/\-]/)[0];
  return futuresMap[code] ?? raw.trim();
}

function assetFromInstrument(instrument: string): AssetClass {
  const futureCodes = ['ES', 'NQ', 'YM', 'RTY', 'MES', 'MNQ', 'CL', 'GC', 'SI', 'ZB', 'ZN', 'ZF', 'ZT', '6E', '6B'];
  const cryptos = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP'];
  const upper = instrument.toUpperCase();
  if (futureCodes.some(c => upper.startsWith(c))) return 'Futures';
  if (cryptos.some(c => upper.includes(c))) return 'Crypto';
  return 'Forex';
}

// ─── Per-broker parsers ──────────────────────────────────────────────────────

function parseNinjaTrader(rows: Record<string, string>[]): { parsed: ParsedRow[]; skipped: number } {
  const parsed: ParsedRow[] = [];
  let skipped = 0;
  for (const row of rows) {
    const instrument = row['Instrument'];
    const posStr = row['Market pos.']?.toLowerCase();
    const profitStr = row['Profit'];
    if (!instrument || !posStr || profitStr === undefined) { skipped++; continue; }
    const profit = parseNum(profitStr);
    const entryTime = row['Entry time'] ?? '';
    const datePart = parseDate(entryTime);
    const timePart = entryTime.split(' ')[1];
    parsed.push({
      date: datePart,
      time: timePart,
      instrument: normalizeInstrument(instrument),
      direction: posStr.includes('long') ? 'LONG' : 'SHORT',
      positionSize: parseNum(row['Quantity'] ?? '1'),
      entryPrice: parseNum(row['Entry price'] ?? '0'),
      exitPrice: parseNum(row['Exit price'] ?? '0'),
      profitLossDollar: profit,
      outcome: outcomeFromPnL(profit),
      session: sessionFromTime(timePart),
      commission: parseNum(row['Commission'] ?? '0'),
      rawRow: row,
    });
  }
  return { parsed, skipped };
}

function parseMT4(rows: Record<string, string>[]): { parsed: ParsedRow[]; skipped: number } {
  const parsed: ParsedRow[] = [];
  let skipped = 0;
  for (const row of rows) {
    const symbol = row['Symbol'] ?? row['Currency'];
    const type = row['Type'] ?? '';
    if (!symbol || !['buy', 'sell'].includes(type.toLowerCase())) { skipped++; continue; }
    const profit = parseNum(row['Profit'] ?? '0');
    const openTime = row['Open Time'] ?? '';
    parsed.push({
      date: parseDate(openTime),
      time: openTime.split(' ')[1],
      instrument: symbol,
      direction: directionFromStr(type),
      positionSize: parseNum(row['Lots'] ?? '0'),
      entryPrice: parseNum(row['Open Price'] ?? '0'),
      exitPrice: parseNum(row['Close Price'] ?? '0'),
      profitLossPoints: parseNum(row['Pips'] ?? row['Points'] ?? '0'),
      profitLossDollar: profit,
      outcome: outcomeFromPnL(profit),
      session: sessionFromTime(openTime.split(' ')[1]),
      commission: parseNum(row['Commission'] ?? '0'),
      rawRow: row,
    });
  }
  return { parsed, skipped };
}

function parseTradovate(rows: Record<string, string>[]): { parsed: ParsedRow[]; skipped: number } {
  const parsed: ParsedRow[] = [];
  let skipped = 0;
  for (const row of rows) {
    const symbol = row['Symbol'];
    const side = row['Side'] ?? row['Buy/Sell'];
    const pnlStr = row['Realized PnL'] ?? row['P/L'];
    if (!symbol || !side || pnlStr === undefined) { skipped++; continue; }
    const profit = parseNum(pnlStr);
    const dateStr = row['Date'] ?? row['Fill Time'] ?? row['Time'];
    parsed.push({
      date: parseDate(dateStr),
      time: dateStr?.split(' ')[1],
      instrument: normalizeInstrument(symbol),
      direction: directionFromStr(side),
      positionSize: parseNum(row['Qty'] ?? row['Quantity'] ?? '1'),
      entryPrice: parseNum(row['Avg Price'] ?? row['Entry Price'] ?? '0'),
      profitLossDollar: profit,
      outcome: outcomeFromPnL(profit),
      session: sessionFromTime(dateStr?.split(' ')[1]),
      rawRow: row,
    });
  }
  return { parsed, skipped };
}

function parseIBKR(rows: Record<string, string>[]): { parsed: ParsedRow[]; skipped: number } {
  const parsed: ParsedRow[] = [];
  let skipped = 0;
  for (const row of rows) {
    const symbol = row['Symbol'];
    const buySell = row['Buy/Sell'];
    const pnlStr = row['FifoPnlRealized'];
    if (!symbol || !buySell || pnlStr === undefined) { skipped++; continue; }
    const profit = parseNum(pnlStr);
    const dateStr = row['TradeDate'] ?? row['Date/Time'] ?? '';
    parsed.push({
      date: parseDate(dateStr),
      instrument: symbol,
      direction: directionFromStr(buySell),
      positionSize: Math.abs(parseNum(row['Quantity'] ?? '0')),
      entryPrice: parseNum(row['TradePrice'] ?? '0'),
      profitLossDollar: profit,
      outcome: outcomeFromPnL(profit),
      rawRow: row,
    });
  }
  return { parsed, skipped };
}

function parseTradeStation(rows: Record<string, string>[]): { parsed: ParsedRow[]; skipped: number } {
  const parsed: ParsedRow[] = [];
  let skipped = 0;
  for (const row of rows) {
    const symbol = row['Symbol'];
    const buySell = row['Buy/Sell'];
    const pnlStr = row['P/L Trade'] ?? row['Net P/L'];
    if (!symbol || !buySell || pnlStr === undefined) { skipped++; continue; }
    const profit = parseNum(pnlStr);
    const dateStr = row['EXDate'] ?? row['Date'] ?? '';
    parsed.push({
      date: parseDate(dateStr),
      instrument: symbol,
      direction: directionFromStr(buySell),
      positionSize: Math.abs(parseNum(row['Quantity'] ?? '0')),
      entryPrice: parseNum(row['Exec Price'] ?? '0'),
      profitLossDollar: profit,
      outcome: outcomeFromPnL(profit),
      rawRow: row,
    });
  }
  return { parsed, skipped };
}

// ─── Main entry point ────────────────────────────────────────────────────────

export function previewBrokerImport(csvText: string): ImportPreview {
  const rawRows = parseCSV(csvText);
  if (!rawRows.length) {
    return { broker: 'generic', brokerLabel: 'Unknown', rows: [], skipped: 0, errors: ['No data rows found in CSV.'] };
  }

  const headers = Object.keys(rawRows[0]);
  const broker = detectBroker(headers);
  const errors: string[] = [];

  let parsed: ParsedRow[] = [];
  let skipped = 0;

  switch (broker) {
    case 'ninjatrader':  ({ parsed, skipped } = parseNinjaTrader(rawRows));  break;
    case 'mt4':          ({ parsed, skipped } = parseMT4(rawRows));          break;
    case 'tradovate':    ({ parsed, skipped } = parseTradovate(rawRows));     break;
    case 'ibkr':         ({ parsed, skipped } = parseIBKR(rawRows));         break;
    case 'tradestation': ({ parsed, skipped } = parseTradeStation(rawRows)); break;
    default:
      errors.push('Broker format not recognised. Check the supported formats.');
  }

  return { broker, brokerLabel: BROKER_LABELS[broker], rows: parsed, skipped, errors };
}

// ─── Convert to Trade skeleton ───────────────────────────────────────────────

export function parsedRowToTrade(row: ParsedRow): Omit<Trade, 'id' | 'createdAt' | 'updatedAt' | 'qualityScore'> {
  const asset = assetFromInstrument(row.instrument);
  return {
    date: row.date,
    session: row.session ?? 'Regular Hours',
    assetClass: asset,
    pair: row.instrument,
    analysisTimeframe: '15M',
    entryTimeframe: '5M',
    direction: row.direction,
    setupType: 'Other',
    marketCondition: 'Trending',
    checklist: {
      htfBias: '', supportLevel: '', resistanceLevel: '',
      liquidityPresent: false, liquiditySwept: false, fvgPresent: false,
      breakAndRetest: false, rejectionCandle: false, goodZone: false,
      afterCandleClose: false, newsChecked: false, rrMinimum: false,
      priceWithHTF: false, noEarlyEntry: false, alignedWithPlan: false,
    },
    entryPrice: row.entryPrice,
    stopLoss: 0,
    tp1: 0, tp2: 0, tp3: 0,
    positionSize: row.positionSize,
    riskPercent: 1,
    riskAmount: 0,
    entryReason: '',
    screenshotBefore: false,
    management: {
      movedInFavor: false, breakevenMoved: false, breakevenPrice: '',
      partialTP1: false, partialTP1Percent: 50,
      partialTP2: false, partialTP2Percent: 30,
      runnerTP3: false, exitedEarly: false, exitReason: '',
      interferedUnnecessarily: false,
    },
    outcome: row.outcome,
    profitLossDollar: row.profitLossDollar,
    profitLossPoints: row.profitLossPoints ?? 0,
    rrTargeted: 0,
    rrAchieved: 0,
    followedPlan: 'YES',
    mistakesMade: '',
    wentWell: '',
    improvement: '',
    screenshotAfter: false,
    psychology: {
      feelingBefore: '', patience: 3, fomo: false, revengeTrade: false,
      overtrade: false, movedSlEmotionally: false, closedTooEarly: false,
      followedRiskRule: true, distracted: false, mainEmotion: '', disciplinedAction: '',
    },
    mistakes: {
      noLiquiditySweep: false, noFvgConfirmation: false, againstStructure: false,
      enteredTooLate: false, enteredTooEarly: false, ignoredSR: false,
      ignoredNews: false, tooLargeLot: false, movedSlWrong: false,
      closedTooEarly: false, revengeTrade: false, tooManyTrades: false,
      noPartialTP1: false, skippedChecklist: false, tradedDuringNews: false,
    },
    tags: ['imported'],
    reviewStatus: 'PENDING',
  };
}

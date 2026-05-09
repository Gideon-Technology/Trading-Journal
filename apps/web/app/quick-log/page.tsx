'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useJournalStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { calcContractSizing, FUTURES_META } from '@forex-journal/shared';
import type { Trade, Session, Direction, SetupType, Outcome, PlanAdherence, AssetClass } from '@forex-journal/shared';

const INSTRUMENTS: Record<AssetClass, string[]> = {
  Forex: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'NZD/USD', 'USD/CAD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'XAU/USD', 'XAG/USD', 'Other'],
  Futures: ['ES (S&P 500)', 'NQ (Nasdaq 100)', 'MES (Micro S&P)', 'MNQ (Micro Nasdaq)', 'YM (Dow Jones)', 'MYM (Micro Dow)', 'RTY (Russell 2000)', 'M2K (Micro Russell)', 'CL (Crude Oil)', 'GC (Gold)', 'SI (Silver)', 'ZB (30yr Bond)', 'ZN (10yr Note)', 'Other'],
  Crypto: ['BTC/USD', 'ETH/USD', 'SOL/USD', 'BNB/USD', 'XRP/USD', 'Other'],
};

const SESSIONS_BY_CLASS: Record<AssetClass, Session[]> = {
  Forex: ['Asian', 'London', 'New York', 'London-NY Overlap'],
  Futures: ['Pre-Market', 'Regular Hours', 'After Hours', 'Asian', 'London', 'New York'],
  Crypto: ['Asian', 'London', 'New York', 'London-NY Overlap'],
};

const FUTURES_KEYS = Object.keys(FUTURES_META);

function getFuturesKey(pair: string): string | null {
  const ticker = pair.split(' ')[0];
  return FUTURES_KEYS.find(k => k === ticker) ?? null;
}

const defaultForm = {
  date: new Date().toISOString().split('T')[0],
  assetClass: 'Futures' as AssetClass,
  pair: 'ES (S&P 500)',
  direction: 'LONG' as Direction,
  session: 'Regular Hours' as Session,
  setupType: 'Liquidity Sweep + FVG' as SetupType,
  outcome: 'WIN' as Outcome,
  profitLossDollar: '',
  profitLossPoints: '',
  entryPrice: '',
  stopLoss: '',
  tp1: '',
  positionSize: '',
  riskPercent: '1',
  followedPlan: 'YES' as PlanAdherence,
  entryReason: '',
};

export default function QuickLog() {
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const addTrade = useJournalStore(s => s.addTrade);
  const riskSettings = useJournalStore(s => s.riskSettings);
  const router = useRouter();

  const set = <K extends keyof typeof defaultForm>(key: K, value: (typeof defaultForm)[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  // Contract sizing for Futures
  const sizing = useMemo(() => {
    const futKey = getFuturesKey(form.pair);
    if (!futKey || form.assetClass !== 'Futures') return null;
    const entry = parseFloat(form.entryPrice);
    const sl = parseFloat(form.stopLoss);
    const tp1val = parseFloat(form.tp1) || 0;
    if (!entry || !sl) return null;
    return calcContractSizing({
      instrument: futKey,
      direction: form.direction === 'LONG' || form.direction === 'BUY' ? 'LONG' : 'SHORT',
      entry,
      stopLoss: sl,
      tp1: tp1val || undefined,
      accountSize: riskSettings.accountSize,
      riskPercent: parseFloat(form.riskPercent) || 1,
    });
  }, [form.pair, form.assetClass, form.entryPrice, form.stopLoss, form.tp1, form.direction, form.riskPercent, riskSettings.accountSize]);

  const buildTradePayload = () => ({
    date: form.date,
    assetClass: form.assetClass,
    pair: form.pair,
    direction: form.direction,
    session: form.session,
    setupType: form.setupType,
    outcome: form.outcome,
    profitLossDollar: parseFloat(form.profitLossDollar) || 0,
    profitLossPoints: parseFloat(form.profitLossPoints) || 0,
    entryPrice: parseFloat(form.entryPrice) || 0,
    stopLoss: parseFloat(form.stopLoss) || 0,
    tp1: parseFloat(form.tp1) || 0,
    tp2: 0, tp3: 0,
    positionSize: parseFloat(form.positionSize) || (sizing?.recommendedContracts ?? 0),
    riskPercent: parseFloat(form.riskPercent) || 1,
    riskAmount: sizing?.dollarRisk ?? 0,
    entryReason: form.entryReason,
    followedPlan: form.followedPlan,
    analysisTimeframe: '15M',
    entryTimeframe: '5M',
    marketCondition: 'Trending' as const,
    rrTargeted: sizing?.rrToTP1 ?? 0,
    rrAchieved: 0,
    screenshotBefore: false, screenshotAfter: false,
    wentWell: '', improvement: '', mistakesMade: '',
    checklist: { htfBias: '', supportLevel: '', resistanceLevel: '', liquidityPresent: false, liquiditySwept: false, fvgPresent: false, breakAndRetest: false, rejectionCandle: false, goodZone: false, afterCandleClose: false, newsChecked: false, rrMinimum: false, priceWithHTF: false, noEarlyEntry: false, alignedWithPlan: false },
    management: { movedInFavor: false, breakevenMoved: false, breakevenPrice: '', partialTP1: false, partialTP1Percent: 0, partialTP2: false, partialTP2Percent: 0, runnerTP3: false, exitedEarly: false, exitReason: '', interferedUnnecessarily: false },
    psychology: { feelingBefore: '', patience: 3, fomo: false, revengeTrade: false, overtrade: false, movedSlEmotionally: false, closedTooEarly: false, followedRiskRule: true, distracted: false, mainEmotion: '', disciplinedAction: '' },
    mistakes: { noLiquiditySweep: false, noFvgConfirmation: false, againstStructure: false, enteredTooLate: false, enteredTooEarly: false, ignoredSR: false, ignoredNews: false, tooLargeLot: false, movedSlWrong: false, closedTooEarly: false, revengeTrade: false, tooManyTrades: false, noPartialTP1: false, skippedChecklist: false, tradedDuringNews: false },
    tags: ['quick-log'],
    reviewStatus: 'PENDING' as const,
  } as Omit<Trade, 'id' | 'createdAt' | 'updatedAt' | 'qualityScore'>);

  const handleSave = async (action: 'detail' | 'another' | 'history') => {
    setSaving(true);
    const trade = addTrade(buildTradePayload());
    setSaving(false);
    if (action === 'detail') router.push(`/trades/${trade.id}`);
    else if (action === 'history') router.push('/trades');
    else setForm(f => ({ ...defaultForm, date: f.date, assetClass: f.assetClass, pair: f.pair, session: f.session }));
  };

  const inputCls = 'w-full bg-bg-elevated border border-bg-border rounded-lg px-4 py-3 text-text text-base font-mono focus:outline-none focus:border-accent transition-colors';
  const labelCls = 'block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5';

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-text">Quick Log</h1>
        <p className="text-muted text-sm">Fast trade entry — add detail later from Trade History.</p>
      </div>

      {/* Asset class + direction */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Asset Class</label>
          <div className="flex gap-1.5">
            {(['Forex', 'Futures', 'Crypto'] as AssetClass[]).map(a => (
              <button key={a} onClick={() => { set('assetClass', a); set('pair', INSTRUMENTS[a][0]); set('session', SESSIONS_BY_CLASS[a][0]); }}
                className={cn('flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors border',
                  form.assetClass === a ? 'bg-accent text-white border-accent' : 'bg-bg-elevated text-muted border-bg-border hover:border-accent/50'
                )}>
                {a === 'Futures' ? '📊' : a === 'Forex' ? '💱' : '₿'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelCls}>Direction</label>
          <div className="flex gap-1.5">
            {(['LONG', 'SHORT'] as Direction[]).map(d => (
              <button key={d} onClick={() => set('direction', d)}
                className={cn('flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors border',
                  form.direction === d
                    ? d === 'LONG' ? 'bg-win text-white border-win' : 'bg-loss text-white border-loss'
                    : 'bg-bg-elevated text-muted border-bg-border'
                )}>
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Date + Instrument + Session */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Date</label>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Instrument</label>
          <select value={form.pair} onChange={e => set('pair', e.target.value)} className={inputCls}>
            {INSTRUMENTS[form.assetClass].map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Session</label>
          <select value={form.session} onChange={e => set('session', e.target.value as Session)} className={inputCls}>
            {SESSIONS_BY_CLASS[form.assetClass].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Entry levels */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Entry Price</label>
          <input type="number" step="any" placeholder="0.00" value={form.entryPrice} onChange={e => set('entryPrice', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Stop Loss</label>
          <input type="number" step="any" placeholder="0.00" value={form.stopLoss} onChange={e => set('stopLoss', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>TP1</label>
          <input type="number" step="any" placeholder="0.00" value={form.tp1} onChange={e => set('tp1', e.target.value)} className={inputCls} />
        </div>
      </div>

      {/* Contract sizing panel */}
      {sizing && (
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
          <p className="text-accent text-xs font-semibold uppercase tracking-wider mb-3">Contract Sizing</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold font-mono text-accent">{sizing.recommendedContracts}</p>
              <p className="text-muted text-xs">Contracts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold font-mono text-text">${sizing.dollarRisk.toFixed(0)}</p>
              <p className="text-muted text-xs">Dollar Risk</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold font-mono text-text">{sizing.ticksRisk}</p>
              <p className="text-muted text-xs">Ticks Risk</p>
            </div>
            {sizing.rrToTP1 && (
              <div className="text-center">
                <p className={`text-2xl font-bold font-mono ${sizing.rrToTP1 >= 2 ? 'text-win' : 'text-breakeven'}`}>{sizing.rrToTP1.toFixed(1)}:1</p>
                <p className="text-muted text-xs">R:R to TP1</p>
              </div>
            )}
          </div>
          {sizing.warning && <p className="text-breakeven text-xs mt-2">⚠ {sizing.warning}</p>}
          <div className="mt-3">
            <label className={labelCls}>Override Position Size</label>
            <input type="number" step="1" min="1" placeholder={String(sizing.recommendedContracts)} value={form.positionSize} onChange={e => set('positionSize', e.target.value)} className={inputCls} />
          </div>
        </div>
      )}

      {/* Outcome + P&L */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Outcome</label>
          <div className="flex flex-col gap-1.5">
            {(['WIN', 'LOSS', 'BREAKEVEN'] as Outcome[]).map(o => (
              <button key={o} onClick={() => set('outcome', o)}
                className={cn('py-2.5 rounded-lg text-sm font-bold transition-colors border',
                  form.outcome === o
                    ? o === 'WIN' ? 'bg-win text-white border-win'
                      : o === 'LOSS' ? 'bg-loss text-white border-loss'
                        : 'bg-breakeven text-white border-breakeven'
                    : 'bg-bg-elevated text-muted border-bg-border'
                )}>
                {o}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelCls}>P&L ($)</label>
          <input type="number" step="0.01" placeholder="0.00"
            value={form.profitLossDollar} onChange={e => set('profitLossDollar', e.target.value)}
            className={cn(inputCls, 'text-lg',
              parseFloat(form.profitLossDollar) > 0 ? 'text-win' :
              parseFloat(form.profitLossDollar) < 0 ? 'text-loss' : ''
            )} />
        </div>
        <div>
          <label className={labelCls}>P&L (pts)</label>
          <input type="number" step="0.1" placeholder="0.0"
            value={form.profitLossPoints} onChange={e => set('profitLossPoints', e.target.value)}
            className={inputCls} />
        </div>
      </div>

      {/* Setup + Followed plan */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Setup Type</label>
          <select value={form.setupType} onChange={e => set('setupType', e.target.value as SetupType)} className={inputCls}>
            {['Liquidity Sweep + FVG', 'Break & Retest', 'S/R Retest', 'Trendline Retest', 'FVG Only', 'Other'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Followed Plan?</label>
          <div className="flex gap-1.5">
            {(['YES', 'MOSTLY', 'NO'] as PlanAdherence[]).map(p => (
              <button key={p} onClick={() => set('followedPlan', p)}
                className={cn('flex-1 py-3 rounded-lg text-xs font-bold transition-colors border',
                  form.followedPlan === p ? 'bg-accent text-white border-accent' : 'bg-bg-elevated text-muted border-bg-border'
                )}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Risk % */}
      <div>
        <label className={labelCls}>Risk % per trade</label>
        <input type="number" step="0.1" min="0.1" max="5" value={form.riskPercent}
          onChange={e => set('riskPercent', e.target.value)} className={inputCls} />
      </div>

      {/* Entry reason */}
      <div>
        <label className={labelCls}>Entry reason (optional)</label>
        <textarea value={form.entryReason} onChange={e => set('entryReason', e.target.value)}
          placeholder="What triggered the entry?"
          className={cn(inputCls, 'resize-none font-sans')} rows={2} />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button onClick={() => handleSave('detail')} disabled={saving} className="flex-1">
          Save & Review
        </Button>
        <Button variant="secondary" onClick={() => handleSave('another')} disabled={saving} className="flex-1">
          Save + Add Another
        </Button>
        <Button variant="secondary" onClick={() => handleSave('history')} disabled={saving}>
          Save
        </Button>
      </div>

      <p className="text-muted text-xs text-center pb-2">Tagged as <code className="text-accent">quick-log</code> — open from Trade History to fill in full checklist and psychology.</p>
    </div>
  );
}

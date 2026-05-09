'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useJournalStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import type { Trade, Session, Direction, MarketCondition, SetupType, Outcome, PlanAdherence, AssetClass } from '@forex-journal/shared';
import { TagSelector } from '@/components/ui/TagSelector';

const STEPS = ['Trade Info', 'Pre-Trade', 'Entry', 'Management', 'Result', 'Psychology', 'Mistakes'];

const INSTRUMENTS: Record<AssetClass, string[]> = {
  Forex: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'NZD/USD', 'USD/CAD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'XAU/USD', 'XAG/USD', 'Other'],
  Futures: [
    // Index
    'ES (S&P 500)', 'NQ (Nasdaq 100)', 'YM (Dow Jones)', 'RTY (Russell 2000)', 'MES (Micro S&P)', 'MNQ (Micro Nasdaq)',
    // Energy
    'CL (Crude Oil)', 'NG (Natural Gas)', 'RB (RBOB Gasoline)', 'HO (Heating Oil)',
    // Metals
    'GC (Gold)', 'SI (Silver)', 'HG (Copper)', 'PL (Platinum)',
    // Bonds
    'ZB (30yr Bond)', 'ZN (10yr Note)', 'ZF (5yr Note)', 'ZT (2yr Note)',
    // Currencies
    '6E (Euro)', '6B (British Pound)', '6J (Japanese Yen)', '6A (Aussie)', '6C (Canadian)',
    // Agricultural
    'ZC (Corn)', 'ZW (Wheat)', 'ZS (Soybeans)', 'Other',
  ],
  Crypto: ['BTC/USD', 'ETH/USD', 'SOL/USD', 'BNB/USD', 'XRP/USD', 'ADA/USD', 'DOGE/USD', 'Other'],
};

const SESSIONS_BY_CLASS: Record<AssetClass, Session[]> = {
  Forex: ['Asian', 'London', 'New York', 'London-NY Overlap'],
  Futures: ['Pre-Market', 'Regular Hours', 'After Hours', 'Asian', 'London', 'New York'],
  Crypto: ['Asian', 'London', 'New York', 'London-NY Overlap'],
};

const TIMEFRAMES = ['1M', '5M', '15M', '30M', '1H', '4H', '1D', '1W'];

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-muted uppercase tracking-wider">
        {label}{required && <span className="text-loss ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="w-full px-3 py-2 text-sm" {...props} />;
}

function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className="w-full px-3 py-2 text-sm" {...props}>
      {children}
    </select>
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="w-full px-3 py-2 text-sm resize-none" rows={3} {...props} />;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div
        onClick={() => onChange(!checked)}
        className={cn(
          'w-10 h-5 rounded-full transition-colors flex items-center px-0.5',
          checked ? 'bg-accent' : 'bg-bg-border'
        )}
      >
        <div className={cn('w-4 h-4 rounded-full bg-white transition-transform', checked ? 'translate-x-5' : 'translate-x-0')} />
      </div>
      <span className="text-sm text-text group-hover:text-accent transition-colors">{label}</span>
    </label>
  );
}

function CheckItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-bg-elevated transition-colors">
      <div
        onClick={() => onChange(!checked)}
        className={cn(
          'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
          checked ? 'bg-accent border-accent' : 'border-bg-border'
        )}
      >
        {checked && <span className="text-white text-xs">✓</span>}
      </div>
      <span className="text-sm text-text">{label}</span>
    </label>
  );
}

const defaultForm = {
  // Info
  tags: [] as string[],
  playbookSetupId: '' as string,
  date: new Date().toISOString().split('T')[0],
  assetClass: 'Forex' as AssetClass,
  session: 'London' as Session,
  pair: 'EUR/USD',
  analysisTimeframe: '4H',
  entryTimeframe: '15M',
  direction: 'BUY' as Direction,
  setupType: 'Liquidity Sweep + FVG' as SetupType,
  marketCondition: 'Trending' as MarketCondition,

  // Checklist
  checklist: {
    htfBias: '', supportLevel: '', resistanceLevel: '',
    liquidityPresent: false, liquiditySwept: false, fvgPresent: false,
    breakAndRetest: false, rejectionCandle: false, goodZone: false,
    afterCandleClose: false, newsChecked: false, rrMinimum: false,
    priceWithHTF: false, noEarlyEntry: false, alignedWithPlan: false,
  },

  // Entry
  entryPrice: '', stopLoss: '', tp1: '', tp2: '', tp3: '',
  positionSize: '', riskPercent: '1', riskAmount: '',
  entryReason: '', screenshotBefore: false,

  // Management
  management: {
    movedInFavor: false, breakevenMoved: false, breakevenPrice: '',
    partialTP1: false, partialTP1Percent: 50,
    partialTP2: false, partialTP2Percent: 30,
    runnerTP3: false, exitedEarly: false, exitReason: '',
    interferedUnnecessarily: false,
    tp1Hit: false, tp2Hit: false, tp3Hit: false,
    movedTpEmotionally: false, letWinnerBecomeLoss: false,
  },

  // Result
  outcome: 'WIN' as Outcome,
  profitLossDollar: '', profitLossPoints: '',
  rrTargeted: '', rrAchieved: '',
  followedPlan: 'YES' as PlanAdherence,
  mistakesMade: '', wentWell: '', improvement: '',
  screenshotAfter: false,

  // Psychology
  psychology: {
    feelingBefore: '', patience: 3, fomo: false, revengeTrade: false,
    overtrade: false, movedSlEmotionally: false, closedTooEarly: false,
    followedRiskRule: true, distracted: false, mainEmotion: '', disciplinedAction: '',
  },

  // Mistakes
  mistakes: {
    noLiquiditySweep: false, noFvgConfirmation: false, againstStructure: false,
    enteredTooLate: false, enteredTooEarly: false, ignoredSR: false,
    ignoredNews: false, tooLargeLot: false, movedSlWrong: false,
    closedTooEarly: false, revengeTrade: false, tooManyTrades: false,
    noPartialTP1: false, skippedChecklist: false, tradedDuringNews: false,
  },
};

type FormState = typeof defaultForm;

export default function NewTrade() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(defaultForm);
  const addTrade = useJournalStore(s => s.addTrade);
  const playbookSetups = useJournalStore(s => s.playbookSetups);
  const router = useRouter();

  const set = (key: keyof FormState, value: unknown) =>
    setForm(f => ({ ...f, [key]: value }));

  const setNested = (parent: keyof FormState, key: string, value: unknown) =>
    setForm(f => ({ ...f, [parent]: { ...(f[parent] as object), [key]: value } }));

  const handleSubmit = () => {
    const trade = addTrade({
      ...form,
      tags: form.tags,
      assetClass: form.assetClass,
      entryPrice: parseFloat(form.entryPrice as string) || 0,
      stopLoss: parseFloat(form.stopLoss as string) || 0,
      tp1: parseFloat(form.tp1 as string) || 0,
      tp2: parseFloat(form.tp2 as string) || 0,
      tp3: parseFloat(form.tp3 as string) || 0,
      positionSize: parseFloat(form.positionSize as string) || 0,
      riskPercent: parseFloat(form.riskPercent as string) || 1,
      riskAmount: parseFloat(form.riskAmount as string) || 0,
      profitLossDollar: parseFloat(form.profitLossDollar as string) || 0,
      profitLossPoints: parseFloat(form.profitLossPoints as string) || 0,
      rrTargeted: parseFloat(form.rrTargeted as string) || 0,
      rrAchieved: parseFloat(form.rrAchieved as string) || 0,
    } as Parameters<typeof addTrade>[0]);
    router.push(`/trades/${trade.id}`);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-text">Log New Trade</h1>
        <p className="text-muted text-sm">Complete all sections for best quality score.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className={cn(
              'px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors',
              i === step ? 'bg-accent text-white' : i < step ? 'bg-win/10 text-win' : 'bg-bg-elevated text-muted'
            )}
          >
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {/* Step 0: Trade Info */}
      {step === 0 && (
        <Card>
          <CardHeader><p className="font-semibold text-sm">Trade Information</p></CardHeader>
          <CardBody className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Asset Class" required>
                <div className="flex gap-2">
                  {(['Forex', 'Futures', 'Crypto'] as AssetClass[]).map(a => (
                    <button key={a} onClick={() => { set('assetClass', a); set('pair', INSTRUMENTS[a][0]); set('session', SESSIONS_BY_CLASS[a][0]); }}
                      className={cn('flex-1 py-2 rounded text-sm font-semibold transition-colors',
                        form.assetClass === a ? 'bg-accent text-white' : 'bg-bg-elevated text-muted border border-bg-border'
                      )}>
                      {a === 'Forex' ? '💱 Forex' : a === 'Futures' ? '📊 Futures' : '₿ Crypto'}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
            <Field label="Date" required><Input type="date" value={form.date} onChange={e => set('date', e.target.value)} /></Field>
            <Field label="Session" required>
              <Select value={form.session} onChange={e => set('session', e.target.value as Session)}>
                {SESSIONS_BY_CLASS[form.assetClass].map(s => <option key={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Instrument" required>
              <Select value={form.pair} onChange={e => set('pair', e.target.value)}>
                {INSTRUMENTS[form.assetClass].map(p => <option key={p}>{p}</option>)}
              </Select>
            </Field>
            <Field label="Direction" required>
              <div className="flex gap-2">
                {(['LONG', 'SHORT'] as Direction[]).map(d => (
                  <button key={d} onClick={() => set('direction', d)}
                    className={cn('flex-1 py-2 rounded text-sm font-semibold transition-colors',
                      form.direction === d
                        ? d === 'BUY' ? 'bg-win text-white' : 'bg-loss text-white'
                        : 'bg-bg-elevated text-muted border border-bg-border'
                    )}>
                    {d}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Analysis TF">
              <Select value={form.analysisTimeframe} onChange={e => set('analysisTimeframe', e.target.value)}>
                {TIMEFRAMES.map(t => <option key={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Entry TF">
              <Select value={form.entryTimeframe} onChange={e => set('entryTimeframe', e.target.value)}>
                {TIMEFRAMES.map(t => <option key={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Setup Type">
              <Select value={form.setupType} onChange={e => set('setupType', e.target.value as SetupType)}>
                {['Liquidity Sweep + FVG', 'Break & Retest', 'S/R Retest', 'Trendline Retest', 'FVG Only', 'Other'].map(s => <option key={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Market Condition">
              <Select value={form.marketCondition} onChange={e => set('marketCondition', e.target.value as MarketCondition)}>
                {['Trending', 'Ranging', 'Reversal', 'Breakout'].map(s => <option key={s}>{s}</option>)}
              </Select>
            </Field>
            {playbookSetups.length > 0 && (
              <div className="col-span-2">
                <Field label="Playbook Setup (optional)">
                  <select value={form.playbookSetupId} onChange={e => set('playbookSetupId', e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-bg-elevated border border-bg-border rounded-md text-text">
                    <option value="">— No playbook setup —</option>
                    {playbookSetups.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </Field>
              </div>
            )}
            <div className="col-span-2">
              <Field label="Tags (optional)">
                <TagSelector selected={form.tags} onChange={v => set('tags', v)} />
              </Field>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Step 1: Pre-Trade Checklist */}
      {step === 1 && (
        <Card>
          <CardHeader><p className="font-semibold text-sm">Pre-Trade Checklist</p></CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="HTF Bias (write it)">
                <Input placeholder="e.g. Bullish — 4H making HH/HL" value={form.checklist.htfBias}
                  onChange={e => setNested('checklist', 'htfBias', e.target.value)} />
              </Field>
              <Field label="Support Level">
                <Input placeholder="e.g. 1.26850" value={form.checklist.supportLevel}
                  onChange={e => setNested('checklist', 'supportLevel', e.target.value)} />
              </Field>
              <Field label="Resistance Level">
                <Input placeholder="e.g. 1.27420" value={form.checklist.resistanceLevel}
                  onChange={e => setNested('checklist', 'resistanceLevel', e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1 pt-2 border-t border-bg-border">
              {[
                ['priceWithHTF', 'Price is aligned with higher timeframe bias'],
                ['liquidityPresent', 'Clear liquidity pool identified (equal highs/lows)'],
                ['liquiditySwept', 'Liquidity was swept before the setup formed'],
                ['fvgPresent', 'Valid Fair Value Gap (FVG) is present'],
                ['breakAndRetest', 'Break of structure + retest confirmed'],
                ['rejectionCandle', 'Clear rejection candle (pin bar, engulfing, etc.)'],
                ['goodZone', 'Entering from premium/discount zone'],
                ['noEarlyEntry', 'Not entering too early — confirmation present'],
                ['afterCandleClose', 'Waiting for candle close before entry'],
                ['rrMinimum', 'Risk-to-reward is minimum 1:2'],
                ['newsChecked', 'Economic news calendar checked — no conflict'],
                ['alignedWithPlan', 'Trade is aligned with my written plan'],
              ].map(([key, label]) => (
                <CheckItem key={key} label={label}
                  checked={!!(form.checklist as Record<string, unknown>)[key]}
                  onChange={v => setNested('checklist', key, v)} />
              ))}
            </div>
            <div className="bg-bg-elevated rounded px-4 py-2 text-sm">
              <span className="text-muted">Checklist score: </span>
              <span className="text-accent font-semibold">
                {Object.entries(form.checklist).filter(([k, v]) => k !== 'htfBias' && k !== 'supportLevel' && k !== 'resistanceLevel' && v === true).length} / 12
              </span>
              <span className="text-muted ml-2 text-xs">— If below 8, reconsider the trade.</span>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Step 2: Entry Details */}
      {step === 2 && (
        <Card>
          <CardHeader><p className="font-semibold text-sm">Entry Details</p></CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Entry Price" required><Input type="number" step="0.00001" placeholder="1.26875" value={form.entryPrice as string} onChange={e => set('entryPrice', e.target.value)} /></Field>
              <Field label="Stop Loss" required><Input type="number" step="0.00001" placeholder="1.26740" value={form.stopLoss as string} onChange={e => set('stopLoss', e.target.value)} /></Field>
              <Field label="Position Size" required><Input type="number" step="0.01" placeholder="0.50" value={form.positionSize as string} onChange={e => set('positionSize', e.target.value)} /></Field>
              <Field label="Take Profit 1 (1:2)"><Input type="number" step="0.00001" placeholder="TP1" value={form.tp1 as string} onChange={e => set('tp1', e.target.value)} /></Field>
              <Field label="Take Profit 2 (1:3)"><Input type="number" step="0.00001" placeholder="TP2" value={form.tp2 as string} onChange={e => set('tp2', e.target.value)} /></Field>
              <Field label="Take Profit 3 (1:5)"><Input type="number" step="0.00001" placeholder="TP3" value={form.tp3 as string} onChange={e => set('tp3', e.target.value)} /></Field>
              <Field label="Risk %"><Input type="number" step="0.1" placeholder="1" value={form.riskPercent as string} onChange={e => set('riskPercent', e.target.value)} /></Field>
              <Field label="Risk Amount ($)"><Input type="number" step="0.01" placeholder="50" value={form.riskAmount as string} onChange={e => set('riskAmount', e.target.value)} /></Field>
            </div>
            <Field label="Reason for Entry (be specific)">
              <Textarea placeholder="e.g. Price swept sell-side liquidity below equal lows, filled bullish FVG, closed bullish engulfing above structure on 15M..." value={form.entryReason} onChange={e => set('entryReason', e.target.value)} rows={4} />
            </Field>
            <Toggle label="Screenshot taken before entry" checked={form.screenshotBefore} onChange={v => set('screenshotBefore', v)} />
          </CardBody>
        </Card>
      )}

      {/* Step 3: Trade Management */}
      {step === 3 && (
        <Card>
          <CardHeader><p className="font-semibold text-sm">Trade Management</p></CardHeader>
          <CardBody className="space-y-3">
            {[
              ['movedInFavor', 'Price moved in my favor immediately'],
              ['breakevenMoved', 'Moved stop loss to breakeven'],
              ['interferedUnnecessarily', 'I interfered with the trade unnecessarily'],
            ].map(([key, label]) => (
              <Toggle key={key} label={label}
                checked={!!(form.management as Record<string, unknown>)[key]}
                onChange={v => setNested('management', key, v)} />
            ))}
            {form.management.breakevenMoved && (
              <Field label="Breakeven price">
                <Input placeholder="Price level" value={form.management.breakevenPrice}
                  onChange={e => setNested('management', 'breakevenPrice', e.target.value)} />
              </Field>
            )}
            <div className="border-t border-bg-border pt-3 space-y-3">
              <Toggle label="Took partial profit at TP1" checked={form.management.partialTP1} onChange={v => setNested('management', 'partialTP1', v)} />
              {form.management.partialTP1 && (
                <Field label="% closed at TP1">
                  <Input type="number" min={1} max={100} value={form.management.partialTP1Percent}
                    onChange={e => setNested('management', 'partialTP1Percent', +e.target.value)} />
                </Field>
              )}
              <Toggle label="Closed majority at TP2" checked={form.management.partialTP2} onChange={v => setNested('management', 'partialTP2', v)} />
              {form.management.partialTP2 && (
                <Field label="% closed at TP2">
                  <Input type="number" min={1} max={100} value={form.management.partialTP2Percent}
                    onChange={e => setNested('management', 'partialTP2Percent', +e.target.value)} />
                </Field>
              )}
              <Toggle label="Ran a runner to TP3" checked={form.management.runnerTP3} onChange={v => setNested('management', 'runnerTP3', v)} />
            </div>
            <div className="border-t border-bg-border pt-3 space-y-3">
              <Toggle label="Exited early (before TP)" checked={form.management.exitedEarly} onChange={v => setNested('management', 'exitedEarly', v)} />
              {form.management.exitedEarly && (
                <Field label="Why did you exit early?">
                  <Textarea value={form.management.exitReason}
                    onChange={e => setNested('management', 'exitReason', e.target.value)} />
                </Field>
              )}
            </div>
            <div className="border-t border-bg-border pt-3 space-y-3">
              <p className="text-muted text-xs font-semibold uppercase tracking-wider">Exit Quality</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {([
                  ['tp1Hit', 'TP1 was hit'],
                  ['tp2Hit', 'TP2 was hit'],
                  ['tp3Hit', 'TP3 was hit'],
                  ['movedTpEmotionally', 'Moved TP emotionally'],
                  ['letWinnerBecomeLoss', 'Let winner become a loss'],
                ] as [string, string][]).map(([key, label]) => (
                  <Toggle key={key} label={label}
                    checked={!!((form.management as Record<string, unknown>)[key])}
                    onChange={v => setNested('management', key, v)} />
                ))}
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Step 4: Result */}
      {step === 4 && (
        <Card>
          <CardHeader><p className="font-semibold text-sm">Trade Result</p></CardHeader>
          <CardBody className="space-y-4">
            <Field label="Outcome" required>
              <div className="flex gap-2">
                {(['WIN', 'LOSS', 'BREAKEVEN'] as Outcome[]).map(o => (
                  <button key={o} onClick={() => set('outcome', o)}
                    className={cn('flex-1 py-2 rounded text-sm font-semibold transition-colors',
                      form.outcome === o
                        ? o === 'WIN' ? 'bg-win text-white'
                          : o === 'LOSS' ? 'bg-loss text-white'
                            : 'bg-breakeven text-white'
                        : 'bg-bg-elevated text-muted border border-bg-border'
                    )}>
                    {o}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="P&L ($)"><Input type="number" step="0.01" placeholder="+175.00" value={form.profitLossDollar as string} onChange={e => set('profitLossDollar', e.target.value)} /></Field>
              <Field label="P&L (pts)"><Input type="number" step="0.1" placeholder="+67.5" value={form.profitLossPoints as string} onChange={e => set('profitLossPoints', e.target.value)} /></Field>
              <Field label="RR Targeted"><Input type="number" step="0.1" placeholder="5" value={form.rrTargeted as string} onChange={e => set('rrTargeted', e.target.value)} /></Field>
              <Field label="RR Achieved"><Input type="number" step="0.1" placeholder="4.8" value={form.rrAchieved as string} onChange={e => set('rrAchieved', e.target.value)} /></Field>
            </div>
            <Field label="Followed the plan?">
              <div className="flex gap-2">
                {(['YES', 'MOSTLY', 'NO'] as PlanAdherence[]).map(o => (
                  <button key={o} onClick={() => set('followedPlan', o)}
                    className={cn('flex-1 py-2 rounded text-sm font-medium transition-colors',
                      form.followedPlan === o ? 'bg-accent text-white' : 'bg-bg-elevated text-muted border border-bg-border'
                    )}>{o}</button>
                ))}
              </div>
            </Field>
            <Field label="What went well?"><Textarea value={form.wentWell} onChange={e => set('wentWell', e.target.value)} /></Field>
            <Field label="What should I improve?"><Textarea value={form.improvement} onChange={e => set('improvement', e.target.value)} /></Field>
            <Field label="Mistake made (if any)"><Input value={form.mistakesMade} onChange={e => set('mistakesMade', e.target.value)} /></Field>
            <Toggle label="Screenshot taken after close" checked={form.screenshotAfter} onChange={v => set('screenshotAfter', v)} />
          </CardBody>
        </Card>
      )}

      {/* Step 5: Psychology */}
      {step === 5 && (
        <Card>
          <CardHeader><p className="font-semibold text-sm">Psychology Review</p></CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="How did I feel before entering?">
                <Select value={form.psychology.feelingBefore} onChange={e => setNested('psychology', 'feelingBefore', e.target.value)}>
                  <option value="">— Select —</option>
                  {['Calm & Confident', 'Nervous', 'Excited', 'Fearful', 'Impatient', 'Overconfident', 'Anxious'].map(f => <option key={f}>{f}</option>)}
                </Select>
              </Field>
              <Field label="Main emotion that affected the trade">
                <Input placeholder="e.g. None — controlled session" value={form.psychology.mainEmotion}
                  onChange={e => setNested('psychology', 'mainEmotion', e.target.value)} />
              </Field>
            </div>
            <Field label={`Patience rating: ${form.psychology.patience}/5`}>
              <input type="range" min={1} max={5} className="w-full accent-accent"
                value={form.psychology.patience}
                onChange={e => setNested('psychology', 'patience', +e.target.value)} />
              <div className="flex justify-between text-xs text-muted mt-1">
                <span>Impatient</span><span>Fully patient</span>
              </div>
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border-t border-bg-border pt-3">
              {[
                ['fomo', 'Experienced FOMO'],
                ['revengeTrade', 'Took a revenge trade'],
                ['overtrade', 'Overtraded'],
                ['movedSlEmotionally', 'Moved SL emotionally'],
                ['closedTooEarly', 'Closed trade too early out of fear'],
                ['distracted', 'Was distracted during this trade'],
              ].map(([key, label]) => (
                <Toggle key={key} label={label}
                  checked={!!(form.psychology as Record<string, unknown>)[key]}
                  onChange={v => setNested('psychology', key, v)} />
              ))}
            </div>
            <Toggle label="Followed risk management rule" checked={form.psychology.followedRiskRule} onChange={v => setNested('psychology', 'followedRiskRule', v)} />
            <Field label="What would a disciplined version of me have done differently?">
              <Textarea value={form.psychology.disciplinedAction}
                onChange={e => setNested('psychology', 'disciplinedAction', e.target.value)} />
            </Field>
          </CardBody>
        </Card>
      )}

      {/* Step 6: Mistake Tracker */}
      {step === 6 && (
        <Card>
          <CardHeader><p className="font-semibold text-sm">Mistake Tracker</p></CardHeader>
          <CardBody className="space-y-1">
            <p className="text-muted text-xs mb-3">Check any that apply to this trade. These are tracked over time.</p>
            {[
              ['noLiquiditySweep', 'Entered without a liquidity sweep'],
              ['noFvgConfirmation', 'Entered without FVG confirmation'],
              ['againstStructure', 'Entered against higher timeframe structure'],
              ['enteredTooLate', 'Entered too late — chased price'],
              ['enteredTooEarly', 'Entered too early — before candle close'],
              ['ignoredSR', 'Ignored key support or resistance level'],
              ['ignoredNews', 'Ignored high-impact news event'],
              ['tooLargeLot', 'Used too large a position size'],
              ['movedSlWrong', 'Moved stop loss in the wrong direction'],
              ['closedTooEarly', 'Closed trade too early without valid reason'],
              ['revengeTrade', 'Took a revenge trade after a loss'],
              ['tooManyTrades', 'Took too many trades in one session'],
              ['noPartialTP1', 'Did not take partial profit at TP1'],
              ['skippedChecklist', 'Skipped pre-trade checklist'],
              ['tradedDuringNews', 'Traded during a major news event'],
            ].map(([key, label]) => (
              <CheckItem key={key} label={label}
                checked={!!(form.mistakes as Record<string, unknown>)[key]}
                onChange={v => setNested('mistakes', key, v)} />
            ))}
            <div className="mt-3 bg-bg-elevated rounded px-4 py-2 text-sm">
              <span className="text-muted">Mistakes this trade: </span>
              <span className={Object.values(form.mistakes).filter(Boolean).length > 0 ? 'text-loss font-semibold' : 'text-win font-semibold'}>
                {Object.values(form.mistakes).filter(Boolean).length}
              </span>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="secondary" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>
          ← Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(s => s + 1)}>Next →</Button>
        ) : (
          <Button onClick={handleSubmit} variant="primary">Save Trade ✓</Button>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useJournalStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import type { MarketBias } from '@forex-journal/shared';

const INSTRUMENTS_ALL = [
  'ES (S&P 500)', 'NQ (Nasdaq 100)', 'MES (Micro S&P)', 'MNQ (Micro Nasdaq)',
  'YM (Dow Jones)', 'RTY (Russell 2000)', 'CL (Crude Oil)', 'GC (Gold)',
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD', 'BTC/USD', 'Other',
];

const SESSIONS = ['Pre-Market', 'London', 'New York', 'London-NY Overlap', 'Regular Hours', 'After Hours'];

const EMOTIONS = ['Calm & Confident', 'Focused', 'Slightly Nervous', 'Tired', 'Distracted', 'Overconfident', 'Anxious', 'Not Ready'];

const defaultForm = {
  marketBias: 'NEUTRAL' as MarketBias,
  allowedInstruments: [] as string[],
  preferredSession: 'New York',
  maxTrades: 3,
  maxRiskPerTrade: 1,
  dailyStopLoss: 0,
  dailyProfitTarget: 0,
  keyLevels: '',
  newsToAvoid: '',
  mainSetup: '',
  noTradeConditions: '',
  emotionalState: 'Calm & Confident',
  status: 'NOT_READY' as 'READY' | 'NOT_READY',
  notes: '',
};

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-muted uppercase tracking-wider">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export default function PlanPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { getTodayPlan, addDailyPlan, updateDailyPlan, riskSettings } = useJournalStore();
  const existing = getTodayPlan(today);

  const [form, setForm] = useState({ ...defaultForm });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (existing) {
      setForm({
        marketBias: existing.marketBias,
        allowedInstruments: existing.allowedInstruments,
        preferredSession: existing.preferredSession,
        maxTrades: existing.maxTrades,
        maxRiskPerTrade: existing.maxRiskPerTrade,
        dailyStopLoss: existing.dailyStopLoss,
        dailyProfitTarget: existing.dailyProfitTarget,
        keyLevels: existing.keyLevels,
        newsToAvoid: existing.newsToAvoid,
        mainSetup: existing.mainSetup,
        noTradeConditions: existing.noTradeConditions,
        emotionalState: existing.emotionalState,
        status: existing.status,
        notes: existing.notes,
      });
    } else {
      setForm(f => ({
        ...f,
        maxTrades: riskSettings.maxDailyTrades || 3,
        maxRiskPerTrade: riskSettings.maxRiskPerTrade || 1,
        dailyStopLoss: (riskSettings.maxDailyLoss / 100) * riskSettings.accountSize,
        dailyProfitTarget: riskSettings.profitTarget ? riskSettings.profitTarget * 0.2 : 0,
      }));
    }
  }, [existing, riskSettings]);

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const toggleInstrument = (inst: string) => {
    setForm(f => ({
      ...f,
      allowedInstruments: f.allowedInstruments.includes(inst)
        ? f.allowedInstruments.filter(i => i !== inst)
        : [...f.allowedInstruments, inst],
    }));
  };

  const handleSave = (status: 'READY' | 'NOT_READY') => {
    const data = { ...form, date: today, status };
    if (existing) {
      updateDailyPlan(existing.id, data);
    } else {
      addDailyPlan(data);
    }
    setSaved(true);
    setForm(f => ({ ...f, status }));
    setTimeout(() => setSaved(false), 2000);
  };

  const isReady = form.status === 'READY';

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Daily Trade Plan</h1>
          <p className="text-muted text-sm">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        {isReady && (
          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-win/10 text-win border border-win/30">
            ✓ Ready to Trade
          </span>
        )}
      </div>

      {/* Market bias */}
      <Card>
        <CardHeader><p className="font-semibold text-sm">Market Bias</p></CardHeader>
        <CardBody className="space-y-4">
          <Field label="Today's Bias">
            <div className="flex gap-2">
              {(['BULLISH', 'NEUTRAL', 'BEARISH'] as MarketBias[]).map(b => (
                <button key={b} onClick={() => set('marketBias', b)}
                  className={cn('flex-1 py-2.5 rounded text-sm font-semibold transition-colors',
                    form.marketBias === b
                      ? b === 'BULLISH' ? 'bg-win text-white'
                        : b === 'BEARISH' ? 'bg-loss text-white'
                          : 'bg-accent text-white'
                      : 'bg-bg-elevated text-muted border border-bg-border hover:border-accent/40'
                  )}>
                  {b === 'BULLISH' ? '↑ Bullish' : b === 'BEARISH' ? '↓ Bearish' : '→ Neutral'}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Key Levels (support / resistance)" hint="Write the levels you are watching today">
            <textarea value={form.keyLevels} onChange={e => set('keyLevels', e.target.value)}
              placeholder="e.g. NQ resistance: 21,450 | Support: 21,200 | ES key: 5,820"
              rows={2} className="w-full px-3 py-2 text-sm bg-bg-elevated border border-bg-border rounded-md text-text outline-none focus:border-accent resize-none" />
          </Field>

          <Field label="News to Avoid">
            <input value={form.newsToAvoid} onChange={e => set('newsToAvoid', e.target.value)}
              placeholder="e.g. CPI at 8:30 ET — no trades 10 min before/after"
              className="w-full px-3 py-2 text-sm bg-bg-elevated border border-bg-border rounded-md text-text outline-none focus:border-accent" />
          </Field>
        </CardBody>
      </Card>

      {/* What I will trade */}
      <Card>
        <CardHeader><p className="font-semibold text-sm">What I Will Trade Today</p></CardHeader>
        <CardBody className="space-y-4">
          <Field label="Allowed Instruments" hint="Only trade these today. Tap to select.">
            <div className="flex flex-wrap gap-1.5">
              {INSTRUMENTS_ALL.map(inst => (
                <button key={inst} onClick={() => toggleInstrument(inst)}
                  className={cn('px-2.5 py-1 rounded text-xs border transition-all',
                    form.allowedInstruments.includes(inst)
                      ? 'bg-accent/20 text-accent border-accent/50'
                      : 'bg-bg-elevated text-muted border-bg-border hover:border-accent/30'
                  )}>
                  {inst}
                </button>
              ))}
            </div>
            {form.allowedInstruments.length === 0 && (
              <p className="text-loss text-xs">No instruments selected — you should not trade until this is set.</p>
            )}
          </Field>

          <Field label="Preferred Session">
            <div className="flex flex-wrap gap-2">
              {SESSIONS.map(s => (
                <button key={s} onClick={() => set('preferredSession', s)}
                  className={cn('px-3 py-1.5 rounded text-xs font-medium transition-colors',
                    form.preferredSession === s ? 'bg-accent text-white' : 'bg-bg-elevated text-muted border border-bg-border')}>
                  {s}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Main Setup I Am Waiting For">
            <input value={form.mainSetup} onChange={e => set('mainSetup', e.target.value)}
              placeholder="e.g. NQ Liquidity Sweep + FVG Retest on 5M after London open"
              className="w-full px-3 py-2 text-sm bg-bg-elevated border border-bg-border rounded-md text-text outline-none focus:border-accent" />
          </Field>

          <Field label="No-Trade Conditions" hint="Situations where you will NOT take a trade even if it looks good">
            <textarea value={form.noTradeConditions} onChange={e => set('noTradeConditions', e.target.value)}
              placeholder="e.g. Do not trade if NQ is inside the previous day's range. No trades after 11:30 ET. No counter-trend trades."
              rows={2} className="w-full px-3 py-2 text-sm bg-bg-elevated border border-bg-border rounded-md text-text outline-none focus:border-accent resize-none" />
          </Field>
        </CardBody>
      </Card>

      {/* Risk limits */}
      <Card>
        <CardHeader><p className="font-semibold text-sm">Today's Risk Limits</p></CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Max Trades Today', key: 'maxTrades' as const, suffix: '' },
              { label: 'Max Risk Per Trade', key: 'maxRiskPerTrade' as const, suffix: '%' },
              { label: 'Daily Stop Loss ($)', key: 'dailyStopLoss' as const, suffix: '' },
              { label: 'Daily Profit Target ($)', key: 'dailyProfitTarget' as const, suffix: '' },
            ].map(f => (
              <Field key={f.key} label={f.label}>
                <div className="flex items-center bg-bg-elevated border border-bg-border rounded-md overflow-hidden">
                  <input type="number" value={form[f.key]} onChange={e => set(f.key, parseFloat(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 text-sm bg-transparent text-text outline-none" />
                  {f.suffix && <span className="px-2 text-muted text-sm border-l border-bg-border bg-bg-base">{f.suffix}</span>}
                </div>
              </Field>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Mindset */}
      <Card>
        <CardHeader><p className="font-semibold text-sm">Mindset Check</p></CardHeader>
        <CardBody className="space-y-4">
          <Field label="How do I feel right now?">
            <div className="flex flex-wrap gap-2">
              {EMOTIONS.map(e => (
                <button key={e} onClick={() => set('emotionalState', e)}
                  className={cn('px-3 py-1.5 rounded text-xs font-medium transition-colors',
                    form.emotionalState === e ? 'bg-accent text-white' : 'bg-bg-elevated text-muted border border-bg-border')}>
                  {e}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Notes (anything else for today)">
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="e.g. Slept well. Market was choppy yesterday — wait for clean structure today."
              rows={2} className="w-full px-3 py-2 text-sm bg-bg-elevated border border-bg-border rounded-md text-text outline-none focus:border-accent resize-none" />
          </Field>
        </CardBody>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 pb-4">
        <Button onClick={() => handleSave('READY')} variant="primary">
          {saved && form.status === 'READY' ? '✓ Saved' : '✓ Plan Ready — Start Trading Day'}
        </Button>
        <Button onClick={() => handleSave('NOT_READY')} variant="secondary">
          Save Draft
        </Button>
      </div>
    </div>
  );
}

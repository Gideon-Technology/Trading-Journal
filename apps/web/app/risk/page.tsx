'use client';

import { useMemo, useState } from 'react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { useJournalStore, PROP_FIRM_TEMPLATES } from '@/lib/store';
import type { RiskSettings } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { calcContractSizing, FUTURES_META } from '@forex-journal/shared';

function Gauge({ label, value, max, warn = 60, danger = 85, fmt = (v: number) => v.toFixed(1) }: {
  label: string; value: number; max: number; warn?: number; danger?: number; fmt?: (v: number) => string;
}) {
  const pct = max === 0 ? 0 : Math.min(100, (value / max) * 100);
  const color = pct >= danger ? 'bg-loss' : pct >= warn ? 'bg-breakeven' : 'bg-win';
  const textColor = pct >= danger ? 'text-loss' : pct >= warn ? 'text-breakeven' : 'text-win';
  return (
    <div className="bg-bg-elevated rounded-lg p-4 border border-bg-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-muted text-xs">{label}</span>
        <span className={`font-mono font-bold text-sm ${textColor}`}>{fmt(value)} / {fmt(max)}</span>
      </div>
      <div className="w-full bg-bg-border rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function RField({ label, value, onChange, prefix = '', suffix = '', step = 1 }: {
  label: string; value: number; onChange: (v: number) => void; prefix?: string; suffix?: string; step?: number;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs text-muted font-medium uppercase tracking-wider">{label}</label>
      <div className="flex items-center bg-bg-elevated border border-bg-border rounded-md overflow-hidden">
        {prefix && <span className="px-2 text-muted text-sm border-r border-bg-border bg-bg-base">{prefix}</span>}
        <input type="number" value={value} min={0} step={step}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="flex-1 px-3 py-2 text-sm bg-transparent text-text outline-none" />
        {suffix && <span className="px-2 text-muted text-sm border-l border-bg-border bg-bg-base">{suffix}</span>}
      </div>
    </div>
  );
}

export default function RiskDashboard() {
  const { trades, riskSettings, updateRiskSettings } = useJournalStore();
  const [draft, setDraft] = useState<RiskSettings>({ ...riskSettings });
  const [saved, setSaved] = useState(false);

  // Contract calc state
  const [calcInstrument, setCalcInstrument] = useState('NQ (Nasdaq 100)');
  const [calcEntry, setCalcEntry] = useState('');
  const [calcSL, setCalcSL] = useState('');
  const [calcTP1, setCalcTP1] = useState('');
  const [calcTP2, setCalcTP2] = useState('');
  const [calcTP3, setCalcTP3] = useState('');
  const [calcDir, setCalcDir] = useState<'LONG' | 'SHORT'>('LONG');

  const today = format(new Date(), 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const todayTrades = useMemo(() => trades.filter(t => t.date === today), [trades, today]);
  const weekTrades = useMemo(() => trades.filter(t => t.date >= weekStart && t.date <= weekEnd), [trades, weekStart, weekEnd]);

  const todayPnL = useMemo(() => todayTrades.reduce((s, t) => s + (t.profitLossDollar ?? 0), 0), [todayTrades]);
  const weekPnL = useMemo(() => weekTrades.reduce((s, t) => s + (t.profitLossDollar ?? 0), 0), [weekTrades]);

  const consecutiveLosses = useMemo(() => {
    let count = 0;
    for (const t of trades) { if (t.outcome === 'LOSS') count++; else break; }
    return count;
  }, [trades]);

  const maxDailyLossDollar = (riskSettings.maxDailyLoss / 100) * riskSettings.accountSize;
  const maxWeeklyLossDollar = (riskSettings.maxWeeklyLoss / 100) * riskSettings.accountSize;
  const todayLoss = Math.abs(Math.min(0, todayPnL));
  const weekLoss = Math.abs(Math.min(0, weekPnL));
  const profitProgress = riskSettings.profitTarget ? Math.max(0, weekTrades.reduce((s, t) => s + (t.profitLossDollar ?? 0), 0)) : 0;

  const setD = (k: keyof RiskSettings, v: number | string) => setDraft(d => ({ ...d, [k]: v }));

  const applyTemplate = (tpl: typeof PROP_FIRM_TEMPLATES[0]) => {
    const next: RiskSettings = {
      accountSize: tpl.accountSize,
      maxRiskPerTrade: tpl.maxRiskPerTrade,
      maxDailyLoss: tpl.dailyLossPct,
      maxDailyTrades: tpl.maxDailyTrades,
      maxWeeklyLoss: tpl.dailyLossPct * 2,
      maxConsecutiveLosses: tpl.maxConsecutiveLosses,
      trailingDrawdown: tpl.trailingDrawdown,
      profitTarget: tpl.profitTarget,
      maxContracts: tpl.maxContracts,
      propFirm: tpl.label,
    };
    setDraft(next);
  };

  const save = () => {
    updateRiskSettings(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const contractResult = useMemo(() => {
    if (!calcEntry || !calcSL) return null;
    return calcContractSizing({
      instrument: calcInstrument,
      accountSize: draft.accountSize,
      riskPercent: draft.maxRiskPerTrade,
      entry: parseFloat(calcEntry),
      stopLoss: parseFloat(calcSL),
      tp1: parseFloat(calcTP1) || 0,
      tp2: parseFloat(calcTP2) || 0,
      tp3: parseFloat(calcTP3) || 0,
      direction: calcDir,
    });
  }, [calcInstrument, calcEntry, calcSL, calcTP1, calcTP2, calcTP3, calcDir, draft.accountSize, draft.maxRiskPerTrade]);

  const futuresInstruments = Object.keys(FUTURES_META);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-text">Risk Dashboard</h1>
        <p className="text-muted text-sm">
          {riskSettings.propFirm ? `${riskSettings.propFirm} · ` : ''}
          Account: {formatCurrency(riskSettings.accountSize)}
        </p>
      </div>

      {/* Today live */}
      <Card>
        <CardHeader><p className="font-semibold text-sm">Today — {format(new Date(), 'EEEE, MMMM d')}</p></CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-bg-elevated rounded-lg p-4 border border-bg-border text-center">
              <p className="text-muted text-xs mb-1">Trades Today</p>
              <p className={`font-bold text-2xl font-mono ${riskSettings.maxDailyTrades > 0 && todayTrades.length >= riskSettings.maxDailyTrades ? 'text-loss' : 'text-text'}`}>
                {todayTrades.length}
                {riskSettings.maxDailyTrades > 0 && <span className="text-muted text-sm font-normal"> / {riskSettings.maxDailyTrades}</span>}
              </p>
            </div>
            <div className="bg-bg-elevated rounded-lg p-4 border border-bg-border text-center">
              <p className="text-muted text-xs mb-1">Today P&L</p>
              <p className={`font-bold text-2xl font-mono ${todayPnL >= 0 ? 'text-win' : 'text-loss'}`}>{formatCurrency(todayPnL)}</p>
            </div>
          </div>
          <Gauge label="Daily loss used" value={todayLoss} max={maxDailyLossDollar} fmt={v => formatCurrency(v)} />
          <Gauge label="Consecutive losses" value={consecutiveLosses} max={riskSettings.maxConsecutiveLosses} fmt={v => `${v}`} />
          {riskSettings.trailingDrawdown && (
            <Gauge label="Trailing drawdown used" value={todayLoss} max={riskSettings.trailingDrawdown} fmt={v => formatCurrency(v)} />
          )}
        </CardBody>
      </Card>

      {/* This week + profit target */}
      <Card>
        <CardHeader><p className="font-semibold text-sm">This Week</p></CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-bg-elevated rounded-lg p-4 border border-bg-border text-center">
              <p className="text-muted text-xs mb-1">Trades This Week</p>
              <p className="font-bold text-2xl font-mono text-text">{weekTrades.length}</p>
            </div>
            <div className="bg-bg-elevated rounded-lg p-4 border border-bg-border text-center">
              <p className="text-muted text-xs mb-1">Week P&L</p>
              <p className={`font-bold text-2xl font-mono ${weekPnL >= 0 ? 'text-win' : 'text-loss'}`}>{formatCurrency(weekPnL)}</p>
            </div>
          </div>
          <Gauge label="Weekly loss used" value={weekLoss} max={maxWeeklyLossDollar} fmt={v => formatCurrency(v)} />
          {riskSettings.profitTarget && riskSettings.profitTarget > 0 && (
            <Gauge label="Profit target progress" value={profitProgress} max={riskSettings.profitTarget} warn={70} danger={95} fmt={v => formatCurrency(v)} />
          )}
        </CardBody>
      </Card>

      {/* Contract sizing calculator */}
      <Card>
        <CardHeader>
          <div>
            <p className="font-semibold text-sm">Contract Sizing Calculator</p>
            <p className="text-muted text-xs mt-0.5">Uses your risk rules above</p>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs text-muted font-medium uppercase tracking-wider">Instrument</label>
              <select value={calcInstrument} onChange={e => setCalcInstrument(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-bg-elevated border border-bg-border rounded-md text-text">
                {futuresInstruments.map(i => <option key={i}>{i}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-muted font-medium uppercase tracking-wider">Direction</label>
              <div className="flex gap-2">
                {(['LONG', 'SHORT'] as const).map(d => (
                  <button key={d} onClick={() => setCalcDir(d)}
                    className={`flex-1 py-2 rounded text-sm font-semibold transition-colors ${calcDir === d ? (d === 'LONG' ? 'bg-win text-white' : 'bg-loss text-white') : 'bg-bg-elevated text-muted border border-bg-border'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'Entry Price', val: calcEntry, set: setCalcEntry },
              { label: 'Stop Loss', val: calcSL, set: setCalcSL },
              { label: 'TP1', val: calcTP1, set: setCalcTP1 },
              { label: 'TP2', val: calcTP2, set: setCalcTP2 },
              { label: 'TP3', val: calcTP3, set: setCalcTP3 },
            ].map(f => (
              <div key={f.label} className="space-y-1">
                <label className="block text-xs text-muted font-medium uppercase tracking-wider">{f.label}</label>
                <input type="number" step="0.25" value={f.val} onChange={e => f.set(e.target.value)} placeholder="0"
                  className="w-full px-3 py-2 text-sm bg-bg-elevated border border-bg-border rounded-md text-text outline-none focus:border-accent" />
              </div>
            ))}
          </div>

          {contractResult && (
            <div className="bg-bg-elevated rounded-lg p-4 border border-bg-border space-y-3">
              {contractResult.warning && (
                <p className="text-loss text-xs font-medium">⚠ {contractResult.warning}</p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Recommended Contracts', value: contractResult.recommendedContracts.toString(), highlight: true },
                  { label: 'Dollar Risk', value: formatCurrency(contractResult.dollarRisk) },
                  { label: 'Points Risk', value: contractResult.pointsRisk.toFixed(2) + ' pts' },
                  { label: 'Ticks Risk', value: contractResult.ticksRisk.toFixed(0) + ' ticks' },
                  ...(contractResult.rrToTP1 > 0 ? [{ label: 'R:R to TP1', value: contractResult.rrToTP1.toFixed(2) + ':1' }] : []),
                  ...(contractResult.rrToTP2 > 0 ? [{ label: 'R:R to TP2', value: contractResult.rrToTP2.toFixed(2) + ':1' }] : []),
                  ...(contractResult.rrToTP3 > 0 ? [{ label: 'R:R to TP3', value: contractResult.rrToTP3.toFixed(2) + ':1' }] : []),
                  { label: 'Risk per Contract', value: formatCurrency(contractResult.riskPerContract) },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className={`font-mono font-bold ${s.highlight ? 'text-2xl text-accent' : 'text-sm text-text'}`}>{s.value}</p>
                    <p className="text-muted text-xs">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!contractResult && calcEntry && calcSL && (
            <p className="text-muted text-xs">Instrument not in futures database — add manually.</p>
          )}
        </CardBody>
      </Card>

      {/* Prop firm templates */}
      <Card>
        <CardHeader><p className="font-semibold text-sm">Prop Firm Templates</p></CardHeader>
        <CardBody className="space-y-3">
          <p className="text-muted text-xs">Select a template to auto-fill all risk rules below.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {PROP_FIRM_TEMPLATES.map(tpl => (
              <button key={tpl.label} onClick={() => applyTemplate(tpl)}
                className={`p-3 rounded-lg border text-left transition-all ${draft.propFirm === tpl.label ? 'border-accent bg-accent/10' : 'border-bg-border bg-bg-elevated hover:border-accent/40'}`}>
                <p className={`text-sm font-semibold ${draft.propFirm === tpl.label ? 'text-accent' : 'text-text'}`}>{tpl.label}</p>
                <p className="text-muted text-xs mt-0.5">
                  Daily: {formatCurrency((tpl.dailyLossPct / 100) * tpl.accountSize)} ·
                  DD: {formatCurrency(tpl.trailingDrawdown)} ·
                  Target: {formatCurrency(tpl.profitTarget)} ·
                  Max {tpl.maxContracts} contracts
                </p>
                <p className="text-muted text-xs">{tpl.platform}</p>
              </button>
            ))}
            <button onClick={() => setDraft(d => ({ ...d, propFirm: 'Custom' }))}
              className={`p-3 rounded-lg border text-left transition-all ${draft.propFirm === 'Custom' || !draft.propFirm ? 'border-accent bg-accent/10' : 'border-bg-border bg-bg-elevated hover:border-accent/40'}`}>
              <p className="text-sm font-semibold text-text">Custom</p>
              <p className="text-muted text-xs mt-0.5">Set your own rules below</p>
            </button>
          </div>
        </CardBody>
      </Card>

      {/* Risk rules */}
      <Card>
        <CardHeader><p className="font-semibold text-sm">Risk Rules</p></CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <RField label="Account Size" value={draft.accountSize} onChange={v => setD('accountSize', v)} prefix="$" step={1000} />
            <RField label="Max Risk Per Trade" value={draft.maxRiskPerTrade} onChange={v => setD('maxRiskPerTrade', v)} suffix="%" step={0.1} />
            <RField label="Max Daily Loss" value={draft.maxDailyLoss} onChange={v => setD('maxDailyLoss', v)} suffix="%" step={0.1} />
            <RField label="Max Trades Per Day" value={draft.maxDailyTrades} onChange={v => setD('maxDailyTrades', v)} />
            <RField label="Max Weekly Loss" value={draft.maxWeeklyLoss} onChange={v => setD('maxWeeklyLoss', v)} suffix="%" step={0.1} />
            <RField label="Max Consecutive Losses" value={draft.maxConsecutiveLosses} onChange={v => setD('maxConsecutiveLosses', v)} />
            <RField label="Trailing Drawdown ($)" value={draft.trailingDrawdown ?? 0} onChange={v => setD('trailingDrawdown', v)} prefix="$" step={100} />
            <RField label="Profit Target ($)" value={draft.profitTarget ?? 0} onChange={v => setD('profitTarget', v)} prefix="$" step={100} />
            <RField label="Max Contracts" value={draft.maxContracts ?? 0} onChange={v => setD('maxContracts', v)} />
          </div>
          <div className="flex items-center gap-3 pt-1 border-t border-bg-border">
            <Button onClick={save}>{saved ? '✓ Saved' : 'Save Rules'}</Button>
            <p className="text-muted text-xs">
              Daily limit: {formatCurrency((draft.maxDailyLoss / 100) * draft.accountSize)} ·
              Weekly limit: {formatCurrency((draft.maxWeeklyLoss / 100) * draft.accountSize)}
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

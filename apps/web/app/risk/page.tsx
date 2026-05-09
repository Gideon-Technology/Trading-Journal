'use client';

import { useMemo, useState } from 'react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { useJournalStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { RiskSettings } from '@/lib/store';

function Gauge({ label, value, max, warn, danger, format: fmt = (v: number) => v.toFixed(1) }: {
  label: string;
  value: number;
  max: number;
  warn: number;
  danger: number;
  format?: (v: number) => string;
}) {
  const pct = Math.min(100, max === 0 ? 0 : (value / max) * 100);
  const color = pct >= danger ? 'bg-loss' : pct >= warn ? 'bg-breakeven' : 'bg-win';
  const textColor = pct >= danger ? 'text-loss' : pct >= warn ? 'text-breakeven' : 'text-win';

  return (
    <div className="bg-bg-elevated rounded-lg p-4 border border-bg-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-muted text-xs">{label}</span>
        <span className={`font-mono font-bold text-sm ${textColor}`}>{fmt(value)}</span>
      </div>
      <div className="w-full bg-bg-border rounded-full h-2 mb-1">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-muted mt-1">
        <span>0</span>
        <span>Limit: {fmt(max)}</span>
      </div>
    </div>
  );
}

function RField({ label, value, onChange, prefix = '', suffix = '' }: {
  label: string; value: number; onChange: (v: number) => void; prefix?: string; suffix?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs text-muted font-medium uppercase tracking-wider">{label}</label>
      <div className="flex items-center bg-bg-elevated border border-bg-border rounded-md overflow-hidden">
        {prefix && <span className="px-2 text-muted text-sm border-r border-bg-border">{prefix}</span>}
        <input
          type="number"
          value={value}
          min={0}
          step={suffix === '%' ? 0.1 : 100}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="flex-1 px-3 py-2 text-sm bg-transparent text-text outline-none"
        />
        {suffix && <span className="px-2 text-muted text-sm border-l border-bg-border">{suffix}</span>}
      </div>
    </div>
  );
}

export default function RiskDashboard() {
  const { trades, riskSettings, updateRiskSettings } = useJournalStore();
  const [draft, setDraft] = useState<RiskSettings>(riskSettings);
  const [saved, setSaved] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const todayTrades = useMemo(() => trades.filter(t => t.date === today), [trades, today]);
  const weekTrades = useMemo(() => trades.filter(t => t.date >= weekStart && t.date <= weekEnd), [trades, weekStart, weekEnd]);

  const todayPnL = useMemo(() => todayTrades.reduce((s, t) => s + (t.profitLossDollar ?? 0), 0), [todayTrades]);
  const weekPnL = useMemo(() => weekTrades.reduce((s, t) => s + (t.profitLossDollar ?? 0), 0), [weekTrades]);

  const consecutiveLosses = useMemo(() => {
    let count = 0;
    for (const t of trades) {
      if (t.outcome === 'LOSS') count++;
      else break;
    }
    return count;
  }, [trades]);

  const maxDailyLossDollar = (riskSettings.maxDailyLoss / 100) * riskSettings.accountSize;
  const maxWeeklyLossDollar = (riskSettings.maxWeeklyLoss / 100) * riskSettings.accountSize;
  const todayLoss = Math.abs(Math.min(0, todayPnL));
  const weekLoss = Math.abs(Math.min(0, weekPnL));

  const save = () => {
    updateRiskSettings(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const setD = (k: keyof RiskSettings, v: number) => setDraft(d => ({ ...d, [k]: v }));

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-text">Risk Dashboard</h1>
        <p className="text-muted text-sm">Live risk monitoring and personal rule settings.</p>
      </div>

      {/* Live gauges */}
      <Card>
        <CardHeader><p className="font-semibold text-sm">Today — {format(new Date(), 'EEEE, MMMM d')}</p></CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div className="bg-bg-elevated rounded-lg p-4 border border-bg-border text-center">
              <p className="text-muted text-xs mb-1">Trades Today</p>
              <p className={`font-bold text-2xl font-mono ${todayTrades.length >= riskSettings.maxDailyTrades ? 'text-loss' : 'text-text'}`}>
                {todayTrades.length}
                <span className="text-muted text-sm font-normal"> / {riskSettings.maxDailyTrades}</span>
              </p>
              {todayTrades.length >= riskSettings.maxDailyTrades && (
                <p className="text-loss text-xs mt-1">Daily limit reached — stop trading</p>
              )}
            </div>
            <div className="bg-bg-elevated rounded-lg p-4 border border-bg-border text-center">
              <p className="text-muted text-xs mb-1">Today P&L</p>
              <p className={`font-bold text-2xl font-mono ${todayPnL >= 0 ? 'text-win' : 'text-loss'}`}>
                {formatCurrency(todayPnL)}
              </p>
            </div>
          </div>
          <Gauge
            label="Daily loss used"
            value={todayLoss}
            max={maxDailyLossDollar}
            warn={60}
            danger={85}
            format={v => formatCurrency(v)}
          />
          <Gauge
            label="Consecutive losses"
            value={consecutiveLosses}
            max={riskSettings.maxConsecutiveLosses}
            warn={60}
            danger={90}
            format={v => `${v}`}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader><p className="font-semibold text-sm">This Week</p></CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div className="bg-bg-elevated rounded-lg p-4 border border-bg-border text-center">
              <p className="text-muted text-xs mb-1">Trades This Week</p>
              <p className="font-bold text-2xl font-mono text-text">{weekTrades.length}</p>
            </div>
            <div className="bg-bg-elevated rounded-lg p-4 border border-bg-border text-center">
              <p className="text-muted text-xs mb-1">Week P&L</p>
              <p className={`font-bold text-2xl font-mono ${weekPnL >= 0 ? 'text-win' : 'text-loss'}`}>
                {formatCurrency(weekPnL)}
              </p>
            </div>
          </div>
          <Gauge
            label="Weekly loss used"
            value={weekLoss}
            max={maxWeeklyLossDollar}
            warn={60}
            danger={85}
            format={v => formatCurrency(v)}
          />
        </CardBody>
      </Card>

      {/* Risk settings */}
      <Card>
        <CardHeader><p className="font-semibold text-sm">Risk Rules</p></CardHeader>
        <CardBody className="space-y-4">
          <p className="text-muted text-xs">Set your personal risk limits. These are used to power the gauges above.</p>
          <div className="grid grid-cols-2 gap-4">
            <RField label="Account Size" value={draft.accountSize} onChange={v => setD('accountSize', v)} prefix="$" />
            <RField label="Max Risk Per Trade" value={draft.maxRiskPerTrade} onChange={v => setD('maxRiskPerTrade', v)} suffix="%" />
            <RField label="Max Daily Loss" value={draft.maxDailyLoss} onChange={v => setD('maxDailyLoss', v)} suffix="%" />
            <RField label="Max Trades Per Day" value={draft.maxDailyTrades} onChange={v => setD('maxDailyTrades', v)} />
            <RField label="Max Weekly Loss" value={draft.maxWeeklyLoss} onChange={v => setD('maxWeeklyLoss', v)} suffix="%" />
            <RField label="Max Consecutive Losses" value={draft.maxConsecutiveLosses} onChange={v => setD('maxConsecutiveLosses', v)} />
          </div>
          <div className="flex items-center gap-3 pt-2">
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

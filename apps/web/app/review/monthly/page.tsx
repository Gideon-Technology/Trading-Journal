'use client';

import { useState, useMemo } from 'react';
import { useJournalStore } from '@/lib/store';
import { computeStats } from '@forex-journal/shared';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO, getMonth, getYear } from 'date-fns';

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-muted uppercase tracking-wider">{label}</label>
      <textarea className="w-full px-3 py-2 text-sm resize-none rounded-md" rows={2}
        value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function MonthlyReview() {
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth());
  const [year, setYear] = useState(currentDate.getFullYear());

  const { trades, monthlyReviews, addMonthlyReview, updateMonthlyReview } = useJournalStore();

  const monthTrades = useMemo(() =>
    trades.filter(t => {
      try {
        const d = parseISO(t.date);
        return getMonth(d) === month && getYear(d) === year;
      } catch { return false; }
    }), [trades, month, year]);

  const monthStats = useMemo(() => computeStats(monthTrades), [monthTrades]);

  const existing = monthlyReviews.find(r => r.month === MONTHS[month] && r.year === year);
  const [form, setForm] = useState({
    biggestPsychWin: existing?.biggestPsychWin ?? '',
    biggestPsychChallenge: existing?.biggestPsychChallenge ?? '',
    mainImprovementNextMonth: existing?.mainImprovementNextMonth ?? '',
    tradingGoalNextMonth: existing?.tradingGoalNextMonth ?? '',
    increaseLotSize: existing?.increaseLotSize ?? false,
    increaseLotSizeReason: existing?.increaseLotSizeReason ?? '',
    notes: existing?.notes ?? '',
  });

  const set = (k: keyof typeof form, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    const data = { ...form, month: MONTHS[month], year };
    if (existing) {
      updateMonthlyReview(existing.id, data);
    } else {
      addMonthlyReview(data);
    }
    alert('Monthly review saved.');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Monthly Review</h1>
          <p className="text-muted text-sm">{MONTHS[month]} {year}</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={month} onChange={e => setMonth(+e.target.value)}
            className="px-3 py-1.5 text-sm rounded-md bg-bg-elevated border border-bg-border text-text">
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(+e.target.value)}
            className="px-3 py-1.5 text-sm rounded-md bg-bg-elevated border border-bg-border text-text">
            {[2024, 2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Auto stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Trades" value={monthStats.totalTrades} />
        <StatCard label="Win Rate" value={`${monthStats.winRate.toFixed(1)}%`} valueClass={monthStats.winRate >= 50 ? 'text-win' : 'text-loss'} />
        <StatCard label="Total P&L" value={formatCurrency(monthStats.totalPnlDollar)} valueClass={monthStats.totalPnlDollar >= 0 ? 'text-win' : 'text-loss'} />
        <StatCard label="Avg R:R" value={monthStats.avgRR.toFixed(2)} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Avg Quality" value={`${monthStats.avgQualityScore.toFixed(1)}/10`} valueClass="text-accent" />
        <StatCard label="Best Pair" value={monthStats.bestPair} valueClass="text-win" />
        <StatCard label="Worst Pair" value={monthStats.worstPair} valueClass="text-loss" />
        <StatCard label="Best Setup" value={monthStats.mostProfitableSetup} valueClass="text-win" />
      </div>

      {/* Review form */}
      <Card>
        <CardHeader><p className="font-semibold text-sm">Monthly Reflection</p></CardHeader>
        <CardBody className="space-y-4">
          <Textarea label="Biggest psychological WIN this month" value={form.biggestPsychWin} onChange={v => set('biggestPsychWin', v)} />
          <Textarea label="Biggest psychological CHALLENGE this month" value={form.biggestPsychChallenge} onChange={v => set('biggestPsychChallenge', v)} />
          <Textarea label="Main improvement for next month" value={form.mainImprovementNextMonth} onChange={v => set('mainImprovementNextMonth', v)} />
          <Textarea label="Trading goal for next month (be specific)" value={form.tradingGoalNextMonth} onChange={v => set('tradingGoalNextMonth', v)} />
          <div className="space-y-2">
            <label className="block text-xs font-medium text-muted uppercase tracking-wider">Ready to increase lot size?</label>
            <div className="flex gap-2">
              {[true, false].map(o => (
                <button key={String(o)} onClick={() => set('increaseLotSize', o)}
                  className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${form.increaseLotSize === o ? 'bg-accent text-white' : 'bg-bg-elevated text-muted border border-bg-border'}`}>
                  {o ? 'YES' : 'NO — not yet'}
                </button>
              ))}
            </div>
            {form.increaseLotSize && (
              <Textarea label="Why are you ready?" value={form.increaseLotSizeReason} onChange={v => set('increaseLotSizeReason', v)} />
            )}
          </div>
          <Textarea label="Additional notes" value={form.notes} onChange={v => set('notes', v)} />
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>Save Monthly Review</Button>
      </div>
    </div>
  );
}

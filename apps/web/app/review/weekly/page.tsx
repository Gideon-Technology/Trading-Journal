'use client';

import { useState, useMemo } from 'react';
import { useJournalStore } from '@/lib/store';
import { computeStats } from '@forex-journal/shared';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { formatCurrency } from '@/lib/utils';
import { startOfWeek, endOfWeek, format, isWithinInterval, parseISO } from 'date-fns';

function Textarea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-muted uppercase tracking-wider">{label}</label>
      <textarea className="w-full px-3 py-2 text-sm resize-none rounded-md" rows={2}
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export default function WeeklyReview() {
  const [weekOf, setWeekOf] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { trades, weeklyReviews, addWeeklyReview, updateWeeklyReview } = useJournalStore();

  const weekStart = startOfWeek(parseISO(weekOf), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(parseISO(weekOf), { weekStartsOn: 1 });

  const weekTrades = useMemo(() =>
    trades.filter(t => {
      try { return isWithinInterval(parseISO(t.date), { start: weekStart, end: weekEnd }); }
      catch { return false; }
    }), [trades, weekStart, weekEnd]);

  const weekStats = useMemo(() => computeStats(weekTrades), [weekTrades]);

  const existing = weeklyReviews.find(r => r.weekStart === format(weekStart, 'yyyy-MM-dd'));
  const [form, setForm] = useState({
    bestSetup: existing?.bestSetup ?? '',
    worstSetup: existing?.worstSetup ?? '',
    biggestPsychChallenge: existing?.biggestPsychChallenge ?? '',
    bestLesson: existing?.bestLesson ?? '',
    mainFocusNextWeek: existing?.mainFocusNextWeek ?? '',
    onTrackMonthlyGoal: existing?.onTrackMonthlyGoal ?? 'YES' as 'YES' | 'NO' | 'CLOSE',
    notes: existing?.notes ?? '',
  });

  const set = (k: keyof typeof form, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    const data = {
      ...form,
      weekStart: format(weekStart, 'yyyy-MM-dd'),
      weekEnd: format(weekEnd, 'yyyy-MM-dd'),
    };
    if (existing) {
      updateWeeklyReview(existing.id, data);
    } else {
      addWeeklyReview(data);
    }
    alert('Weekly review saved.');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Weekly Review</h1>
          <p className="text-muted text-sm">{format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted text-xs">Week of:</span>
          <input type="date" value={weekOf} onChange={e => setWeekOf(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-md bg-bg-elevated border border-bg-border text-text" />
        </div>
      </div>

      {/* Auto stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Trades" value={weekStats.totalTrades} />
        <StatCard label="Win Rate" value={`${weekStats.winRate.toFixed(1)}%`} valueClass={weekStats.winRate >= 50 ? 'text-win' : 'text-loss'} />
        <StatCard label="Total P&L" value={formatCurrency(weekStats.totalPnlDollar)} valueClass={weekStats.totalPnlDollar >= 0 ? 'text-win' : 'text-loss'} />
        <StatCard label="Avg R:R" value={weekStats.avgRR.toFixed(2)} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="Best Pair" value={weekStats.bestPair} valueClass="text-win" />
        <StatCard label="Best Session" value={weekStats.bestSession} valueClass="text-win" />
        <StatCard label="Top Mistake" value={weekStats.mostRepeatedMistake.replace(/([A-Z])/g, ' $1').trim()} valueClass="text-loss" />
      </div>

      {/* Review form */}
      <Card>
        <CardHeader><p className="font-semibold text-sm">Weekly Reflection</p></CardHeader>
        <CardBody className="space-y-4">
          <Textarea label="Best setup this week (pair + detail)" value={form.bestSetup} onChange={v => set('bestSetup', v)} />
          <Textarea label="Worst setup this week (what went wrong)" value={form.worstSetup} onChange={v => set('worstSetup', v)} />
          <Textarea label="Biggest psychological challenge" value={form.biggestPsychChallenge} onChange={v => set('biggestPsychChallenge', v)} />
          <Textarea label="Best lesson this week" value={form.bestLesson} onChange={v => set('bestLesson', v)} />
          <Textarea label="Main focus for next week" value={form.mainFocusNextWeek} onChange={v => set('mainFocusNextWeek', v)} />
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted uppercase tracking-wider">On track with monthly goal?</label>
            <div className="flex gap-2">
              {(['YES', 'NO', 'CLOSE'] as const).map(o => (
                <button key={o} onClick={() => set('onTrackMonthlyGoal', o)}
                  className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${form.onTrackMonthlyGoal === o ? 'bg-accent text-white' : 'bg-bg-elevated text-muted border border-bg-border'}`}>
                  {o}
                </button>
              ))}
            </div>
          </div>
          <Textarea label="Additional notes" value={form.notes} onChange={v => set('notes', v)} />
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>Save Weekly Review</Button>
      </div>
    </div>
  );
}

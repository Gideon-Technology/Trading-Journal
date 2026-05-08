'use client';

import { useState, useMemo } from 'react';
import { useJournalStore } from '@/lib/store';
import { computeStats } from '@forex-journal/shared';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { formatCurrency, outcomeBg } from '@/lib/utils';
import { format } from 'date-fns';

function Textarea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-muted uppercase tracking-wider">{label}</label>
      <textarea className="w-full px-3 py-2 text-sm resize-none rounded-md" rows={2}
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export default function DailyReview() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [date, setDate] = useState(today);
  const { trades, dailyReviews, addDailyReview, updateDailyReview, getDailyReview } = useJournalStore();

  const dayTrades = useMemo(() => trades.filter(t => t.date === date), [trades, date]);
  const dayStats = useMemo(() => computeStats(dayTrades), [dayTrades]);

  const existing = getDailyReview(date);
  const [form, setForm] = useState({
    bestTrade: existing?.bestTrade ?? '',
    worstTrade: existing?.worstTrade ?? '',
    mainLesson: existing?.mainLesson ?? '',
    improveTomorrow: existing?.improveTomorrow ?? '',
    continueTomorrow: existing?.continueTomorrow ?? 'YES' as 'YES' | 'NO' | 'REDUCE SIZE',
    continueReason: existing?.continueReason ?? '',
    notes: existing?.notes ?? '',
  });

  const set = (k: keyof typeof form, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    const data = { ...form, date };
    if (existing) {
      updateDailyReview(existing.id, data);
    } else {
      addDailyReview(data);
    }
    alert('Daily review saved.');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Daily Review</h1>
          <p className="text-muted text-sm">End of session review and reflection.</p>
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-md bg-bg-elevated border border-bg-border text-text" />
      </div>

      {/* Auto stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Trades" value={dayStats.totalTrades} />
        <StatCard label="Wins" value={dayStats.wins} valueClass="text-win" />
        <StatCard label="Losses" value={dayStats.losses} valueClass="text-loss" />
        <StatCard label="P&L" value={formatCurrency(dayStats.totalPnlDollar)} valueClass={dayStats.totalPnlDollar >= 0 ? 'text-win' : 'text-loss'} />
      </div>

      {/* Trades today */}
      {dayTrades.length > 0 && (
        <Card>
          <CardHeader><p className="font-semibold text-sm">Trades Today ({date})</p></CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted border-b border-bg-border">
                    {['Pair', 'Dir', 'Setup', 'Outcome', 'P&L $', 'Score'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dayTrades.map(t => (
                    <tr key={t.id} className="border-b border-bg-border hover:bg-bg-elevated">
                      <td className="px-4 py-2.5 font-semibold">{t.pair}</td>
                      <td className={`px-4 py-2.5 font-mono font-bold ${t.direction === 'BUY' ? 'text-win' : 'text-loss'}`}>{t.direction}</td>
                      <td className="px-4 py-2.5 text-muted">{t.setupType}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${outcomeBg(t.outcome)}`}>{t.outcome}</span>
                      </td>
                      <td className={`px-4 py-2.5 font-mono ${t.profitLossDollar >= 0 ? 'text-win' : 'text-loss'}`}>{formatCurrency(t.profitLossDollar)}</td>
                      <td className="px-4 py-2.5 text-accent">{t.qualityScore?.total ?? 0}/10</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Review form */}
      <Card>
        <CardHeader><p className="font-semibold text-sm">Daily Reflection</p></CardHeader>
        <CardBody className="space-y-4">
          <Textarea label="Best trade of the day (pair + reason)" value={form.bestTrade} onChange={v => set('bestTrade', v)} placeholder="e.g. GBP/USD BUY — perfect liquidity sweep + FVG setup" />
          <Textarea label="Worst trade of the day (pair + reason)" value={form.worstTrade} onChange={v => set('worstTrade', v)} placeholder="e.g. EUR/USD SELL — entered against structure, no sweep" />
          <Textarea label="Main lesson of the day" value={form.mainLesson} onChange={v => set('mainLesson', v)} placeholder="e.g. Wait for the sweep first — every time I skip it, I lose" />
          <Textarea label="One thing to improve tomorrow" value={form.improveTomorrow} onChange={v => set('improveTomorrow', v)} placeholder="e.g. Be more patient during Asian session" />
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted uppercase tracking-wider">Should I continue trading tomorrow?</label>
            <div className="flex gap-2">
              {(['YES', 'NO', 'REDUCE SIZE'] as const).map(o => (
                <button key={o} onClick={() => set('continueTomorrow', o)}
                  className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${form.continueTomorrow === o ? 'bg-accent text-white' : 'bg-bg-elevated text-muted border border-bg-border'}`}>
                  {o}
                </button>
              ))}
            </div>
            {form.continueTomorrow !== 'YES' && (
              <textarea className="w-full px-3 py-2 text-sm resize-none mt-2" rows={2}
                placeholder="Reason..."
                value={form.continueReason} onChange={e => set('continueReason', e.target.value)} />
            )}
          </div>
          <Textarea label="Additional notes" value={form.notes} onChange={v => set('notes', v)} />
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>Save Daily Review</Button>
      </div>
    </div>
  );
}

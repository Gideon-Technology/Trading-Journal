'use client';

import { useMemo, useState } from 'react';
import { useJournalStore } from '@/lib/store';
import { formatCurrency, outcomeBg, scoreBg } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import type { SetupType, PlanAdherence } from '@forex-journal/shared';

const SETUPS: SetupType[] = ['Liquidity Sweep + FVG', 'Break & Retest', 'S/R Retest', 'Trendline Retest', 'FVG Only', 'Other'];

const EMOTIONS = ['Calm & Confident', 'Nervous', 'Excited', 'Fearful', 'Impatient', 'Overconfident', 'Anxious', 'None'];

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div onClick={() => onChange(!checked)}
        className={cn('w-9 h-5 rounded-full flex items-center px-0.5 transition-colors', checked ? 'bg-accent' : 'bg-bg-border')}>
        <div className={cn('w-4 h-4 rounded-full bg-white transition-transform', checked ? 'translate-x-4' : 'translate-x-0')} />
      </div>
      <span className="text-sm text-text">{label}</span>
    </label>
  );
}

export default function ImportReview() {
  const { trades, updateTrade } = useJournalStore();

  const queue = useMemo(() =>
    trades.filter(t => (t.tags ?? []).includes('imported') && t.reviewStatus !== 'REVIEWED'),
    [trades]
  );

  const [idx, setIdx] = useState(0);
  const [form, setForm] = useState({
    setupType: 'Other' as SetupType,
    followedPlan: 'YES' as PlanAdherence,
    liquiditySwept: false,
    fvgPresent: false,
    wentWell: '',
    improvement: '',
    mainEmotion: 'None',
    mistake: '',
    lesson: '',
  });

  const trade = queue[idx];
  const total = queue.length;
  const done = trades.filter(t => (t.tags ?? []).includes('imported') && t.reviewStatus === 'REVIEWED').length;

  const reset = () => setForm({
    setupType: 'Other',
    followedPlan: 'YES',
    liquiditySwept: false,
    fvgPresent: false,
    wentWell: '',
    improvement: '',
    mainEmotion: 'None',
    mistake: '',
    lesson: '',
  });

  const advance = () => {
    if (idx < queue.length - 1) { setIdx(i => i + 1); reset(); }
    else { setIdx(0); }
  };

  const saveAndNext = () => {
    if (!trade) return;
    updateTrade(trade.id, {
      setupType: form.setupType,
      followedPlan: form.followedPlan,
      wentWell: form.wentWell,
      improvement: form.improvement || form.lesson,
      mistakesMade: form.mistake,
      checklist: { ...(trade.checklist ?? {}), liquiditySwept: form.liquiditySwept, fvgPresent: form.fvgPresent } as typeof trade.checklist,
      psychology: { ...(trade.psychology ?? {}), mainEmotion: form.mainEmotion } as typeof trade.psychology,
      reviewStatus: 'REVIEWED',
    });
    advance();
  };

  const skip = () => advance();

  const flag = () => {
    if (!trade) return;
    updateTrade(trade.id, { reviewStatus: 'FLAGGED' });
    advance();
  };

  const markReviewed = () => {
    if (!trade) return;
    updateTrade(trade.id, { reviewStatus: 'REVIEWED' });
    advance();
  };

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <p className="text-4xl mb-3">✓</p>
        <h2 className="text-lg font-bold text-text mb-2">All imported trades reviewed</h2>
        <p className="text-muted text-sm">{done} trade{done !== 1 ? 's' : ''} completed.</p>
      </div>
    );
  }

  if (!trade) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-text">Import Review</h1>
          <p className="text-muted text-sm">{idx + 1} of {total} remaining</p>
        </div>
        {/* Progress bar */}
        <div className="mt-2 w-full bg-bg-border rounded-full h-1.5">
          <div className="bg-accent h-1.5 rounded-full transition-all" style={{ width: `${((idx) / total) * 100}%` }} />
        </div>
      </div>

      {/* Trade summary */}
      <div className="bg-bg-card border border-bg-border rounded-xl p-5">
        <div className="flex items-center gap-3 flex-wrap mb-2">
          <span className="font-bold text-lg text-text">{trade.pair}</span>
          <span className={trade.direction === 'LONG' || trade.direction === 'BUY' ? 'text-win font-mono font-bold' : 'text-loss font-mono font-bold'}>{trade.direction}</span>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${outcomeBg(trade.outcome)}`}>{trade.outcome}</span>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${scoreBg(trade.qualityScore?.total ?? 0)}`}>{trade.qualityScore?.total ?? 0}/10</span>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="text-center">
            <p className="text-muted text-xs">P&L</p>
            <p className={`font-mono font-bold ${trade.profitLossDollar >= 0 ? 'text-win' : 'text-loss'}`}>{formatCurrency(trade.profitLossDollar)}</p>
          </div>
          <div className="text-center">
            <p className="text-muted text-xs">Date</p>
            <p className="text-text text-sm font-mono">{trade.date}</p>
          </div>
          <div className="text-center">
            <p className="text-muted text-xs">Session</p>
            <p className="text-text text-sm">{trade.session}</p>
          </div>
        </div>
      </div>

      {/* Review form */}
      <Card>
        <CardHeader><p className="font-semibold text-sm">Quick Review — fill what you remember</p></CardHeader>
        <CardBody className="space-y-5">

          {/* Setup */}
          <div className="space-y-2">
            <label className="block text-xs text-muted font-medium uppercase tracking-wider">What setup was this?</label>
            <div className="flex flex-wrap gap-2">
              {SETUPS.map(s => (
                <button key={s} type="button" onClick={() => setForm(f => ({ ...f, setupType: s }))}
                  className={cn('px-3 py-1.5 rounded text-xs font-medium transition-colors',
                    form.setupType === s ? 'bg-accent text-white' : 'bg-bg-elevated text-muted border border-bg-border hover:border-accent/40')}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Key confirmations */}
          <div className="space-y-2">
            <label className="block text-xs text-muted font-medium uppercase tracking-wider">Key Confirmations</label>
            <Toggle label="Liquidity was swept before entry" checked={form.liquiditySwept} onChange={v => setForm(f => ({ ...f, liquiditySwept: v }))} />
            <Toggle label="Fair Value Gap (FVG) was present" checked={form.fvgPresent} onChange={v => setForm(f => ({ ...f, fvgPresent: v }))} />
          </div>

          {/* Followed plan */}
          <div className="space-y-2">
            <label className="block text-xs text-muted font-medium uppercase tracking-wider">Did you follow your rules?</label>
            <div className="flex gap-2">
              {(['YES', 'MOSTLY', 'NO'] as PlanAdherence[]).map(o => (
                <button key={o} type="button" onClick={() => setForm(f => ({ ...f, followedPlan: o }))}
                  className={cn('flex-1 py-2 rounded text-sm font-medium transition-colors',
                    form.followedPlan === o ? 'bg-accent text-white' : 'bg-bg-elevated text-muted border border-bg-border')}>
                  {o}
                </button>
              ))}
            </div>
          </div>

          {/* Emotion */}
          <div className="space-y-2">
            <label className="block text-xs text-muted font-medium uppercase tracking-wider">Main emotion</label>
            <select value={form.mainEmotion} onChange={e => setForm(f => ({ ...f, mainEmotion: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-bg-elevated border border-bg-border rounded-md text-text">
              {EMOTIONS.map(e => <option key={e}>{e}</option>)}
            </select>
          </div>

          {/* Mistake */}
          <div className="space-y-1">
            <label className="block text-xs text-muted font-medium uppercase tracking-wider">What mistake happened? (optional)</label>
            <input value={form.mistake} onChange={e => setForm(f => ({ ...f, mistake: e.target.value }))}
              placeholder="e.g. Entered too early, no candle close confirmation"
              className="w-full px-3 py-2 text-sm bg-bg-elevated border border-bg-border rounded-md text-text outline-none focus:border-accent" />
          </div>

          {/* Lesson */}
          <div className="space-y-1">
            <label className="block text-xs text-muted font-medium uppercase tracking-wider">Key lesson from this trade</label>
            <textarea value={form.lesson} onChange={e => setForm(f => ({ ...f, lesson: e.target.value }))}
              placeholder="e.g. Wait for the 15M close before entering — price reversed without confirmation"
              rows={2}
              className="w-full px-3 py-2 text-sm bg-bg-elevated border border-bg-border rounded-md text-text outline-none focus:border-accent resize-none" />
          </div>

        </CardBody>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={saveAndNext}>Save & Next →</Button>
        <Button variant="secondary" onClick={markReviewed}>Mark Reviewed (skip form)</Button>
        <Button variant="secondary" onClick={skip}>Skip for now</Button>
        <button onClick={flag} className="px-3 py-2 rounded text-xs text-loss border border-loss/30 hover:bg-loss/10 transition-colors">
          ⚑ Flag
        </button>
      </div>
    </div>
  );
}

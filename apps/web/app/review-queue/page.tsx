'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useJournalStore } from '@/lib/store';
import { formatCurrency, outcomeBg, scoreBg } from '@/lib/utils';
import type { Trade } from '@forex-journal/shared';

type Priority = 'CRITICAL' | 'IMPORTANT' | 'NORMAL';

interface FlaggedTrade {
  trade: Trade;
  reasons: string[];
  priority: Priority;
}

function classifyTrade(trade: Trade): FlaggedTrade | null {
  const reasons: string[] = [];
  let priority: Priority = 'NORMAL';

  // Critical
  if (trade.outsidePlan && (trade.outsidePlanReasons?.length ?? 0) > 0) {
    reasons.push(...(trade.outsidePlanReasons ?? []).map(r => `⚠ Plan violation: ${r}`));
    priority = 'CRITICAL';
  }
  if (trade.psychology?.revengeTrade) { reasons.push('Revenge trade'); priority = 'CRITICAL'; }
  if (trade.followedPlan === 'NO') { reasons.push('Did not follow the plan'); priority = 'CRITICAL'; }

  // Important
  if (trade.psychology?.fomo) {
    reasons.push('FOMO detected');
    if (priority !== 'CRITICAL') priority = 'IMPORTANT';
  }
  if ((trade.qualityScore?.total ?? 0) < 5) {
    reasons.push(`Low quality score (${trade.qualityScore?.total ?? 0}/10)`);
    if (priority !== 'CRITICAL') priority = 'IMPORTANT';
  }
  if (trade.mistakes && Object.values(trade.mistakes).filter(Boolean).length >= 3) {
    reasons.push(`${Object.values(trade.mistakes).filter(Boolean).length} mistakes recorded`);
    if (priority !== 'CRITICAL') priority = 'IMPORTANT';
  }
  if (trade.reviewStatus === 'FLAGGED') {
    reasons.push('Manually flagged');
    if (priority !== 'CRITICAL') priority = 'IMPORTANT';
  }

  // Normal
  if (!trade.wentWell) reasons.push('Missing "went well" note');
  if (!trade.improvement) reasons.push('Missing improvement note');

  // Imported trades needing context
  if (trade.tags?.includes('imported') && !trade.entryReason) {
    reasons.push('Imported trade — needs entry reason');
  }

  if (reasons.length === 0) return null;
  return { trade, reasons, priority };
}

function priorityBg(p: Priority) {
  if (p === 'CRITICAL') return 'border-loss/50 bg-loss/5';
  if (p === 'IMPORTANT') return 'border-breakeven/40 bg-breakeven/5';
  return 'border-bg-border bg-bg-card';
}

function priorityBadge(p: Priority) {
  if (p === 'CRITICAL') return 'bg-loss/10 text-loss border border-loss/30';
  if (p === 'IMPORTANT') return 'bg-breakeven/10 text-breakeven border border-breakeven/30';
  return 'bg-bg-elevated text-muted border border-bg-border';
}

const PRIORITY_ORDER: Priority[] = ['CRITICAL', 'IMPORTANT', 'NORMAL'];
const PRIORITY_LABELS: Record<Priority, string> = {
  CRITICAL: '🔴 Critical',
  IMPORTANT: '🟡 Important',
  NORMAL: '🔵 Normal',
};

export default function ReviewQueue() {
  const { trades, updateTrade } = useJournalStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeGroup, setActiveGroup] = useState<Priority | 'ALL'>('ALL');

  const items = useMemo(() => {
    return trades
      .filter(t => t.reviewStatus !== 'REVIEWED')
      .map(classifyTrade)
      .filter((x): x is FlaggedTrade => x !== null)
      .sort((a, b) => {
        const po = PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
        if (po !== 0) return po;
        return new Date(b.trade.date).getTime() - new Date(a.trade.date).getTime();
      });
  }, [trades]);

  const groups = useMemo(() => {
    const g: Record<Priority, FlaggedTrade[]> = { CRITICAL: [], IMPORTANT: [], NORMAL: [] };
    for (const item of items) g[item.priority].push(item);
    return g;
  }, [items]);

  const visible = activeGroup === 'ALL' ? items : items.filter(i => i.priority === activeGroup);

  const reviewed = useMemo(() => trades.filter(t => t.reviewStatus === 'REVIEWED').length, [trades]);

  const markReviewed = (id: string) => { updateTrade(id, { reviewStatus: 'REVIEWED' }); setSelected(s => { s.delete(id); return new Set(s); }); };
  const markFlagged = (id: string) => updateTrade(id, { reviewStatus: 'FLAGGED' });

  const toggleSelect = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => setSelected(new Set(visible.map(i => i.trade.id)));
  const clearSelect = () => setSelected(new Set());

  const bulkReview = () => { selected.forEach(id => updateTrade(id, { reviewStatus: 'REVIEWED' })); clearSelect(); };
  const bulkFlag = () => { selected.forEach(id => updateTrade(id, { reviewStatus: 'FLAGGED' })); clearSelect(); };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Review Queue</h1>
          <p className="text-muted text-sm">
            {items.length} trade{items.length !== 1 ? 's' : ''} need attention · {reviewed} reviewed
          </p>
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-muted text-xs">{selected.size} selected</span>
            <button onClick={bulkReview} className="px-3 py-1.5 rounded text-xs bg-win/10 text-win border border-win/30 hover:bg-win/20 transition-colors">
              ✓ Mark all reviewed
            </button>
            <button onClick={bulkFlag} className="px-3 py-1.5 rounded text-xs bg-loss/10 text-loss border border-loss/30 hover:bg-loss/20 transition-colors">
              ⚑ Flag all
            </button>
            <button onClick={clearSelect} className="px-3 py-1.5 rounded text-xs bg-bg-elevated text-muted border border-bg-border hover:text-text transition-colors">
              Clear
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <p className="text-4xl mb-3">✓</p>
          <h2 className="text-lg font-bold text-text mb-2">All caught up!</h2>
          <p className="text-muted text-sm max-w-sm">Every trade has been reviewed. Keep logging and reviewing to improve your performance.</p>
        </div>
      ) : (
        <>
          {/* Group filter tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setActiveGroup('ALL')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${activeGroup === 'ALL' ? 'bg-accent text-white' : 'bg-bg-elevated text-muted border border-bg-border hover:text-text'}`}>
              All ({items.length})
            </button>
            {PRIORITY_ORDER.filter(p => groups[p].length > 0).map(p => (
              <button key={p} onClick={() => setActiveGroup(p)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${activeGroup === p ? 'bg-accent text-white' : 'bg-bg-elevated text-muted border border-bg-border hover:text-text'}`}>
                {PRIORITY_LABELS[p]} ({groups[p].length})
              </button>
            ))}
            <div className="flex-1" />
            <button onClick={selectAll} className="px-3 py-1.5 rounded text-xs bg-bg-elevated text-muted border border-bg-border hover:text-text transition-colors">
              Select all
            </button>
          </div>

          <div className="space-y-3">
            {visible.map(({ trade, reasons, priority }) => (
              <div key={trade.id} className={`border rounded-lg p-4 transition-all ${priorityBg(priority)} ${selected.has(trade.id) ? 'ring-2 ring-accent' : ''}`}>
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelect(trade.id)}
                    className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${selected.has(trade.id) ? 'bg-accent border-accent' : 'border-bg-border bg-bg-elevated'}`}
                  >
                    {selected.has(trade.id) && <span className="text-white text-[10px]">✓</span>}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${priorityBadge(priority)}`}>{priority}</span>
                      <span className="font-bold text-text">{trade.pair}</span>
                      <span className={`text-xs font-mono font-bold ${trade.direction === 'BUY' || trade.direction === 'LONG' ? 'text-win' : 'text-loss'}`}>{trade.direction}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${outcomeBg(trade.outcome)}`}>{trade.outcome}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${scoreBg(trade.qualityScore?.total ?? 0)}`}>{trade.qualityScore?.total ?? 0}/10</span>
                      <span className={`font-mono text-xs font-semibold ${trade.profitLossDollar >= 0 ? 'text-win' : 'text-loss'}`}>{formatCurrency(trade.profitLossDollar)}</span>
                    </div>
                    <p className="text-muted text-xs mb-2">{trade.date} · {trade.session} · {trade.setupType}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {reasons.map((r, i) => (
                        <span key={i} className="px-2 py-0.5 rounded text-xs bg-bg-elevated border border-bg-border text-muted">{r}</span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Link href={`/trades/${trade.id}`}>
                      <button className="w-full px-3 py-1.5 rounded text-xs bg-bg-elevated border border-bg-border text-muted hover:text-text hover:border-accent/40 transition-colors">
                        View →
                      </button>
                    </Link>
                    <button onClick={() => markReviewed(trade.id)}
                      className="px-3 py-1.5 rounded text-xs bg-win/10 text-win border border-win/30 hover:bg-win/20 transition-colors">
                      ✓ Reviewed
                    </button>
                    {trade.reviewStatus !== 'FLAGGED' && (
                      <button onClick={() => markFlagged(trade.id)}
                        className="px-3 py-1.5 rounded text-xs bg-loss/10 text-loss border border-loss/30 hover:bg-loss/20 transition-colors">
                        ⚑ Flag
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

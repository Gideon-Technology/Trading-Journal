'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useJournalStore } from '@/lib/store';
import { formatCurrency, outcomeBg, scoreBg } from '@/lib/utils';
import type { Trade } from '@forex-journal/shared';

function flagReasons(trade: Trade): string[] {
  const reasons: string[] = [];
  if (!trade.wentWell) reasons.push('Missing "went well" note');
  if (!trade.improvement) reasons.push('Missing improvement note');
  if ((trade.qualityScore?.total ?? 0) < 5) reasons.push('Quality score below 5');
  if (trade.followedPlan === 'NO') reasons.push('Did not follow the plan');
  if (trade.psychology?.revengeTrade) reasons.push('Revenge trade detected');
  if (trade.psychology?.fomo) reasons.push('FOMO detected');
  if (trade.mistakes && Object.values(trade.mistakes).filter(Boolean).length >= 3) {
    reasons.push(`${Object.values(trade.mistakes).filter(Boolean).length} mistakes recorded`);
  }
  if (trade.reviewStatus === 'FLAGGED') reasons.push('Manually flagged');
  return reasons;
}

export default function ReviewQueue() {
  const { trades, updateTrade } = useJournalStore();

  const queue = useMemo(() => {
    return trades
      .filter(t => {
        if (t.reviewStatus === 'REVIEWED') return false;
        return flagReasons(t).length > 0;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [trades]);

  const reviewed = useMemo(() =>
    trades.filter(t => t.reviewStatus === 'REVIEWED').length, [trades]);

  const markReviewed = (id: string) => updateTrade(id, { reviewStatus: 'REVIEWED' });
  const markFlagged = (id: string) => updateTrade(id, { reviewStatus: 'FLAGGED' });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Review Queue</h1>
          <p className="text-muted text-sm">
            {queue.length} trade{queue.length !== 1 ? 's' : ''} need attention · {reviewed} reviewed
          </p>
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <p className="text-4xl mb-3">✓</p>
          <h2 className="text-lg font-bold text-text mb-2">All caught up!</h2>
          <p className="text-muted text-sm max-w-sm">
            Every trade has been reviewed. Keep logging and reviewing to improve your performance.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map(trade => {
            const reasons = flagReasons(trade);
            return (
              <div key={trade.id} className="bg-bg-card border border-bg-border rounded-lg p-5">
                <div className="flex items-start justify-between gap-4">
                  {/* Trade summary */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-text">{trade.pair}</span>
                      <span className={trade.direction === 'BUY' || trade.direction === 'LONG' ? 'text-win text-xs font-mono font-bold' : 'text-loss text-xs font-mono font-bold'}>
                        {trade.direction}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${outcomeBg(trade.outcome)}`}>
                        {trade.outcome}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${scoreBg(trade.qualityScore?.total ?? 0)}`}>
                        {trade.qualityScore?.total ?? 0}/10
                      </span>
                      <span className={`font-mono text-xs font-semibold ${trade.profitLossDollar >= 0 ? 'text-win' : 'text-loss'}`}>
                        {formatCurrency(trade.profitLossDollar)}
                      </span>
                    </div>
                    <p className="text-muted text-xs mb-3">{trade.date} · {trade.session} · {trade.setupType}</p>

                    {/* Flag reasons */}
                    <div className="flex flex-wrap gap-1.5">
                      {reasons.map(r => (
                        <span key={r} className="px-2 py-0.5 rounded text-xs bg-loss/10 text-loss border border-loss/20">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <Link href={`/trades/${trade.id}`}>
                      <button className="w-full px-3 py-1.5 rounded text-xs bg-bg-elevated border border-bg-border text-muted hover:text-text hover:border-accent/40 transition-colors">
                        View
                      </button>
                    </Link>
                    <button
                      onClick={() => markReviewed(trade.id)}
                      className="px-3 py-1.5 rounded text-xs bg-win/10 text-win border border-win/30 hover:bg-win/20 transition-colors"
                    >
                      ✓ Mark Reviewed
                    </button>
                    {trade.reviewStatus !== 'FLAGGED' && (
                      <button
                        onClick={() => markFlagged(trade.id)}
                        className="px-3 py-1.5 rounded text-xs bg-loss/10 text-loss border border-loss/30 hover:bg-loss/20 transition-colors"
                      >
                        ⚑ Flag
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

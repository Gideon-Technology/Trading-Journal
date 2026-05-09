'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useJournalStore } from '../../lib/store';

export default function PaperTradingPage() {
  const { trades, signals } = useJournalStore();

  const paperTrades = useMemo(
    () => trades.filter(t => t.paperMode).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [trades]
  );

  const stats = useMemo(() => {
    const closed = paperTrades.filter(t => t.outcome !== undefined);
    const wins = closed.filter(t => t.outcome === 'WIN').length;
    const totalPnl = paperTrades.reduce((s, t) => s + (t.profitLossDollar ?? 0), 0);
    const avgRR = closed.length > 0
      ? closed.reduce((s, t) => s + (t.rrAchieved ?? 0), 0) / closed.length
      : 0;
    return { total: paperTrades.length, wins, losses: closed.length - wins, winRate: closed.length > 0 ? Math.round((wins / closed.length) * 100) : 0, totalPnl, avgRR };
  }, [paperTrades]);

  const paperSignals = useMemo(() => signals.filter(s => s.paperMode), [signals]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Paper Trading</h1>
          <p className="text-zinc-400 text-sm">Simulated trades — no real capital at risk</p>
        </div>
        <Link
          href="/signals"
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm font-medium"
        >
          Convert Signal → Paper Trade
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total },
          { label: 'Win Rate', value: `${stats.winRate}%`, color: stats.winRate >= 55 ? 'text-green-400' : 'text-red-400' },
          { label: 'Wins', value: stats.wins, color: 'text-green-400' },
          { label: 'Losses', value: stats.losses, color: 'text-red-400' },
          { label: 'Paper P&L', value: `$${stats.totalPnl.toFixed(0)}`, color: stats.totalPnl >= 0 ? 'text-green-400' : 'text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <p className="text-zinc-500 text-xs mb-1">{label}</p>
            <p className={`text-xl font-bold ${color ?? 'text-white'}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Paper Trades Table */}
      {paperTrades.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <p className="text-lg mb-2">No paper trades yet</p>
          <p className="text-sm">Go to Signals and click "Convert to Paper Trade" on any signal.</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 text-xs uppercase">
                <th className="text-left px-4 py-3">Symbol</th>
                <th className="text-left px-4 py-3">Direction</th>
                <th className="text-left px-4 py-3">Setup</th>
                <th className="text-right px-4 py-3">Entry</th>
                <th className="text-right px-4 py-3">SL</th>
                <th className="text-right px-4 py-3">TP1</th>
                <th className="text-right px-4 py-3">P&L</th>
                <th className="text-left px-4 py-3">Outcome</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {paperTrades.map(t => (
                <tr key={t.id} className="hover:bg-zinc-800/40">
                  <td className="px-4 py-3 font-mono font-bold text-white">{t.pair}</td>
                  <td className="px-4 py-3">
                    <span className={t.direction === 'BUY' || t.direction === 'LONG' ? 'text-green-400' : 'text-red-400'}>
                      {t.direction}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 max-w-[150px] truncate">{t.setupType}</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-300">{t.entryPrice}</td>
                  <td className="px-4 py-3 text-right font-mono text-red-400">{t.stopLoss}</td>
                  <td className="px-4 py-3 text-right font-mono text-green-400">{t.tp1 || '—'}</td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold ${(t.profitLossDollar ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${(t.profitLossDollar ?? 0).toFixed(0)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      t.outcome === 'WIN' ? 'bg-green-500/20 text-green-300'
                      : t.outcome === 'LOSS' ? 'bg-red-500/20 text-red-300'
                      : 'bg-zinc-600/20 text-zinc-400'
                    }`}>
                      {t.outcome ?? 'OPEN'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/trades/${t.id}`} className="text-xs text-blue-400 hover:text-blue-300">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {paperSignals.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Paper Signal Tracking</h2>
          <div className="grid grid-cols-3 gap-3">
            {paperSignals.map(s => (
              <div key={s.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex justify-between mb-2">
                  <span className="font-mono font-bold text-white">{s.symbol}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${s.paperOutcome === 'WIN' ? 'bg-green-500/20 text-green-300' : s.paperOutcome === 'LOSS' ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                    {s.paperOutcome ?? 'OPEN'}
                  </span>
                </div>
                <p className="text-zinc-400 text-xs">{s.direction} | Score: {s.finalScore?.toFixed(1) ?? '—'}</p>
                {s.paperProfitLossDollar !== undefined && (
                  <p className={`text-sm font-semibold mt-1 ${s.paperProfitLossDollar >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${s.paperProfitLossDollar.toFixed(0)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

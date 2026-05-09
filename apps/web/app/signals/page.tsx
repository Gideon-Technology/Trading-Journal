'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useJournalStore } from '../../lib/store';
import type { Signal, SignalStatus } from '@forex-journal/shared';
import { calculateSignalScore } from '@forex-journal/shared';

const STATUS_COLORS: Record<SignalStatus, string> = {
  NEW: 'bg-blue-500/20 text-blue-300',
  WATCHING: 'bg-yellow-500/20 text-yellow-300',
  TAKEN: 'bg-purple-500/20 text-purple-300',
  SKIPPED: 'bg-zinc-500/20 text-zinc-400',
  EXPIRED: 'bg-zinc-600/20 text-zinc-500',
  WON: 'bg-green-500/20 text-green-300',
  LOST: 'bg-red-500/20 text-red-300',
  BREAKEVEN: 'bg-orange-500/20 text-orange-300',
};

export default function SignalsPage() {
  const { signals, deleteSignal } = useJournalStore();
  const [filter, setFilter] = useState<'ALL' | SignalStatus>('ALL');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = [...signals];
    if (filter !== 'ALL') list = list.filter(s => s.status === filter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s => s.symbol.toLowerCase().includes(q) || s.setupReason.toLowerCase().includes(q));
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [signals, filter, search]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: signals.length };
    for (const s of signals) {
      counts[s.status] = (counts[s.status] ?? 0) + 1;
    }
    return counts;
  }, [signals]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Signals</h1>
          <p className="text-zinc-400 text-sm">{signals.length} total signals tracked</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/import/tradingview"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            + Import TradingView Alert
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['ALL', 'NEW', 'WATCHING', 'TAKEN', 'SKIPPED', 'WON', 'LOST'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === s ? 'bg-zinc-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {s} {statusCounts[s] !== undefined ? `(${statusCounts[s]})` : ''}
          </button>
        ))}
        <input
          type="text"
          placeholder="Search symbol or setup…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="ml-auto px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <p className="text-lg mb-2">No signals found</p>
          <p className="text-sm">Import a TradingView alert or add signals manually.</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 text-xs uppercase">
                <th className="text-left px-4 py-3">Symbol</th>
                <th className="text-left px-4 py-3">Direction</th>
                <th className="text-left px-4 py-3">Setup</th>
                <th className="text-left px-4 py-3">TF</th>
                <th className="text-right px-4 py-3">Entry</th>
                <th className="text-right px-4 py-3">SL</th>
                <th className="text-right px-4 py-3">Score</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Source</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filtered.map(signal => (
                <SignalRow key={signal.id} signal={signal} onDelete={() => deleteSignal(signal.id)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SignalRow({ signal, onDelete }: { signal: Signal; onDelete: () => void }) {
  const score = calculateSignalScore(signal);
  const scoreColor = score.total >= 7 ? 'text-green-400' : score.total >= 5 ? 'text-yellow-400' : 'text-red-400';

  return (
    <tr className="hover:bg-zinc-800/40 transition-colors">
      <td className="px-4 py-3 font-mono font-bold text-white">{signal.symbol}</td>
      <td className="px-4 py-3">
        <span className={`font-medium ${signal.direction === 'BUY' || signal.direction === 'LONG' ? 'text-green-400' : 'text-red-400'}`}>
          {signal.direction}
        </span>
      </td>
      <td className="px-4 py-3 text-zinc-300 max-w-[180px] truncate">{signal.setupReason}</td>
      <td className="px-4 py-3 text-zinc-400">{signal.timeframe}</td>
      <td className="px-4 py-3 text-right font-mono text-zinc-300">{signal.entryPrice ?? '—'}</td>
      <td className="px-4 py-3 text-right font-mono text-zinc-400">{signal.stopLoss ?? '—'}</td>
      <td className={`px-4 py-3 text-right font-bold ${scoreColor}`}>
        {signal.finalScore?.toFixed(1) ?? score.total.toFixed(1)}
      </td>
      <td className="px-4 py-3">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[signal.status]}`}>
          {signal.status}
        </span>
      </td>
      <td className="px-4 py-3 text-zinc-500 text-xs">{signal.source?.replace('_', ' ') ?? 'MANUAL'}</td>
      <td className="px-4 py-3">
        <div className="flex gap-2 justify-end">
          <Link href={`/signals/${signal.id}`} className="text-xs text-blue-400 hover:text-blue-300">
            View
          </Link>
          <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-300">
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

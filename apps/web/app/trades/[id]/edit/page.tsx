'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useJournalStore } from '@/lib/store';
import type { Trade } from '@forex-journal/shared';

type Editable = Pick<Trade,
  'outcome' | 'profitLossDollar' | 'profitLossPoints' | 'rrAchieved' |
  'entryPrice' | 'stopLoss' | 'tp1' | 'tp2' | 'tp3' |
  'notes' | 'followedPlan' | 'mistakesMade' | 'wentWell' | 'improvement' |
  'reviewStatus' | 'tags' | 'paperMode'
>;

export default function TradeEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { getTrade, updateTrade, tags: allTags } = useJournalStore();
  const trade = getTrade(params.id);

  const [form, setForm] = useState<Partial<Editable>>(
    trade
      ? {
          outcome: trade.outcome,
          profitLossDollar: trade.profitLossDollar,
          profitLossPoints: trade.profitLossPoints,
          rrAchieved: trade.rrAchieved,
          entryPrice: trade.entryPrice,
          stopLoss: trade.stopLoss,
          tp1: trade.tp1,
          tp2: trade.tp2,
          tp3: trade.tp3,
          notes: (trade as any).notes ?? '',
          followedPlan: trade.followedPlan,
          mistakesMade: trade.mistakesMade,
          wentWell: trade.wentWell,
          improvement: trade.improvement,
          reviewStatus: trade.reviewStatus,
          tags: trade.tags ?? [],
          paperMode: trade.paperMode,
        }
      : {}
  );
  const [saved, setSaved] = useState(false);

  if (!trade) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-zinc-400">Trade not found.</p>
        <Link href="/trades" className="text-blue-400 text-sm mt-2 block">← Back to trades</Link>
      </div>
    );
  }

  function handleSave() {
    updateTrade(params.id, form as Partial<Trade>);
    setSaved(true);
    setTimeout(() => router.push(`/trades/${params.id}`), 1000);
  }

  function set<K extends keyof Editable>(key: K, val: Editable[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/trades/${params.id}`} className="text-zinc-500 hover:text-zinc-300 text-sm">← Trade</Link>
        <span className="text-zinc-700">/</span>
        <span className="text-zinc-300">Edit</span>
      </div>

      <h1 className="text-2xl font-bold text-white mb-1">Edit Trade</h1>
      <p className="text-zinc-400 text-sm mb-6 font-mono">{trade.pair} {trade.direction} — {trade.date}</p>

      <div className="space-y-6">
        {/* Result */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">Trade Result</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Outcome</label>
              <select
                value={form.outcome ?? ''}
                onChange={e => set('outcome', e.target.value as Trade['outcome'])}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
              >
                <option value="WIN">WIN</option>
                <option value="LOSS">LOSS</option>
                <option value="BREAKEVEN">BREAKEVEN</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">P&L ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.profitLossDollar ?? ''}
                onChange={e => set('profitLossDollar', parseFloat(e.target.value) || 0)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">P&L (points)</label>
              <input
                type="number"
                step="0.25"
                value={form.profitLossPoints ?? ''}
                onChange={e => set('profitLossPoints', parseFloat(e.target.value) || 0)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">R:R Achieved</label>
              <input
                type="number"
                step="0.1"
                value={form.rrAchieved ?? ''}
                onChange={e => set('rrAchieved', parseFloat(e.target.value) || 0)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>
        </section>

        {/* Price levels */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">Price Levels</h2>
          <div className="grid grid-cols-3 gap-3">
            {([
              ['Entry', 'entryPrice'],
              ['Stop Loss', 'stopLoss'],
              ['TP1', 'tp1'],
              ['TP2', 'tp2'],
              ['TP3', 'tp3'],
            ] as const).map(([label, key]) => (
              <div key={key}>
                <label className="text-xs text-zinc-400 block mb-1">{label}</label>
                <input
                  type="number"
                  step="0.25"
                  value={form[key] ?? ''}
                  onChange={e => set(key as any, parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Review */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">Post-Trade Review</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Followed Plan</label>
              <select
                value={form.followedPlan ?? 'YES'}
                onChange={e => set('followedPlan', e.target.value as Trade['followedPlan'])}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
              >
                <option value="YES">YES</option>
                <option value="MOSTLY">MOSTLY</option>
                <option value="NO">NO</option>
              </select>
            </div>
            {[
              { key: 'wentWell', label: 'What went well?' },
              { key: 'mistakesMade', label: 'Mistakes made?' },
              { key: 'improvement', label: 'Improvement for next time?' },
              { key: 'notes', label: 'Notes' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs text-zinc-400 block mb-1">{label}</label>
                <textarea
                  rows={2}
                  value={(form as any)[key] ?? ''}
                  onChange={e => set(key as any, e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500 resize-none"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Status */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">Status</h2>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs text-zinc-400 block mb-1">Review Status</label>
              <select
                value={form.reviewStatus ?? 'PENDING'}
                onChange={e => set('reviewStatus', e.target.value as Trade['reviewStatus'])}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
              >
                <option value="PENDING">PENDING</option>
                <option value="REVIEWED">REVIEWED</option>
                <option value="FLAGGED">FLAGGED</option>
              </select>
            </div>
            <div className="flex items-center gap-2 mt-5">
              <input
                type="checkbox"
                id="paperMode"
                checked={form.paperMode ?? false}
                onChange={e => set('paperMode', e.target.checked)}
                className="accent-blue-500"
              />
              <label htmlFor="paperMode" className="text-sm text-zinc-300 cursor-pointer">Paper Trade</label>
            </div>
          </div>
        </section>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium"
          >
            {saved ? '✓ Saved — redirecting…' : 'Save Changes'}
          </button>
          <Link
            href={`/trades/${params.id}`}
            className="px-6 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-xl font-medium"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}

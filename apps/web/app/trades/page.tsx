'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useJournalStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { formatCurrency, outcomeBg, scoreBg } from '@/lib/utils';

const PAIRS = ['All', 'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'NZD/USD', 'USD/CAD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'XAU/USD', 'Other'];
const OUTCOMES = ['All', 'WIN', 'LOSS', 'BREAKEVEN'];
const SESSIONS = ['All', 'Asian', 'London', 'New York', 'London-NY Overlap'];
const DIRECTIONS = ['All', 'BUY', 'SELL'];

export default function TradeHistory() {
  const { trades, deleteTrade } = useJournalStore();
  const [pair, setPair] = useState('All');
  const [outcome, setOutcome] = useState('All');
  const [session, setSession] = useState('All');
  const [direction, setDirection] = useState('All');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'pnl' | 'score'>('date');

  const filtered = useMemo(() => {
    return trades
      .filter(t =>
        (pair === 'All' || t.pair === pair) &&
        (outcome === 'All' || t.outcome === outcome) &&
        (session === 'All' || t.session === session) &&
        (direction === 'All' || t.direction === direction) &&
        (!search || t.pair.toLowerCase().includes(search.toLowerCase()) || t.setupType.toLowerCase().includes(search.toLowerCase()))
      )
      .sort((a, b) => {
        if (sortBy === 'date') return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (sortBy === 'pnl') return (b.profitLossDollar ?? 0) - (a.profitLossDollar ?? 0);
        return (b.qualityScore?.total ?? 0) - (a.qualityScore?.total ?? 0);
      });
  }, [trades, pair, outcome, session, direction, search, sortBy]);

  const summary = useMemo(() => ({
    wins: filtered.filter(t => t.outcome === 'WIN').length,
    losses: filtered.filter(t => t.outcome === 'LOSS').length,
    pnl: filtered.reduce((s, t) => s + (t.profitLossDollar ?? 0), 0),
  }), [filtered]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Trade History</h1>
          <p className="text-muted text-sm">{filtered.length} trades · Win: {summary.wins} · Loss: {summary.losses} · P&L: <span className={summary.pnl >= 0 ? 'text-win' : 'text-loss'}>{formatCurrency(summary.pnl)}</span></p>
        </div>
        <Link href="/trades/new"><Button>+ New Trade</Button></Link>
      </div>

      {/* Filters */}
      <div className="bg-bg-card border border-bg-border rounded-lg p-4 flex flex-wrap gap-3">
        <input
          className="px-3 py-1.5 text-sm rounded-md bg-bg-elevated border border-bg-border text-text placeholder-muted w-40"
          placeholder="Search pair / setup..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {[
          { label: 'Pair', value: pair, onChange: setPair, options: PAIRS },
          { label: 'Outcome', value: outcome, onChange: setOutcome, options: OUTCOMES },
          { label: 'Session', value: session, onChange: setSession, options: SESSIONS },
          { label: 'Direction', value: direction, onChange: setDirection, options: DIRECTIONS },
        ].map(f => (
          <select key={f.label}
            className="px-3 py-1.5 text-sm rounded-md bg-bg-elevated border border-bg-border text-text"
            value={f.value} onChange={e => f.onChange(e.target.value)}>
            {f.options.map(o => <option key={o}>{o}</option>)}
          </select>
        ))}
        <select
          className="px-3 py-1.5 text-sm rounded-md bg-bg-elevated border border-bg-border text-text"
          value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}>
          <option value="date">Sort: Date</option>
          <option value="pnl">Sort: P&L</option>
          <option value="score">Sort: Quality</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-bg-card border border-bg-border rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted">No trades match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted text-xs border-b border-bg-border bg-bg-elevated">
                  {['Date', 'Pair', 'Dir', 'Setup', 'Session', 'Entry', 'SL', 'TP3', 'Lot', 'Outcome', 'P&L $', 'Pips', 'RR', 'Score', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} className="border-b border-bg-border hover:bg-bg-elevated transition-colors">
                    <td className="px-4 py-3 text-muted text-xs font-mono whitespace-nowrap">{t.date}</td>
                    <td className="px-4 py-3 font-semibold whitespace-nowrap">{t.pair}</td>
                    <td className="px-4 py-3">
                      <span className={t.direction === 'BUY' ? 'text-win text-xs font-mono font-bold' : 'text-loss text-xs font-mono font-bold'}>{t.direction}</span>
                    </td>
                    <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">{t.setupType}</td>
                    <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">{t.session}</td>
                    <td className="px-4 py-3 font-mono text-xs">{t.entryPrice}</td>
                    <td className="px-4 py-3 font-mono text-xs text-loss">{t.stopLoss}</td>
                    <td className="px-4 py-3 font-mono text-xs text-win">{t.tp3}</td>
                    <td className="px-4 py-3 font-mono text-xs">{t.lotSize}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${outcomeBg(t.outcome)}`}>{t.outcome}</span>
                    </td>
                    <td className={`px-4 py-3 font-mono text-xs font-semibold ${t.profitLossDollar >= 0 ? 'text-win' : 'text-loss'}`}>
                      {formatCurrency(t.profitLossDollar)}
                    </td>
                    <td className={`px-4 py-3 font-mono text-xs ${t.profitLossPips >= 0 ? 'text-win' : 'text-loss'}`}>
                      {t.profitLossPips > 0 ? '+' : ''}{t.profitLossPips}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{t.rrAchieved?.toFixed(1)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${scoreBg(t.qualityScore?.total ?? 0)}`}>
                        {t.qualityScore?.total ?? 0}/10
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-1">
                        <Link href={`/trades/${t.id}`}>
                          <button className="px-2 py-1 rounded bg-bg-elevated hover:bg-bg-border text-muted hover:text-text text-xs transition-colors">View</button>
                        </Link>
                        <button onClick={() => { if (confirm('Delete this trade?')) deleteTrade(t.id); }}
                          className="px-2 py-1 rounded bg-loss/10 hover:bg-loss/20 text-loss text-xs transition-colors">
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, CartesianGrid,
} from 'recharts';
import { useJournalStore } from '@/lib/store';
import { computeStats } from '@forex-journal/shared';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency, outcomeBg, scoreBg } from '@/lib/utils';
import { format } from 'date-fns';

export default function Dashboard() {
  const trades = useJournalStore(s => s.trades);
  const stats = useMemo(() => computeStats(trades), [trades]);

  const equityCurve = useMemo(() => {
    let cumulative = 0;
    return [...trades].reverse().map(t => {
      cumulative += t.profitLossDollar ?? 0;
      return { date: format(new Date(t.date), 'MMM d'), pnl: parseFloat(cumulative.toFixed(2)) };
    });
  }, [trades]);

  const sessionData = useMemo(() => {
    const sessions = ['Asian', 'London', 'New York', 'London-NY Overlap'];
    return sessions.map(s => {
      const ts = trades.filter(t => t.session === s);
      return {
        name: s.replace('London-NY Overlap', 'LDN-NY'),
        trades: ts.length,
        wins: ts.filter(t => t.outcome === 'WIN').length,
      };
    }).filter(s => s.trades > 0);
  }, [trades]);

  const pairData = useMemo(() => {
    const pairs: Record<string, { pnl: number; trades: number }> = {};
    for (const t of trades) {
      if (!pairs[t.pair]) pairs[t.pair] = { pnl: 0, trades: 0 };
      pairs[t.pair].pnl += t.profitLossDollar ?? 0;
      pairs[t.pair].trades += 1;
    }
    return Object.entries(pairs)
      .map(([pair, d]) => ({ pair, pnl: parseFloat(d.pnl.toFixed(2)), trades: d.trades }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 6);
  }, [trades]);

  const pieData = [
    { name: 'Wins', value: stats.wins, color: '#3FB950' },
    { name: 'Losses', value: stats.losses, color: '#F85149' },
    { name: 'B/E', value: stats.breakevens, color: '#D29922' },
  ].filter(d => d.value > 0);

  const recent = trades.slice(0, 8);

  if (!trades.length) return <EmptyState />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Dashboard</h1>
          <p className="text-muted text-sm">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <Link href="/trades/new">
          <Button>+ New Trade</Button>
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard label="Total Trades" value={stats.totalTrades} />
        <StatCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} valueClass={stats.winRate >= 50 ? 'text-win' : 'text-loss'} />
        <StatCard label="Total P&L" value={formatCurrency(stats.totalPnlDollar)} valueClass={stats.totalPnlDollar >= 0 ? 'text-win' : 'text-loss'} />
        <StatCard label="Avg R:R" value={stats.avgRR.toFixed(2)} sub="achieved" />
        <StatCard label="Avg Quality" value={`${stats.avgQualityScore.toFixed(1)}/10`} valueClass="text-accent" />
        <StatCard label="Best Pair" value={stats.bestPair || '—'} valueClass="text-accent" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Equity curve */}
        <div className="lg:col-span-2 bg-bg-card border border-bg-border rounded-lg p-4">
          <p className="text-text font-semibold text-sm mb-4">Equity Curve</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={equityCurve}>
              <defs>
                <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#58A6FF" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#58A6FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="#484F58" tick={{ fontSize: 11, fill: '#8B949E' }} />
              <YAxis stroke="#484F58" tick={{ fontSize: 11, fill: '#8B949E' }} tickFormatter={v => `$${v}`} />
              <Tooltip
                contentStyle={{ background: '#161B22', border: '1px solid #21262D', borderRadius: 6 }}
                labelStyle={{ color: '#8B949E' }}
                formatter={(v: number) => [`$${v.toFixed(2)}`, 'Cumulative P&L']}
              />
              <Area type="monotone" dataKey="pnl" stroke="#58A6FF" fill="url(#pnlGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Win/Loss pie */}
        <div className="bg-bg-card border border-bg-border rounded-lg p-4 flex flex-col items-center justify-center">
          <p className="text-text font-semibold text-sm mb-2 self-start">Outcome Split</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#161B22', border: '1px solid #21262D', borderRadius: 6 }}
                formatter={(v: number, name: string) => [v, name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex gap-3 text-xs mt-1">
            <span className="text-win">● Wins {stats.wins}</span>
            <span className="text-loss">● Losses {stats.losses}</span>
            {stats.breakevens > 0 && <span className="text-breakeven">● B/E {stats.breakevens}</span>}
          </div>
        </div>
      </div>

      {/* Session + Pair charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-bg-card border border-bg-border rounded-lg p-4">
          <p className="text-text font-semibold text-sm mb-4">Trades by Session</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={sessionData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262D" />
              <XAxis dataKey="name" stroke="#484F58" tick={{ fontSize: 11, fill: '#8B949E' }} />
              <YAxis stroke="#484F58" tick={{ fontSize: 11, fill: '#8B949E' }} />
              <Tooltip contentStyle={{ background: '#161B22', border: '1px solid #21262D', borderRadius: 6 }} />
              <Bar dataKey="wins" name="Wins" fill="#3FB950" radius={[3, 3, 0, 0]} />
              <Bar dataKey="trades" name="Total" fill="#21262D" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-bg-card border border-bg-border rounded-lg p-4">
          <p className="text-text font-semibold text-sm mb-4">P&L by Pair</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={pairData} layout="vertical" barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262D" />
              <XAxis type="number" stroke="#484F58" tick={{ fontSize: 11, fill: '#8B949E' }} tickFormatter={v => `$${v}`} />
              <YAxis type="category" dataKey="pair" stroke="#484F58" tick={{ fontSize: 11, fill: '#8B949E' }} width={60} />
              <Tooltip contentStyle={{ background: '#161B22', border: '1px solid #21262D', borderRadius: 6 }} formatter={(v: number) => [`$${v.toFixed(2)}`, 'P&L']} />
              <Bar dataKey="pnl" radius={[0, 3, 3, 0]}
                fill="#58A6FF"
                label={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent trades */}
      <div className="bg-bg-card border border-bg-border rounded-lg">
        <div className="px-5 py-4 border-b border-bg-border flex items-center justify-between">
          <p className="text-text font-semibold text-sm">Recent Trades</p>
          <Link href="/trades" className="text-accent text-xs hover:underline">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted text-xs border-b border-bg-border">
                <th className="px-5 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Pair</th>
                <th className="px-4 py-3 text-left font-medium">Dir</th>
                <th className="px-4 py-3 text-left font-medium">Setup</th>
                <th className="px-4 py-3 text-left font-medium">Session</th>
                <th className="px-4 py-3 text-left font-medium">Result</th>
                <th className="px-4 py-3 text-left font-medium">P&L</th>
                <th className="px-4 py-3 text-left font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(trade => (
                <tr key={trade.id} className="border-b border-bg-border hover:bg-bg-elevated transition-colors">
                  <td className="px-5 py-3 text-muted text-xs font-mono">{trade.date}</td>
                  <td className="px-4 py-3 font-semibold">{trade.pair}</td>
                  <td className="px-4 py-3">
                    <span className={trade.direction === 'BUY' ? 'text-win font-mono text-xs' : 'text-loss font-mono text-xs'}>
                      {trade.direction}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">{trade.setupType}</td>
                  <td className="px-4 py-3 text-muted text-xs">{trade.session}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${outcomeBg(trade.outcome)}`}>
                      {trade.outcome}
                    </span>
                  </td>
                  <td className={`px-4 py-3 font-mono text-xs font-semibold ${trade.profitLossDollar >= 0 ? 'text-win' : 'text-loss'}`}>
                    {formatCurrency(trade.profitLossDollar)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${scoreBg(trade.qualityScore?.total ?? 0)}`}>
                      {trade.qualityScore?.total ?? 0}/10
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <p className="text-5xl mb-4">📈</p>
      <h2 className="text-xl font-bold text-text mb-2">Your journal is empty</h2>
      <p className="text-muted text-sm mb-6 max-w-sm">
        Start logging trades to see your equity curve, win rate, and performance analytics.
      </p>
      <Link href="/trades/new">
        <Button size="lg">Log your first trade</Button>
      </Link>
    </div>
  );
}

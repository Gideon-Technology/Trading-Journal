'use client';

import { useMemo } from 'react';
import { useJournalStore } from '@/lib/store';
import { computeStats } from '@forex-journal/shared';
import { StatCard } from '@/components/ui/StatCard';
import { formatCurrency } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ScatterChart, Scatter, Cell, PieChart, Pie, Legend,
} from 'recharts';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-card border border-bg-border rounded-lg p-5">
      <p className="text-text font-semibold text-sm mb-4">{title}</p>
      {children}
    </div>
  );
}

export default function Analytics() {
  const trades = useJournalStore(s => s.trades);
  const stats = useMemo(() => computeStats(trades), [trades]);

  const pairStats = useMemo(() => {
    const map: Record<string, { pnl: number; wins: number; losses: number; total: number }> = {};
    for (const t of trades) {
      if (!map[t.pair]) map[t.pair] = { pnl: 0, wins: 0, losses: 0, total: 0 };
      map[t.pair].pnl += t.profitLossDollar ?? 0;
      map[t.pair].total += 1;
      if (t.outcome === 'WIN') map[t.pair].wins += 1;
      if (t.outcome === 'LOSS') map[t.pair].losses += 1;
    }
    return Object.entries(map).map(([pair, d]) => ({
      pair, ...d,
      pnl: parseFloat(d.pnl.toFixed(2)),
      winRate: parseFloat(((d.wins / d.total) * 100).toFixed(1)),
    })).sort((a, b) => b.pnl - a.pnl);
  }, [trades]);

  const sessionStats = useMemo(() => {
    const map: Record<string, { pnl: number; wins: number; total: number }> = {};
    for (const t of trades) {
      const s = t.session;
      if (!map[s]) map[s] = { pnl: 0, wins: 0, total: 0 };
      map[s].pnl += t.profitLossDollar ?? 0;
      map[s].total += 1;
      if (t.outcome === 'WIN') map[s].wins += 1;
    }
    return Object.entries(map).map(([session, d]) => ({
      session: session.replace('London-NY Overlap', 'LDN-NY'),
      pnl: parseFloat(d.pnl.toFixed(2)),
      winRate: parseFloat(((d.wins / d.total) * 100).toFixed(1)),
      total: d.total,
    }));
  }, [trades]);

  const setupStats = useMemo(() => {
    const map: Record<string, { pnl: number; wins: number; total: number }> = {};
    for (const t of trades) {
      if (!map[t.setupType]) map[t.setupType] = { pnl: 0, wins: 0, total: 0 };
      map[t.setupType].pnl += t.profitLossDollar ?? 0;
      map[t.setupType].total += 1;
      if (t.outcome === 'WIN') map[t.setupType].wins += 1;
    }
    return Object.entries(map).map(([setup, d]) => ({
      setup, pnl: parseFloat(d.pnl.toFixed(2)),
      winRate: parseFloat(((d.wins / d.total) * 100).toFixed(1)),
      total: d.total,
    })).sort((a, b) => b.pnl - a.pnl);
  }, [trades]);

  const scoreDistribution = useMemo(() => {
    const buckets = [
      { range: '0-4 Poor', min: 0, max: 4, count: 0, pnl: 0 },
      { range: '5-6 Avg', min: 5, max: 6, count: 0, pnl: 0 },
      { range: '7-8 Good', min: 7, max: 8, count: 0, pnl: 0 },
      { range: '9-10 A+', min: 9, max: 10, count: 0, pnl: 0 },
    ];
    for (const t of trades) {
      const s = t.qualityScore?.total ?? 0;
      const b = buckets.find(b => s >= b.min && s <= b.max);
      if (b) { b.count++; b.pnl += t.profitLossDollar ?? 0; }
    }
    return buckets.map(b => ({ ...b, pnl: parseFloat(b.pnl.toFixed(2)) }));
  }, [trades]);

  const mistakeFrequency = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of trades) {
      if (!t.mistakes) continue;
      for (const [k, v] of Object.entries(t.mistakes)) {
        if (v) counts[k] = (counts[k] ?? 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([mistake, count]) => ({ mistake: mistake.replace(/([A-Z])/g, ' $1').trim(), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [trades]);

  const rrData = useMemo(() =>
    trades.map(t => ({ rr: t.rrAchieved ?? 0, pnl: t.profitLossDollar ?? 0, outcome: t.outcome })),
    [trades]
  );

  const winLossPie = [
    { name: 'Wins', value: stats.wins, color: '#3FB950' },
    { name: 'Losses', value: stats.losses, color: '#F85149' },
    { name: 'B/E', value: stats.breakevens, color: '#D29922' },
  ].filter(d => d.value > 0);

  if (!trades.length) {
    return <div className="text-center py-20 text-muted">No trades logged yet. Add trades to see analytics.</div>;
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-text">Analytics</h1>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard label="Total Trades" value={stats.totalTrades} />
        <StatCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} valueClass={stats.winRate >= 50 ? 'text-win' : 'text-loss'} />
        <StatCard label="Total P&L" value={formatCurrency(stats.totalPnlDollar)} valueClass={stats.totalPnlDollar >= 0 ? 'text-win' : 'text-loss'} />
        <StatCard label="Total Points" value={`${stats.totalPnlPoints >= 0 ? '+' : ''}${stats.totalPnlPoints.toFixed(1)}`} valueClass={stats.totalPnlPoints >= 0 ? 'text-win' : 'text-loss'} />
        <StatCard label="Avg R:R" value={stats.avgRR.toFixed(2)} />
        <StatCard label="Avg Quality" value={`${stats.avgQualityScore.toFixed(1)}/10`} valueClass="text-accent" />
      </div>

      {/* Row: Pair P&L + Session */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="P&L by Instrument">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pairStats} layout="vertical" barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262D" />
              <XAxis type="number" stroke="#484F58" tick={{ fontSize: 11, fill: '#8B949E' }} tickFormatter={v => `$${v}`} />
              <YAxis type="category" dataKey="pair" stroke="#484F58" tick={{ fontSize: 11, fill: '#8B949E' }} width={70} />
              <Tooltip contentStyle={{ background: '#161B22', border: '1px solid #21262D', borderRadius: 6 }} formatter={(v: number) => [`$${v.toFixed(2)}`, 'P&L']} />
              <Bar dataKey="pnl" radius={[0, 3, 3, 0]}>
                {pairStats.map((entry, i) => <Cell key={i} fill={entry.pnl >= 0 ? '#3FB950' : '#F85149'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Win Rate by Session (%)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sessionStats} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262D" />
              <XAxis dataKey="session" stroke="#484F58" tick={{ fontSize: 11, fill: '#8B949E' }} />
              <YAxis stroke="#484F58" tick={{ fontSize: 11, fill: '#8B949E' }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={{ background: '#161B22', border: '1px solid #21262D', borderRadius: 6 }} formatter={(v: number) => [`${v}%`, 'Win Rate']} />
              <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                {sessionStats.map((entry, i) => <Cell key={i} fill={entry.winRate >= 50 ? '#3FB950' : '#F85149'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>

      {/* Setup performance + quality score distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="P&L by Setup Type">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={setupStats} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262D" />
              <XAxis dataKey="setup" stroke="#484F58" tick={{ fontSize: 10, fill: '#8B949E' }} />
              <YAxis stroke="#484F58" tick={{ fontSize: 11, fill: '#8B949E' }} tickFormatter={v => `$${v}`} />
              <Tooltip contentStyle={{ background: '#161B22', border: '1px solid #21262D', borderRadius: 6 }} />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                {setupStats.map((entry, i) => <Cell key={i} fill={entry.pnl >= 0 ? '#3FB950' : '#F85149'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Trade Quality Score Distribution">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={scoreDistribution} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262D" />
              <XAxis dataKey="range" stroke="#484F58" tick={{ fontSize: 10, fill: '#8B949E' }} />
              <YAxis stroke="#484F58" tick={{ fontSize: 11, fill: '#8B949E' }} />
              <Tooltip contentStyle={{ background: '#161B22', border: '1px solid #21262D', borderRadius: 6 }} />
              <Bar dataKey="count" name="Trades" fill="#58A6FF" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pnl" name="P&L ($)" fill="#3FB950" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>

      {/* Mistake frequency + RR scatter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Most Frequent Mistakes">
          {mistakeFrequency.length === 0 ? (
            <p className="text-muted text-sm">No mistakes recorded. Keep it up.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={mistakeFrequency} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262D" />
                <XAxis type="number" stroke="#484F58" tick={{ fontSize: 11, fill: '#8B949E' }} />
                <YAxis type="category" dataKey="mistake" stroke="#484F58" tick={{ fontSize: 10, fill: '#8B949E' }} width={120} />
                <Tooltip contentStyle={{ background: '#161B22', border: '1px solid #21262D', borderRadius: 6 }} />
                <Bar dataKey="count" fill="#F85149" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>

        <Section title="R:R vs P&L (Scatter)">
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262D" />
              <XAxis dataKey="rr" name="R:R" stroke="#484F58" tick={{ fontSize: 11, fill: '#8B949E' }} label={{ value: 'R:R Achieved', position: 'bottom', fill: '#8B949E', fontSize: 10 }} />
              <YAxis dataKey="pnl" name="P&L $" stroke="#484F58" tick={{ fontSize: 11, fill: '#8B949E' }} tickFormatter={v => `$${v}`} />
              <Tooltip contentStyle={{ background: '#161B22', border: '1px solid #21262D', borderRadius: 6 }} cursor={{ strokeDasharray: '3 3' }}
                formatter={(v: number, name: string) => [name === 'pnl' ? `$${v.toFixed(2)}` : v.toFixed(2), name === 'pnl' ? 'P&L' : 'R:R']} />
              <Scatter data={rrData}>
                {rrData.map((entry, i) => (
                  <Cell key={i} fill={entry.outcome === 'WIN' ? '#3FB950' : entry.outcome === 'LOSS' ? '#F85149' : '#D29922'} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </Section>
      </div>

      {/* Outcome pie + Best/Worst summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Outcome Distribution">
          <div className="flex items-center justify-center gap-8">
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie data={winLossPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4}>
                  {winLossPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#161B22', border: '1px solid #21262D', borderRadius: 6 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {winLossPie.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                  <span className="text-text text-sm">{d.name}</span>
                  <span className="text-muted text-sm">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Performance Summary">
          <div className="space-y-2 text-sm">
            {[
              ['Best Pair', stats.bestPair],
              ['Worst Pair', stats.worstPair],
              ['Best Session', stats.bestSession],
              ['Worst Session', stats.worstSession],
              ['Best Setup', stats.mostProfitableSetup],
              ['Top Mistake', stats.mostRepeatedMistake],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between border-b border-bg-border py-1.5 last:border-0">
                <span className="text-muted">{label}</span>
                <span className="text-text font-medium">{value}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

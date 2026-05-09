'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { useJournalStore } from '@/lib/store';
import { formatCurrency, outcomeBg } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import type { Trade } from '@forex-journal/shared';

type RuleStatus = 'SAFE' | 'WARNING' | 'STOP';

interface StatusCard {
  status: RuleStatus;
  title: string;
  messages: string[];
}

function statusBg(s: RuleStatus) {
  if (s === 'STOP') return 'bg-loss/10 border-loss/50 text-loss';
  if (s === 'WARNING') return 'bg-breakeven/10 border-breakeven/50 text-breakeven';
  return 'bg-win/10 border-win/50 text-win';
}

function statusDot(s: RuleStatus) {
  if (s === 'STOP') return 'bg-loss animate-pulse';
  if (s === 'WARNING') return 'bg-breakeven animate-pulse';
  return 'bg-win';
}

function computeStatus(params: {
  todayTrades: Trade[];
  todayPnL: number;
  weekPnL: number;
  consecutiveLosses: number;
  maxDailyLossDollar: number;
  maxDailyTrades: number;
  maxConsecutiveLosses: number;
  profitTarget: number;
  trailingDrawdown: number;
  accountSize: number;
}): StatusCard {
  const {
    todayTrades, todayPnL, weekPnL, consecutiveLosses,
    maxDailyLossDollar, maxDailyTrades, maxConsecutiveLosses,
    profitTarget, trailingDrawdown, accountSize,
  } = params;

  const todayLoss = Math.abs(Math.min(0, todayPnL));
  const messages: string[] = [];
  let status = 'SAFE' as RuleStatus;

  // Daily loss limit
  if (maxDailyLossDollar > 0) {
    const pct = todayLoss / maxDailyLossDollar;
    if (pct >= 1) {
      status = 'STOP';
      messages.push(`Daily loss limit reached (${formatCurrency(todayLoss)} of ${formatCurrency(maxDailyLossDollar)}). Stop trading now.`);
    } else if (pct >= 0.75) {
      if (status !== 'STOP') status = 'WARNING';
      messages.push(`Down ${formatCurrency(todayLoss)} today. Daily max loss is ${formatCurrency(maxDailyLossDollar)}. One more bad trade may stop you.`);
    }
  }

  // Max trades per day
  if (maxDailyTrades > 0) {
    if (todayTrades.length >= maxDailyTrades) {
      status = 'STOP';
      messages.push(`You have taken ${todayTrades.length} of ${maxDailyTrades} allowed trades today. No more entries.`);
    } else {
      messages.push(`You have taken ${todayTrades.length} of ${maxDailyTrades} allowed trades today.`);
    }
  }

  // Consecutive losses
  if (consecutiveLosses >= maxConsecutiveLosses) {
    status = 'STOP';
    messages.push(`${consecutiveLosses} consecutive losses. Take a break and review before trading again.`);
  } else if (consecutiveLosses > 0 && consecutiveLosses >= maxConsecutiveLosses - 1) {
    if (status !== 'STOP') status = 'WARNING';
    messages.push(`${consecutiveLosses} loss in a row. One more triggers your consecutive loss rule.`);
  }

  // Trailing drawdown
  if (trailingDrawdown > 0 && weekPnL < 0) {
    const ddUsed = Math.abs(Math.min(0, weekPnL));
    const pct = ddUsed / trailingDrawdown;
    if (pct >= 1) {
      status = 'STOP';
      messages.push(`Trailing drawdown limit reached (${formatCurrency(ddUsed)} of ${formatCurrency(trailingDrawdown)}). Do not trade.`);
    } else if (pct >= 0.75) {
      if (status !== 'STOP') status = 'WARNING';
      messages.push(`${Math.round(pct * 100)}% of trailing drawdown used (${formatCurrency(ddUsed)} of ${formatCurrency(trailingDrawdown)}).`);
    }
  }

  // Profit target hit
  if (profitTarget > 0 && weekPnL >= profitTarget) {
    if (status === 'SAFE') {
      messages.push(`Weekly profit target reached (${formatCurrency(weekPnL)} of ${formatCurrency(profitTarget)}). Consider stopping for the week.`);
    }
  }

  // Daily target check (50% of weekly target)
  if (profitTarget > 0) {
    const dailyTarget = profitTarget * 0.2;
    if (todayPnL >= dailyTarget && status === 'SAFE') {
      messages.push(`You are already ${formatCurrency(todayPnL)} up today. Consider protecting profits.`);
    }
  }

  // Worst instrument / session pattern
  // (only show if no hard stop)
  if (status !== 'STOP' && todayTrades.length === 0 && messages.length === 0) {
    messages.push('No trades logged today. Market is open — wait for your setup.');
  }

  if (messages.length === 0 && status === 'SAFE') {
    messages.push('All rules green. Trade your plan.');
  }

  const title = status === 'STOP' ? 'Stop Trading' : status === 'WARNING' ? 'Caution — Approach Limit' : 'Safe to Trade';
  return { status, title, messages };
}

function Stat({ label, value, sub, cls = '' }: { label: string; value: string; sub?: string; cls?: string }) {
  return (
    <div className="bg-bg-card border border-bg-border rounded-lg p-4 text-center">
      <p className="text-muted text-xs mb-1">{label}</p>
      <p className={`font-mono font-bold text-lg ${cls}`}>{value}</p>
      {sub && <p className="text-muted text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

export default function CommandCenter() {
  const { trades, riskSettings, getTodayPlan } = useJournalStore();

  const today = format(new Date(), 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const todayTrades = useMemo(() => trades.filter(t => t.date === today), [trades, today]);
  const weekTrades = useMemo(() => trades.filter(t => t.date >= weekStart && t.date <= weekEnd), [trades, weekStart, weekEnd]);

  const todayPnL = useMemo(() => todayTrades.reduce((s, t) => s + (t.profitLossDollar ?? 0), 0), [todayTrades]);
  const weekPnL = useMemo(() => weekTrades.reduce((s, t) => s + (t.profitLossDollar ?? 0), 0), [weekTrades]);

  const consecutiveLosses = useMemo(() => {
    let count = 0;
    for (const t of trades) { if (t.outcome === 'LOSS') count++; else break; }
    return count;
  }, [trades]);

  const todayPlan = getTodayPlan(today);
  const maxDailyLossDollar = (riskSettings.maxDailyLoss / 100) * riskSettings.accountSize;
  const todayLossUsedPct = maxDailyLossDollar > 0 ? Math.min(100, (Math.abs(Math.min(0, todayPnL)) / maxDailyLossDollar) * 100) : 0;

  const statusCard = useMemo(() => computeStatus({
    todayTrades,
    todayPnL,
    weekPnL,
    consecutiveLosses,
    maxDailyLossDollar,
    maxDailyTrades: riskSettings.maxDailyTrades,
    maxConsecutiveLosses: riskSettings.maxConsecutiveLosses,
    profitTarget: riskSettings.profitTarget ?? 0,
    trailingDrawdown: riskSettings.trailingDrawdown ?? 0,
    accountSize: riskSettings.accountSize,
  }), [todayTrades, todayPnL, weekPnL, consecutiveLosses, maxDailyLossDollar, riskSettings]);

  // Pattern insight: most losses from which instrument today
  const lossPattern = useMemo(() => {
    const recentLosses = trades.filter(t => t.outcome === 'LOSS').slice(0, 5);
    if (recentLosses.length < 2) return null;
    const freq: Record<string, number> = {};
    for (const t of recentLosses) freq[`${t.pair} during ${t.session}`] = (freq[`${t.pair} during ${t.session}`] ?? 0) + 1;
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 2) return `Your last ${recentLosses.length} losses include ${top[1]}x ${top[0]}.`;
    return null;
  }, [trades]);

  const reviewPending = useMemo(() => trades.filter(t => t.reviewStatus !== 'REVIEWED' && (!t.wentWell || !t.improvement || (t.qualityScore?.total ?? 0) < 5)).length, [trades]);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Command Center</h1>
          <p className="text-muted text-sm">{format(new Date(), 'EEEE, MMMM d, yyyy')} · {riskSettings.propFirm ?? 'Custom account'}</p>
        </div>
        <Link href="/trades/new">
          <Button>+ Log Trade</Button>
        </Link>
      </div>

      {/* Rule status card */}
      <div className={`rounded-xl border-2 p-5 ${statusBg(statusCard.status)}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-3 h-3 rounded-full ${statusDot(statusCard.status)}`} />
          <p className="font-bold text-lg">{statusCard.title}</p>
        </div>
        <div className="space-y-1.5">
          {statusCard.messages.map((msg, i) => (
            <p key={i} className="text-sm">— {msg}</p>
          ))}
          {lossPattern && <p className="text-sm opacity-80">— {lossPattern}</p>}
        </div>
      </div>

      {/* Today's Plan banner */}
      {!todayPlan ? (
        <Link href="/plan">
          <div className="rounded-xl border-2 border-dashed border-accent/40 p-4 flex items-center justify-between hover:border-accent/70 transition-colors cursor-pointer">
            <div>
              <p className="font-semibold text-text text-sm">No trade plan for today</p>
              <p className="text-muted text-xs mt-0.5">Create your plan before trading — define bias, instruments, and limits.</p>
            </div>
            <span className="text-accent text-sm font-semibold shrink-0 ml-4">Create Plan →</span>
          </div>
        </Link>
      ) : (
        <div className={`rounded-xl border-2 p-4 ${todayPlan.status === 'READY' ? 'border-win/40 bg-win/5' : 'border-breakeven/40 bg-breakeven/5'}`}>
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-sm text-text">
              {todayPlan.status === 'READY' ? '✓ Plan Ready' : '⚠ Plan Draft'}
              {todayPlan.marketBias === 'BULLISH' ? ' · ↑ Bullish' : todayPlan.marketBias === 'BEARISH' ? ' · ↓ Bearish' : ' · → Neutral'}
            </p>
            <Link href="/plan" className="text-xs text-accent hover:underline">Edit →</Link>
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            {todayPlan.allowedInstruments.map(i => (
              <span key={i} className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">{i}</span>
            ))}
            {todayPlan.allowedInstruments.length === 0 && (
              <span className="text-xs text-loss">No instruments set — update your plan</span>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted">
            <span>Max trades: <strong className="text-text">{todayPlan.maxTrades}</strong></span>
            <span>Risk/trade: <strong className="text-text">{todayPlan.maxRiskPerTrade}%</strong></span>
            <span>Stop: <strong className="text-text">${todayPlan.dailyStopLoss}</strong></span>
            <span>Target: <strong className="text-text">${todayPlan.dailyProfitTarget}</strong></span>
            {todayPlan.mainSetup && <span>Setup: <strong className="text-text">{todayPlan.mainSetup}</strong></span>}
          </div>
          {todayPlan.noTradeConditions && (
            <p className="text-xs text-loss mt-2">⛔ {todayPlan.noTradeConditions}</p>
          )}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Today P&L" value={formatCurrency(todayPnL)} cls={todayPnL >= 0 ? 'text-win' : 'text-loss'} />
        <Stat label="Trades Today" value={`${todayTrades.length}${riskSettings.maxDailyTrades > 0 ? ` / ${riskSettings.maxDailyTrades}` : ''}`}
          cls={riskSettings.maxDailyTrades > 0 && todayTrades.length >= riskSettings.maxDailyTrades ? 'text-loss' : 'text-text'} />
        <Stat label="Loss Streak" value={`${consecutiveLosses}`}
          cls={consecutiveLosses >= riskSettings.maxConsecutiveLosses ? 'text-loss' : consecutiveLosses > 0 ? 'text-breakeven' : 'text-win'}
          sub={consecutiveLosses > 0 ? `max ${riskSettings.maxConsecutiveLosses}` : 'no streak'} />
        <Stat label="Daily Limit Used" value={`${todayLossUsedPct.toFixed(0)}%`}
          cls={todayLossUsedPct >= 100 ? 'text-loss' : todayLossUsedPct >= 75 ? 'text-breakeven' : 'text-win'}
          sub={formatCurrency(maxDailyLossDollar) + ' limit'} />
      </div>

      {/* Week progress */}
      {(riskSettings.profitTarget ?? 0) > 0 && (
        <div className="bg-bg-card border border-bg-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-text text-sm font-semibold">Week Progress</p>
            <p className="text-muted text-xs">{formatCurrency(weekPnL)} of {formatCurrency(riskSettings.profitTarget ?? 0)} target</p>
          </div>
          <div className="w-full bg-bg-border rounded-full h-3">
            <div
              className="bg-accent h-3 rounded-full transition-all"
              style={{ width: `${Math.min(100, ((riskSettings.profitTarget ?? 0) > 0 ? (Math.max(0, weekPnL) / (riskSettings.profitTarget ?? 1)) * 100 : 0))}%` }}
            />
          </div>
          <p className="text-muted text-xs mt-1">{weekTrades.length} trades this week</p>
        </div>
      )}

      {/* Today's trades */}
      <div className="bg-bg-card border border-bg-border rounded-lg">
        <div className="px-5 py-4 border-b border-bg-border flex items-center justify-between">
          <p className="text-text font-semibold text-sm">Today's Trades</p>
          {todayTrades.length > 0 && (
            <p className="text-muted text-xs">
              {todayTrades.filter(t => t.outcome === 'WIN').length}W · {todayTrades.filter(t => t.outcome === 'LOSS').length}L
            </p>
          )}
        </div>
        {todayTrades.length === 0 ? (
          <div className="py-10 text-center text-muted text-sm">No trades logged today.</div>
        ) : (
          <div className="divide-y divide-bg-border">
            {todayTrades.map(t => (
              <Link key={t.id} href={`/trades/${t.id}`}>
                <div className="px-5 py-3 flex items-center justify-between hover:bg-bg-elevated transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${outcomeBg(t.outcome)}`}>{t.outcome}</span>
                    <span className="font-semibold text-sm text-text">{t.pair}</span>
                    <span className={`text-xs font-mono font-bold ${t.direction === 'LONG' || t.direction === 'BUY' ? 'text-win' : 'text-loss'}`}>{t.direction}</span>
                    <span className="text-muted text-xs">{t.session}</span>
                  </div>
                  <span className={`font-mono text-sm font-semibold ${t.profitLossDollar >= 0 ? 'text-win' : 'text-loss'}`}>
                    {formatCurrency(t.profitLossDollar)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Next actions */}
      <div className="bg-bg-card border border-bg-border rounded-lg p-5">
        <p className="font-semibold text-sm text-text mb-3">Next Required Actions</p>
        <div className="space-y-2">
          {reviewPending > 0 && (
            <Link href="/review-queue">
              <div className="flex items-center justify-between p-3 rounded-lg bg-loss/5 border border-loss/20 hover:border-loss/40 transition-colors">
                <p className="text-sm text-text">{reviewPending} trade{reviewPending !== 1 ? 's' : ''} need review</p>
                <span className="text-loss text-xs font-semibold">Review Queue →</span>
              </div>
            </Link>
          )}
          {todayTrades.length > 0 && (
            <Link href="/review/daily">
              <div className="flex items-center justify-between p-3 rounded-lg bg-accent/5 border border-accent/20 hover:border-accent/40 transition-colors">
                <p className="text-sm text-text">Complete today's daily review</p>
                <span className="text-accent text-xs font-semibold">Daily Review →</span>
              </div>
            </Link>
          )}
          {todayTrades.length === 0 && statusCard.status === 'SAFE' && (
            <div className="p-3 rounded-lg bg-bg-elevated border border-bg-border">
              <p className="text-sm text-muted">Wait for your setup. No trades yet today.</p>
            </div>
          )}
          <Link href="/risk">
            <div className="flex items-center justify-between p-3 rounded-lg bg-bg-elevated border border-bg-border hover:border-accent/30 transition-colors">
              <p className="text-sm text-muted">Risk rules · {riskSettings.propFirm ?? 'Custom'}</p>
              <span className="text-muted text-xs">Edit →</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

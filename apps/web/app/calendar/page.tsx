'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isToday, parseISO } from 'date-fns';
import { useJournalStore } from '@/lib/store';
import { formatCurrency, outcomeBg } from '@/lib/utils';
import type { Trade } from '@forex-journal/shared';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dayColor(pnl: number, trades: number): string {
  if (trades === 0) return '';
  if (pnl > 0) return 'bg-win/20 border-win/40 text-win';
  if (pnl < 0) return 'bg-loss/20 border-loss/40 text-loss';
  return 'bg-breakeven/20 border-breakeven/40 text-breakeven';
}

export default function CalendarPage() {
  const trades = useJournalStore(s => s.trades);
  const [current, setCurrent] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const tradesByDate = useMemo(() => {
    const map: Record<string, Trade[]> = {};
    for (const t of trades) {
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push(t);
    }
    return map;
  }, [trades]);

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart); // 0=Sun

  const monthStats = useMemo(() => {
    const monthDates = days.map(d => format(d, 'yyyy-MM-dd'));
    const monthTrades = trades.filter(t => monthDates.includes(t.date));
    const pnl = monthTrades.reduce((s, t) => s + (t.profitLossDollar ?? 0), 0);
    const wins = monthTrades.filter(t => t.outcome === 'WIN').length;
    const losses = monthTrades.filter(t => t.outcome === 'LOSS').length;
    return { total: monthTrades.length, pnl, wins, losses };
  }, [trades, days]);

  const selectedTrades = selectedDay ? (tradesByDate[selectedDay] ?? []) : [];

  const prevMonth = () => setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Trading Calendar</h1>
          <p className="text-muted text-sm">
            {monthStats.total} trades · W:{monthStats.wins} L:{monthStats.losses} ·{' '}
            <span className={monthStats.pnl >= 0 ? 'text-win' : 'text-loss'}>
              {formatCurrency(monthStats.pnl)}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="px-3 py-1.5 rounded bg-bg-elevated border border-bg-border text-muted hover:text-text text-sm transition-colors">←</button>
          <span className="text-text font-semibold text-sm w-36 text-center">{format(current, 'MMMM yyyy')}</span>
          <button onClick={nextMonth} className="px-3 py-1.5 rounded bg-bg-elevated border border-bg-border text-muted hover:text-text text-sm transition-colors">→</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calendar grid */}
        <div className="lg:col-span-2 bg-bg-card border border-bg-border rounded-lg p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-xs text-muted font-medium py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Leading empty cells */}
            {Array.from({ length: startPad }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}

            {days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayTrades = tradesByDate[dateStr] ?? [];
              const pnl = dayTrades.reduce((s, t) => s + (t.profitLossDollar ?? 0), 0);
              const isSelected = selectedDay === dateStr;
              const today = isToday(day);

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                  className={[
                    'relative rounded-lg border p-1.5 text-left transition-all min-h-[54px]',
                    dayTrades.length > 0
                      ? `${dayColor(pnl, dayTrades.length)} cursor-pointer hover:opacity-90`
                      : 'border-bg-border bg-bg-elevated text-muted',
                    isSelected ? 'ring-2 ring-accent' : '',
                    today ? 'ring-1 ring-accent/40' : '',
                  ].join(' ')}
                >
                  <span className={`text-xs font-semibold ${today ? 'text-accent' : ''}`}>
                    {format(day, 'd')}
                  </span>
                  {dayTrades.length > 0 && (
                    <div className="mt-0.5">
                      <p className="text-xs font-mono font-bold leading-tight">
                        {pnl >= 0 ? '+' : ''}{formatCurrency(pnl).replace('$', '')}
                      </p>
                      <p className="text-xs opacity-70">{dayTrades.length}t</p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-4 pt-3 border-t border-bg-border">
            <span className="flex items-center gap-1.5 text-xs text-muted"><span className="w-3 h-3 rounded bg-win/20 border border-win/40 inline-block" />Profit</span>
            <span className="flex items-center gap-1.5 text-xs text-muted"><span className="w-3 h-3 rounded bg-loss/20 border border-loss/40 inline-block" />Loss</span>
            <span className="flex items-center gap-1.5 text-xs text-muted"><span className="w-3 h-3 rounded bg-breakeven/20 border border-breakeven/40 inline-block" />B/E</span>
          </div>
        </div>

        {/* Day detail panel */}
        <div className="bg-bg-card border border-bg-border rounded-lg p-4">
          {!selectedDay ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <p className="text-muted text-sm">Click a day to see trades</p>
            </div>
          ) : (
            <div>
              <p className="font-semibold text-text mb-3">{format(parseISO(selectedDay), 'EEEE, MMMM d')}</p>
              {selectedTrades.length === 0 ? (
                <p className="text-muted text-sm">No trades on this day.</p>
              ) : (
                <div className="space-y-2">
                  {selectedTrades.map(trade => (
                    <Link key={trade.id} href={`/trades/${trade.id}`}>
                      <div className="p-3 rounded-lg bg-bg-elevated border border-bg-border hover:border-accent/40 transition-colors cursor-pointer">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-sm text-text">{trade.pair}</span>
                          <span className={trade.direction === 'BUY' || trade.direction === 'LONG' ? 'text-win text-xs font-mono font-bold' : 'text-loss text-xs font-mono font-bold'}>
                            {trade.direction}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${outcomeBg(trade.outcome)}`}>
                            {trade.outcome}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted">{trade.session} · {trade.setupType}</span>
                          <span className={`font-mono text-xs font-semibold ${trade.profitLossDollar >= 0 ? 'text-win' : 'text-loss'}`}>
                            {formatCurrency(trade.profitLossDollar)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                  <div className="border-t border-bg-border pt-2 mt-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted">Day P&L</span>
                      <span className={`font-mono font-semibold ${selectedTrades.reduce((s, t) => s + t.profitLossDollar, 0) >= 0 ? 'text-win' : 'text-loss'}`}>
                        {formatCurrency(selectedTrades.reduce((s, t) => s + t.profitLossDollar, 0))}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

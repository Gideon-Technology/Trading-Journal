'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import type { Trade, DailyReview, WeeklyReview, MonthlyReview } from '@forex-journal/shared';
import { calculateQualityScore } from '@forex-journal/shared';

interface JournalState {
  trades: Trade[];
  dailyReviews: DailyReview[];
  weeklyReviews: WeeklyReview[];
  monthlyReviews: MonthlyReview[];

  addTrade: (trade: Omit<Trade, 'id' | 'createdAt' | 'updatedAt' | 'qualityScore'>) => Trade;
  updateTrade: (id: string, updates: Partial<Trade>) => void;
  deleteTrade: (id: string) => void;
  getTrade: (id: string) => Trade | undefined;

  addDailyReview: (review: Omit<DailyReview, 'id'>) => void;
  updateDailyReview: (id: string, updates: Partial<DailyReview>) => void;
  getDailyReview: (date: string) => DailyReview | undefined;

  addWeeklyReview: (review: Omit<WeeklyReview, 'id'>) => void;
  updateWeeklyReview: (id: string, updates: Partial<WeeklyReview>) => void;

  addMonthlyReview: (review: Omit<MonthlyReview, 'id'>) => void;
  updateMonthlyReview: (id: string, updates: Partial<MonthlyReview>) => void;

  importData: (data: { trades?: Trade[]; dailyReviews?: DailyReview[]; weeklyReviews?: WeeklyReview[]; monthlyReviews?: MonthlyReview[] }) => void;
  clearAll: () => void;
}

export const useJournalStore = create<JournalState>()(
  persist(
    (set, get) => ({
      trades: [],
      dailyReviews: [],
      weeklyReviews: [],
      monthlyReviews: [],

      addTrade: (tradeData) => {
        const qualityScore = calculateQualityScore(tradeData);
        const trade: Trade = {
          ...tradeData,
          id: uuid(),
          qualityScore,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Trade;
        set(s => ({ trades: [trade, ...s.trades] }));
        return trade;
      },

      updateTrade: (id, updates) => {
        set(s => ({
          trades: s.trades.map(t =>
            t.id === id
              ? { ...t, ...updates, qualityScore: calculateQualityScore({ ...t, ...updates }), updatedAt: new Date().toISOString() }
              : t
          ),
        }));
      },

      deleteTrade: (id) => set(s => ({ trades: s.trades.filter(t => t.id !== id) })),

      getTrade: (id) => get().trades.find(t => t.id === id),

      addDailyReview: (review) =>
        set(s => ({ dailyReviews: [{ ...review, id: uuid() }, ...s.dailyReviews] })),

      updateDailyReview: (id, updates) =>
        set(s => ({ dailyReviews: s.dailyReviews.map(r => r.id === id ? { ...r, ...updates } : r) })),

      getDailyReview: (date) => get().dailyReviews.find(r => r.date === date),

      addWeeklyReview: (review) =>
        set(s => ({ weeklyReviews: [{ ...review, id: uuid() }, ...s.weeklyReviews] })),

      updateWeeklyReview: (id, updates) =>
        set(s => ({ weeklyReviews: s.weeklyReviews.map(r => r.id === id ? { ...r, ...updates } : r) })),

      addMonthlyReview: (review) =>
        set(s => ({ monthlyReviews: [{ ...review, id: uuid() }, ...s.monthlyReviews] })),

      updateMonthlyReview: (id, updates) =>
        set(s => ({ monthlyReviews: s.monthlyReviews.map(r => r.id === id ? { ...r, ...updates } : r) })),

      importData: (data) =>
        set(s => ({
          trades: mergeById([...(data.trades ?? []), ...s.trades]),
          dailyReviews: mergeById([...(data.dailyReviews ?? []), ...s.dailyReviews]),
          weeklyReviews: mergeById([...(data.weeklyReviews ?? []), ...s.weeklyReviews]),
          monthlyReviews: mergeById([...(data.monthlyReviews ?? []), ...s.monthlyReviews]),
        })),

      clearAll: () => set({ trades: [], dailyReviews: [], weeklyReviews: [], monthlyReviews: [] }),
    }),
    { name: 'forex-journal' }
  )
);

function mergeById<T extends { id: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of items) map.set(item.id, item);
  return Array.from(map.values());
}

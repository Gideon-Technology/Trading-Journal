'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import type { Trade, DailyReview, WeeklyReview, MonthlyReview, DailyPlan, PlaybookSetup } from '@forex-journal/shared';
import { calculateQualityScore } from '@forex-journal/shared';
import { runMigration, STORAGE_KEY } from './migration';

runMigration();

export interface RiskSettings {
  accountSize: number;
  maxRiskPerTrade: number;      // %
  maxDailyLoss: number;         // %
  maxDailyTrades: number;
  maxWeeklyLoss: number;        // %
  maxConsecutiveLosses: number;
  trailingDrawdown?: number;    // $ — prop firm trailing drawdown
  profitTarget?: number;        // $ — prop firm profit target
  maxContracts?: number;
  propFirm?: string;            // template label, e.g. 'Topstep 50K'
}

export interface PropFirmTemplate {
  label: string;
  accountSize: number;
  dailyLossPct: number;
  trailingDrawdown: number;   // $
  profitTarget: number;       // $
  maxContracts: number;
  maxDailyTrades: number;
  maxConsecutiveLosses: number;
  maxRiskPerTrade: number;    // %
  platform: string;
}

export const PROP_FIRM_TEMPLATES: PropFirmTemplate[] = [
  {
    label: 'Topstep 50K',
    accountSize: 50000,
    dailyLossPct: 2,        // $1,000
    trailingDrawdown: 2000,
    profitTarget: 3000,
    maxContracts: 5,
    maxDailyTrades: 6,
    maxConsecutiveLosses: 3,
    maxRiskPerTrade: 1,
    platform: 'NinjaTrader',
  },
  {
    label: 'Topstep 100K',
    accountSize: 100000,
    dailyLossPct: 2,        // $2,000
    trailingDrawdown: 3000,
    profitTarget: 6000,
    maxContracts: 10,
    maxDailyTrades: 6,
    maxConsecutiveLosses: 3,
    maxRiskPerTrade: 1,
    platform: 'NinjaTrader',
  },
  {
    label: 'Topstep 150K',
    accountSize: 150000,
    dailyLossPct: 2,        // $3,000
    trailingDrawdown: 4500,
    profitTarget: 9000,
    maxContracts: 15,
    maxDailyTrades: 6,
    maxConsecutiveLosses: 3,
    maxRiskPerTrade: 1,
    platform: 'NinjaTrader',
  },
  {
    label: 'Apex 50K',
    accountSize: 50000,
    dailyLossPct: 2,
    trailingDrawdown: 2500,
    profitTarget: 3000,
    maxContracts: 5,
    maxDailyTrades: 6,
    maxConsecutiveLosses: 3,
    maxRiskPerTrade: 1,
    platform: 'NinjaTrader / Rithmic',
  },
  {
    label: 'FTMO 100K',
    accountSize: 100000,
    dailyLossPct: 5,        // $5,000
    trailingDrawdown: 10000,
    profitTarget: 10000,
    maxContracts: 10,
    maxDailyTrades: 0,      // no limit
    maxConsecutiveLosses: 3,
    maxRiskPerTrade: 1,
    platform: 'MT4 / MT5',
  },
];

const DEFAULT_RISK: RiskSettings = {
  accountSize: 50000,
  maxRiskPerTrade: 1,
  maxDailyLoss: 2,
  maxDailyTrades: 6,
  maxWeeklyLoss: 4,
  maxConsecutiveLosses: 3,
  trailingDrawdown: 2000,
  profitTarget: 3000,
  maxContracts: 5,
  propFirm: 'Topstep 50K',
};

interface JournalState {
  trades: Trade[];
  dailyReviews: DailyReview[];
  weeklyReviews: WeeklyReview[];
  monthlyReviews: MonthlyReview[];
  dailyPlans: DailyPlan[];
  playbookSetups: PlaybookSetup[];
  tags: string[];
  riskSettings: RiskSettings;
  lastImportBatchId: string | null;

  updateRiskSettings: (s: Partial<RiskSettings>) => void;

  addTrade: (trade: Omit<Trade, 'id' | 'createdAt' | 'updatedAt' | 'qualityScore'>) => Trade;
  updateTrade: (id: string, updates: Partial<Trade>) => void;
  deleteTrade: (id: string) => void;
  getTrade: (id: string) => Trade | undefined;

  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;

  addDailyPlan: (plan: Omit<DailyPlan, 'id' | 'createdAt'>) => DailyPlan;
  updateDailyPlan: (id: string, updates: Partial<DailyPlan>) => void;
  getTodayPlan: (date: string) => DailyPlan | undefined;

  addPlaybookSetup: (setup: Omit<PlaybookSetup, 'id' | 'createdAt' | 'updatedAt'>) => PlaybookSetup;
  updatePlaybookSetup: (id: string, updates: Partial<PlaybookSetup>) => void;
  deletePlaybookSetup: (id: string) => void;

  addDailyReview: (review: Omit<DailyReview, 'id'>) => void;
  updateDailyReview: (id: string, updates: Partial<DailyReview>) => void;
  getDailyReview: (date: string) => DailyReview | undefined;

  addWeeklyReview: (review: Omit<WeeklyReview, 'id'>) => void;
  updateWeeklyReview: (id: string, updates: Partial<WeeklyReview>) => void;

  addMonthlyReview: (review: Omit<MonthlyReview, 'id'>) => void;
  updateMonthlyReview: (id: string, updates: Partial<MonthlyReview>) => void;

  importData: (data: { trades?: Trade[]; dailyReviews?: DailyReview[]; weeklyReviews?: WeeklyReview[]; monthlyReviews?: MonthlyReview[]; tags?: string[]; dailyPlans?: DailyPlan[]; playbookSetups?: PlaybookSetup[] }, batchId?: string) => { imported: number; skipped: number };
  undoLastImport: () => number;
  clearAll: () => void;
}

export const useJournalStore = create<JournalState>()(
  persist(
    (set, get) => ({
      trades: [],
      dailyReviews: [],
      weeklyReviews: [],
      monthlyReviews: [],
      dailyPlans: [],
      playbookSetups: [],
      tags: [],
      riskSettings: DEFAULT_RISK,
      lastImportBatchId: null,

      updateRiskSettings: (s) => set(prev => ({ riskSettings: { ...prev.riskSettings, ...s } })),

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

      addTag: (tag) => set(s => ({ tags: s.tags.includes(tag) ? s.tags : [...s.tags, tag].sort() })),
      removeTag: (tag) => set(s => ({
        tags: s.tags.filter(t => t !== tag),
        trades: s.trades.map(t => ({ ...t, tags: (t.tags ?? []).filter(tg => tg !== tag) })),
      })),

      addDailyPlan: (planData) => {
        const plan: DailyPlan = { ...planData, id: uuid(), createdAt: new Date().toISOString() };
        set(s => ({ dailyPlans: [plan, ...s.dailyPlans.filter(p => p.date !== planData.date)] }));
        return plan;
      },
      updateDailyPlan: (id, updates) =>
        set(s => ({ dailyPlans: s.dailyPlans.map(p => p.id === id ? { ...p, ...updates } : p) })),
      getTodayPlan: (date) => get().dailyPlans.find(p => p.date === date),

      addPlaybookSetup: (data) => {
        const setup: PlaybookSetup = { ...data, id: uuid(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        set(s => ({ playbookSetups: [setup, ...s.playbookSetups] }));
        return setup;
      },
      updatePlaybookSetup: (id, updates) =>
        set(s => ({ playbookSetups: s.playbookSetups.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p) })),
      deletePlaybookSetup: (id) => set(s => ({ playbookSetups: s.playbookSetups.filter(p => p.id !== id) })),

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

      importData: (data, batchId) => {
        const existing = get().trades;
        const existingKeys = new Set(existing.map(tradeFingerprint));
        const incoming = (data.trades ?? []).map(t => batchId ? { ...t, importBatchId: batchId } : t);
        const newTrades = incoming.filter(t => !existingKeys.has(tradeFingerprint(t)));
        const skipped = incoming.length - newTrades.length;
        set(s => ({
          trades: mergeById([...newTrades, ...s.trades]),
          dailyReviews: mergeById([...(data.dailyReviews ?? []), ...s.dailyReviews]),
          weeklyReviews: mergeById([...(data.weeklyReviews ?? []), ...s.weeklyReviews]),
          monthlyReviews: mergeById([...(data.monthlyReviews ?? []), ...s.monthlyReviews]),
          dailyPlans: mergeById([...(data.dailyPlans ?? []), ...s.dailyPlans]),
          playbookSetups: mergeById([...(data.playbookSetups ?? []), ...s.playbookSetups]),
          tags: [...new Set([...(data.tags ?? []), ...s.tags])].sort(),
          lastImportBatchId: batchId ?? s.lastImportBatchId,
        }));
        return { imported: newTrades.length, skipped };
      },

      undoLastImport: () => {
        const batchId = get().lastImportBatchId;
        if (!batchId) return 0;
        const before = get().trades.length;
        set(s => ({
          trades: s.trades.filter(t => t.importBatchId !== batchId),
          lastImportBatchId: null,
        }));
        return before - get().trades.length;
      },

      clearAll: () => set({ trades: [], dailyReviews: [], weeklyReviews: [], monthlyReviews: [], dailyPlans: [], playbookSetups: [], tags: [], lastImportBatchId: null }),
    }),
    { name: STORAGE_KEY }
  )
);

function mergeById<T extends { id: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of items) map.set(item.id, item);
  return Array.from(map.values());
}

function tradeFingerprint(t: Trade): string {
  return `${t.date}|${t.pair}|${t.direction}|${t.entryPrice}|${t.profitLossDollar}`;
}

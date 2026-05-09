'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import type { Trade, DailyReview, WeeklyReview, MonthlyReview, DailyPlan, PlaybookSetup, Signal, AutomationRules, ExecutionRecord, AuditLog, AIReview, AISignalScore } from '@forex-journal/shared';
import { calculateQualityScore, checkPlanCompliance, calcExecutionScore, DEFAULT_AUTOMATION_RULES } from '@forex-journal/shared';
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

  // Automation
  signals: Signal[];
  automationRules: AutomationRules;
  executionRecords: ExecutionRecord[];
  auditLogs: AuditLog[];
  aiReviews: AIReview[];
  aiSignalScores: AISignalScore[];

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

  // Signal actions
  addSignal: (signal: Omit<Signal, 'id' | 'createdAt' | 'updatedAt'>) => Signal;
  updateSignal: (id: string, updates: Partial<Signal>) => void;
  deleteSignal: (id: string) => void;
  getSignal: (id: string) => Signal | undefined;

  // Automation rules
  updateAutomationRules: (updates: Partial<AutomationRules>) => void;
  toggleKillSwitch: () => void;

  // Execution records
  addExecutionRecord: (record: ExecutionRecord) => void;
  updateExecutionRecord: (id: string, updates: Partial<ExecutionRecord>) => void;

  // Audit log
  addAuditLog: (log: Omit<AuditLog, 'id' | 'createdAt'>) => void;

  // AI reviews
  addAIReview: (review: Omit<AIReview, 'id' | 'createdAt' | 'updatedAt'>) => AIReview;
  updateAIReview: (id: string, updates: Partial<AIReview>) => void;
  addAISignalScore: (score: Omit<AISignalScore, 'id' | 'createdAt'>) => AISignalScore;

  importData: (data: { trades?: Trade[]; dailyReviews?: DailyReview[]; weeklyReviews?: WeeklyReview[]; monthlyReviews?: MonthlyReview[]; tags?: string[]; dailyPlans?: DailyPlan[]; playbookSetups?: PlaybookSetup[]; signals?: Signal[] }, batchId?: string) => { imported: number; skipped: number };
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
      signals: [],
      automationRules: DEFAULT_AUTOMATION_RULES,
      executionRecords: [],
      auditLogs: [],
      aiReviews: [],
      aiSignalScores: [],

      updateRiskSettings: (s) => set(prev => ({ riskSettings: { ...prev.riskSettings, ...s } })),

      addTrade: (tradeData) => {
        const qualityScore = calculateQualityScore(tradeData);
        const plan = get().dailyPlans.find(p => p.date === tradeData.date);
        const compliance = plan ? checkPlanCompliance(tradeData, plan) : null;
        const trade: Trade = {
          ...tradeData,
          id: uuid(),
          qualityScore,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...(compliance && {
            outsidePlan: compliance.outsidePlan,
            outsidePlanReasons: compliance.outsidePlanReasons,
            planComplianceScore: compliance.planComplianceScore,
          }),
        } as Trade;
        set(s => ({ trades: [trade, ...s.trades] }));
        return trade;
      },

      updateTrade: (id, updates) => {
        set(s => ({
          trades: s.trades.map(t => {
            if (t.id !== id) return t;
            const merged = { ...t, ...updates };
            const execScore = calcExecutionScore(merged);
            return {
              ...merged,
              qualityScore: calculateQualityScore(merged),
              executionScore: execScore >= 0 ? execScore : merged.executionScore,
              updatedAt: new Date().toISOString(),
            };
          }),
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

      addSignal: (data) => {
        const signal: Signal = {
          ...data,
          id: uuid(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set(s => ({ signals: [signal, ...s.signals] }));
        return signal;
      },
      updateSignal: (id, updates) =>
        set(s => ({
          signals: s.signals.map(sig =>
            sig.id === id ? { ...sig, ...updates, updatedAt: new Date().toISOString() } : sig
          ),
        })),
      deleteSignal: (id) => set(s => ({ signals: s.signals.filter(sig => sig.id !== id) })),
      getSignal: (id) => get().signals.find(sig => sig.id === id),

      updateAutomationRules: (updates) =>
        set(s => ({ automationRules: { ...s.automationRules, ...updates } })),
      toggleKillSwitch: () =>
        set(s => ({
          automationRules: { ...s.automationRules, killSwitchEnabled: !s.automationRules.killSwitchEnabled },
        })),

      addExecutionRecord: (record) =>
        set(s => ({ executionRecords: [record, ...s.executionRecords] })),
      updateExecutionRecord: (id, updates) =>
        set(s => ({
          executionRecords: s.executionRecords.map(r =>
            r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
          ),
        })),

      addAuditLog: (data) => {
        const log: AuditLog = {
          ...data,
          id: uuid(),
          createdAt: new Date().toISOString(),
        };
        set(s => ({ auditLogs: [log, ...s.auditLogs].slice(0, 1000) }));
      },

      addAIReview: (data) => {
        const review: AIReview = {
          ...data,
          id: uuid(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set(s => ({ aiReviews: [review, ...s.aiReviews] }));
        return review;
      },
      updateAIReview: (id, updates) =>
        set(s => ({
          aiReviews: s.aiReviews.map(r =>
            r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
          ),
        })),
      addAISignalScore: (data) => {
        const score: AISignalScore = {
          ...data,
          id: uuid(),
          createdAt: new Date().toISOString(),
        };
        set(s => ({ aiSignalScores: [score, ...s.aiSignalScores] }));
        return score;
      },

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
          signals: mergeById([...(data.signals ?? []), ...s.signals]),
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

      clearAll: () => set({ trades: [], dailyReviews: [], weeklyReviews: [], monthlyReviews: [], dailyPlans: [], playbookSetups: [], tags: [], lastImportBatchId: null, signals: [], executionRecords: [], auditLogs: [], aiReviews: [], aiSignalScores: [] }),
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

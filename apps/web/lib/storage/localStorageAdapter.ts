/**
 * Read-oriented adapter that directly reads from the Zustand persist format.
 * Used for migration to PocketBase and as a fallback when PocketBase is unavailable.
 *
 * IMPORTANT: Write methods here bypass Zustand's in-memory state.
 * In localStorage mode, always use the Zustand store actions for writes so that
 * reactive UI updates correctly. These write methods exist for completeness and
 * are only safe to call during migration or fallback scenarios.
 */

import type { Trade, DailyPlan, PlaybookSetup, DailyReview, WeeklyReview, MonthlyReview } from '@forex-journal/shared';
import { STORAGE_KEY } from '../migration';

interface PersistedJournal {
  state: {
    trades: Trade[];
    dailyPlans: DailyPlan[];
    playbookSetups: PlaybookSetup[];
    tags: string[];
    dailyReviews: DailyReview[];
    weeklyReviews: WeeklyReview[];
    monthlyReviews: MonthlyReview[];
    riskSettings: Record<string, unknown>;
    lastImportBatchId: string | null;
  };
  version: number;
}

function readState(): PersistedJournal['state'] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedJournal;
    return parsed.state ?? null;
  } catch {
    return null;
  }
}

function writeState(updater: (s: PersistedJournal['state']) => PersistedJournal['state']): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as PersistedJournal;
    parsed.state = updater(parsed.state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch { /* silent */ }
}

export const localStorageAdapter = {
  // ── Trades ──────────────────────────────────────────────────────────────
  getTrades(): Trade[] {
    return readState()?.trades ?? [];
  },

  createTrade(trade: Trade): Trade {
    writeState(s => ({ ...s, trades: [trade, ...(s.trades ?? [])] }));
    return trade;
  },

  updateTrade(id: string, patch: Partial<Trade>): void {
    writeState(s => ({
      ...s,
      trades: (s.trades ?? []).map(t =>
        t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t
      ),
    }));
  },

  deleteTrade(id: string): void {
    writeState(s => ({ ...s, trades: (s.trades ?? []).filter(t => t.id !== id) }));
  },

  // ── Daily Plans ──────────────────────────────────────────────────────────
  getDailyPlans(): DailyPlan[] {
    return readState()?.dailyPlans ?? [];
  },

  saveDailyPlan(plan: DailyPlan): void {
    writeState(s => {
      const plans = s.dailyPlans ?? [];
      const idx = plans.findIndex(p => p.id === plan.id);
      return {
        ...s,
        dailyPlans: idx >= 0 ? plans.map((p, i) => (i === idx ? plan : p)) : [plan, ...plans],
      };
    });
  },

  // ── Playbook ─────────────────────────────────────────────────────────────
  getPlaybookSetups(): PlaybookSetup[] {
    return readState()?.playbookSetups ?? [];
  },

  savePlaybookSetup(setup: PlaybookSetup): void {
    writeState(s => {
      const setups = s.playbookSetups ?? [];
      const idx = setups.findIndex(p => p.id === setup.id);
      return {
        ...s,
        playbookSetups: idx >= 0 ? setups.map((p, i) => (i === idx ? setup : p)) : [setup, ...setups],
      };
    });
  },

  // ── Risk Settings ─────────────────────────────────────────────────────────
  getRiskSettings(): Record<string, unknown> {
    return (readState()?.riskSettings as Record<string, unknown>) ?? {};
  },

  saveRiskSettings(settings: Record<string, unknown>): void {
    writeState(s => ({ ...s, riskSettings: settings }));
  },

  // ── Tags ──────────────────────────────────────────────────────────────────
  getTags(): string[] {
    return readState()?.tags ?? [];
  },

  saveTag(tag: string): void {
    writeState(s => {
      const tags = s.tags ?? [];
      return { ...s, tags: tags.includes(tag) ? tags : [...tags, tag].sort() };
    });
  },

  removeTag(tag: string): void {
    writeState(s => ({ ...s, tags: (s.tags ?? []).filter(t => t !== tag) }));
  },

  // ── Import Batches ────────────────────────────────────────────────────────
  getImportBatches(): string[] {
    const id = readState()?.lastImportBatchId;
    return id ? [id] : [];
  },

  saveImportBatch(batchId: string): void {
    writeState(s => ({ ...s, lastImportBatchId: batchId }));
  },

  // ── Reviews ───────────────────────────────────────────────────────────────
  getDailyReviews(): DailyReview[] {
    return readState()?.dailyReviews ?? [];
  },

  getWeeklyReviews(): WeeklyReview[] {
    return readState()?.weeklyReviews ?? [];
  },

  getMonthlyReviews(): MonthlyReview[] {
    return readState()?.monthlyReviews ?? [];
  },
};

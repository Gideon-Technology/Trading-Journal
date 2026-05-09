/**
 * Journal repository — routes to the right adapter based on storage mode.
 *
 * Design:
 * - In localStorage mode: reads from localStorageAdapter (same data Zustand uses).
 *   Writes are a no-op here — use Zustand store actions directly for writes in LS mode
 *   so that in-memory UI state stays reactive.
 * - In PocketBase mode: reads/writes go to pocketbaseAdapter.
 *   If PocketBase is unavailable, reads fall back to localStorageAdapter.
 *   localStorage (via Zustand persist) always acts as a local backup because pages
 *   still call Zustand store actions alongside repository writes.
 */

import { getStorageMode } from './storageMode';
import { localStorageAdapter } from './localStorageAdapter';
import * as pb from './pocketbaseAdapter';
import type { Trade, DailyPlan, PlaybookSetup } from '@forex-journal/shared';

export { testConnection } from './pocketbaseAdapter';

// ── Trades ────────────────────────────────────────────────────────────────────

export async function getTrades(): Promise<Trade[]> {
  if (getStorageMode() === 'pocketbase') {
    try {
      return await pb.getTrades();
    } catch (err) {
      console.warn('[journalRepository] PocketBase unavailable — falling back to localStorage', err);
      return localStorageAdapter.getTrades();
    }
  }
  return localStorageAdapter.getTrades();
}

export async function getTradeById(id: string): Promise<Trade | undefined> {
  if (getStorageMode() === 'pocketbase') {
    try {
      const trade = await pb.getTradeById(id);
      if (trade) return trade;
    } catch (err) {
      console.warn('[journalRepository] PocketBase unavailable — falling back to localStorage', err);
    }
  }
  return localStorageAdapter.getTrades().find(t => t.id === id);
}

export async function createTrade(trade: Trade): Promise<void> {
  if (getStorageMode() === 'pocketbase') {
    try {
      await pb.createTrade(trade);
    } catch (err) {
      console.warn('[journalRepository] createTrade failed in PocketBase mode', err);
    }
  }
  // In localStorage mode: caller should use Zustand addTrade() directly.
  // In PocketBase mode: caller uses Zustand addTrade() for UI reactivity, then calls this for PB persistence.
}

export async function updateTrade(id: string, patch: Partial<Trade>): Promise<void> {
  if (getStorageMode() === 'pocketbase') {
    try {
      await pb.updateTrade(id, patch);
    } catch (err) {
      console.warn('[journalRepository] updateTrade failed in PocketBase mode', err);
    }
  }
}

export async function deleteTrade(id: string): Promise<void> {
  if (getStorageMode() === 'pocketbase') {
    try {
      await pb.deleteTrade(id);
    } catch (err) {
      console.warn('[journalRepository] deleteTrade failed in PocketBase mode', err);
    }
  }
}

// ── Daily Plans ───────────────────────────────────────────────────────────────

export async function getDailyPlans(): Promise<DailyPlan[]> {
  if (getStorageMode() === 'pocketbase') {
    try {
      return await pb.getDailyPlans();
    } catch {
      return localStorageAdapter.getDailyPlans();
    }
  }
  return localStorageAdapter.getDailyPlans();
}

export async function saveDailyPlan(plan: DailyPlan): Promise<void> {
  if (getStorageMode() === 'pocketbase') {
    try { await pb.saveDailyPlan(plan); } catch (err) { console.warn(err); }
  }
}

// ── Playbook ──────────────────────────────────────────────────────────────────

export async function getPlaybookSetups(): Promise<PlaybookSetup[]> {
  if (getStorageMode() === 'pocketbase') {
    try {
      return await pb.getPlaybookSetups();
    } catch {
      return localStorageAdapter.getPlaybookSetups();
    }
  }
  return localStorageAdapter.getPlaybookSetups();
}

export async function savePlaybookSetup(setup: PlaybookSetup): Promise<void> {
  if (getStorageMode() === 'pocketbase') {
    try { await pb.savePlaybookSetup(setup); } catch (err) { console.warn(err); }
  }
}

// ── Risk Settings ─────────────────────────────────────────────────────────────

export async function getRiskSettings(): Promise<Record<string, unknown>> {
  if (getStorageMode() === 'pocketbase') {
    try {
      return (await pb.getRiskSettings()) ?? localStorageAdapter.getRiskSettings();
    } catch {
      return localStorageAdapter.getRiskSettings();
    }
  }
  return localStorageAdapter.getRiskSettings();
}

export async function saveRiskSettings(settings: Record<string, unknown>): Promise<void> {
  if (getStorageMode() === 'pocketbase') {
    try { await pb.saveRiskSettings(settings); } catch (err) { console.warn(err); }
  }
}

// ── Tags ──────────────────────────────────────────────────────────────────────

export async function getTags(): Promise<string[]> {
  if (getStorageMode() === 'pocketbase') {
    try {
      return await pb.getTags();
    } catch {
      return localStorageAdapter.getTags();
    }
  }
  return localStorageAdapter.getTags();
}

export async function saveTag(tag: string): Promise<void> {
  if (getStorageMode() === 'pocketbase') {
    try { await pb.saveTag(tag); } catch (err) { console.warn(err); }
  }
}

export async function removeTag(tag: string): Promise<void> {
  if (getStorageMode() === 'pocketbase') {
    try { await pb.removeTag(tag); } catch (err) { console.warn(err); }
  }
}

// ── Import Batches ────────────────────────────────────────────────────────────

export async function getImportBatches(): Promise<string[]> {
  if (getStorageMode() === 'pocketbase') {
    try {
      return await pb.getImportBatches();
    } catch {
      return localStorageAdapter.getImportBatches();
    }
  }
  return localStorageAdapter.getImportBatches();
}

export async function saveImportBatch(batchId: string): Promise<void> {
  if (getStorageMode() === 'pocketbase') {
    try { await pb.saveImportBatch(batchId); } catch (err) { console.warn(err); }
  }
}

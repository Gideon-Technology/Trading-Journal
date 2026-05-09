/**
 * PocketBase adapter — async CRUD via PocketBase SDK.
 * All collections use the same simple schema:
 *   externalId  text  required unique  (our app-level ID)
 *   data        json  required          (full object as JSON blob)
 *   createdAtOriginal  text  optional
 *   updatedAtOriginal  text  optional
 */

import { pb } from '../pocketbase';
import type { Trade, DailyPlan, PlaybookSetup, DailyReview, WeeklyReview, MonthlyReview, Signal, AutomationRules, ExecutionRecord, AuditLog, AIReview } from '@forex-journal/shared';
import type { RecordModel } from 'pocketbase';

// ── Generic helpers ──────────────────────────────────────────────────────────

export async function testConnection(): Promise<boolean> {
  try {
    await pb.health.check();
    return true;
  } catch {
    return false;
  }
}

async function getRecords(collection: string): Promise<RecordModel[]> {
  const result = await pb.collection(collection).getFullList({ sort: '-createdAtOriginal' });
  return result;
}

async function getRecordByExternalId(collection: string, externalId: string): Promise<RecordModel | null> {
  try {
    const result = await pb.collection(collection).getFirstListItem(`externalId="${externalId}"`);
    return result;
  } catch {
    return null;
  }
}

async function upsertRecord(
  collection: string,
  externalId: string,
  data: Record<string, unknown>,
  createdAtOriginal?: string,
  updatedAtOriginal?: string
): Promise<RecordModel> {
  const existing = await getRecordByExternalId(collection, externalId);
  const payload = {
    externalId,
    data,
    createdAtOriginal: createdAtOriginal ?? '',
    updatedAtOriginal: updatedAtOriginal ?? new Date().toISOString(),
  };
  if (existing) {
    return pb.collection(collection).update(existing.id, payload);
  }
  return pb.collection(collection).create(payload);
}

async function deleteRecord(collection: string, externalId: string): Promise<void> {
  const existing = await getRecordByExternalId(collection, externalId);
  if (existing) {
    await pb.collection(collection).delete(existing.id);
  }
}

// ── Trade domain methods ──────────────────────────────────────────────────────

const TRADES = 'trades';

export async function getTrades(): Promise<Trade[]> {
  const records = await getRecords(TRADES);
  return records.map(r => r['data'] as Trade);
}

export async function getTradeById(id: string): Promise<Trade | null> {
  const record = await getRecordByExternalId(TRADES, id);
  return record ? (record['data'] as Trade) : null;
}

export async function createTrade(trade: Trade): Promise<Trade> {
  await upsertRecord(TRADES, trade.id, trade as unknown as Record<string, unknown>, trade.createdAt, trade.updatedAt);
  return trade;
}

export async function updateTrade(id: string, patch: Partial<Trade>): Promise<void> {
  const existing = await getRecordByExternalId(TRADES, id);
  if (!existing) return;
  const merged = { ...(existing['data'] as Trade), ...patch, updatedAt: new Date().toISOString() };
  await pb.collection(TRADES).update(existing.id, {
    data: merged,
    updatedAtOriginal: merged.updatedAt,
  });
}

export async function deleteTrade(id: string): Promise<void> {
  await deleteRecord(TRADES, id);
}

// ── Daily Plans ───────────────────────────────────────────────────────────────

const DAILY_PLANS = 'daily_plans';

export async function getDailyPlans(): Promise<DailyPlan[]> {
  const records = await getRecords(DAILY_PLANS);
  return records.map(r => r['data'] as DailyPlan);
}

export async function saveDailyPlan(plan: DailyPlan): Promise<void> {
  await upsertRecord(DAILY_PLANS, plan.id, plan as unknown as Record<string, unknown>, plan.createdAt);
}

// ── Playbook ──────────────────────────────────────────────────────────────────

const PLAYBOOK = 'playbook_setups';

export async function getPlaybookSetups(): Promise<PlaybookSetup[]> {
  const records = await getRecords(PLAYBOOK);
  return records.map(r => r['data'] as PlaybookSetup);
}

export async function savePlaybookSetup(setup: PlaybookSetup): Promise<void> {
  await upsertRecord(PLAYBOOK, setup.id, setup as unknown as Record<string, unknown>, setup.createdAt, setup.updatedAt);
}

// ── Risk Settings ─────────────────────────────────────────────────────────────

const RISK = 'risk_settings';

export async function getRiskSettings(): Promise<Record<string, unknown> | null> {
  const records = await getRecords(RISK);
  if (!records.length) return null;
  return records[0]['data'] as Record<string, unknown>;
}

export async function saveRiskSettings(settings: Record<string, unknown>): Promise<void> {
  await upsertRecord(RISK, 'singleton', settings);
}

// ── Tags ──────────────────────────────────────────────────────────────────────

const TAGS = 'tags';

export async function getTags(): Promise<string[]> {
  const records = await getRecords(TAGS);
  return records.map(r => (r['data'] as { tag: string }).tag).filter(Boolean);
}

export async function saveTag(tag: string): Promise<void> {
  const slug = tag.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  await upsertRecord(TAGS, slug, { tag });
}

export async function removeTag(tag: string): Promise<void> {
  const slug = tag.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  await deleteRecord(TAGS, slug);
}

// ── Import Batches ────────────────────────────────────────────────────────────

const BATCHES = 'import_batches';

export async function getImportBatches(): Promise<string[]> {
  const records = await getRecords(BATCHES);
  return records.map(r => (r['data'] as { batchId: string }).batchId).filter(Boolean);
}

export async function saveImportBatch(batchId: string): Promise<void> {
  await upsertRecord(BATCHES, batchId, { batchId });
}

// ── Reviews ───────────────────────────────────────────────────────────────────

export async function getDailyReviews(): Promise<DailyReview[]> {
  const records = await getRecords('daily_reviews');
  return records.map(r => r['data'] as DailyReview);
}

export async function saveDailyReview(review: DailyReview): Promise<void> {
  await upsertRecord('daily_reviews', review.id, review as unknown as Record<string, unknown>);
}

export async function getWeeklyReviews(): Promise<WeeklyReview[]> {
  const records = await getRecords('weekly_reviews');
  return records.map(r => r['data'] as WeeklyReview);
}

export async function saveWeeklyReview(review: WeeklyReview): Promise<void> {
  await upsertRecord('weekly_reviews', review.id, review as unknown as Record<string, unknown>);
}

export async function getMonthlyReviews(): Promise<MonthlyReview[]> {
  const records = await getRecords('monthly_reviews');
  return records.map(r => r['data'] as MonthlyReview);
}

export async function saveMonthlyReview(review: MonthlyReview): Promise<void> {
  await upsertRecord('monthly_reviews', review.id, review as unknown as Record<string, unknown>);
}

// ── Signals ───────────────────────────────────────────────────────────────────

const SIGNALS = 'signals';

export async function getSignals(): Promise<Signal[]> {
  const records = await getRecords(SIGNALS);
  return records.map(r => r['data'] as Signal);
}

export async function saveSignal(signal: Signal): Promise<void> {
  await upsertRecord(SIGNALS, signal.id, signal as unknown as Record<string, unknown>, signal.createdAt, signal.updatedAt);
}

export async function deleteSignal(id: string): Promise<void> {
  await deleteRecord(SIGNALS, id);
}

// ── Automation Rules ──────────────────────────────────────────────────────────

const AUTOMATION_RULES = 'automation_rules';

export async function getAutomationRules(): Promise<AutomationRules | null> {
  const records = await getRecords(AUTOMATION_RULES);
  if (!records.length) return null;
  return records[0]['data'] as AutomationRules;
}

export async function saveAutomationRules(rules: AutomationRules): Promise<void> {
  await upsertRecord(AUTOMATION_RULES, 'singleton', rules as unknown as Record<string, unknown>);
}

// ── AI Reviews ────────────────────────────────────────────────────────────────

const AI_REVIEWS = 'ai_reviews';

export async function getAIReviews(): Promise<AIReview[]> {
  const records = await getRecords(AI_REVIEWS);
  return records.map(r => r['data'] as AIReview);
}

export async function saveAIReview(review: AIReview): Promise<void> {
  await upsertRecord(AI_REVIEWS, review.id, review as unknown as Record<string, unknown>, review.createdAt, review.updatedAt);
}

// ── Execution Records ─────────────────────────────────────────────────────────

const EXECUTION_RECORDS = 'execution_records';

export async function getExecutionRecords(): Promise<ExecutionRecord[]> {
  const records = await getRecords(EXECUTION_RECORDS);
  return records.map(r => r['data'] as ExecutionRecord);
}

export async function saveExecutionRecord(record: ExecutionRecord): Promise<void> {
  await upsertRecord(EXECUTION_RECORDS, record.id, record as unknown as Record<string, unknown>, record.createdAt, record.updatedAt);
}

// ── Audit Logs ────────────────────────────────────────────────────────────────

const AUDIT_LOGS = 'audit_logs';

export async function getAuditLogs(): Promise<AuditLog[]> {
  const records = await getRecords(AUDIT_LOGS);
  return records.map(r => r['data'] as AuditLog);
}

export async function saveAuditLog(log: AuditLog): Promise<void> {
  await upsertRecord(AUDIT_LOGS, log.id, log as unknown as Record<string, unknown>, log.createdAt);
}

// Re-export generic helpers for use in migration/settings
export { getRecords, getRecordByExternalId, upsertRecord, deleteRecord };

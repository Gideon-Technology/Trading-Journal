/**
 * One-shot migration: copies all data from localStorage (gtrade.journal)
 * into PocketBase collections. Safe to run multiple times — duplicates are
 * detected by externalId and skipped. Original localStorage data is never
 * touched.
 */

import { localStorageAdapter } from './localStorageAdapter';
import { upsertRecord, getRecordByExternalId } from './pocketbaseAdapter';
import { testConnection } from './pocketbaseAdapter';

type CollectionResult = {
  found: number;
  migrated: number;
  skipped: number;
  errors: number;
};

export interface MigrationSummary {
  success: boolean;
  collections: {
    trades: CollectionResult;
    daily_plans: CollectionResult;
    playbook_setups: CollectionResult;
    risk_settings: CollectionResult;
    tags: CollectionResult;
    import_batches: CollectionResult;
    daily_reviews: CollectionResult;
    weekly_reviews: CollectionResult;
    monthly_reviews: CollectionResult;
  };
  errors: string[];
}

function emptyResult(): CollectionResult {
  return { found: 0, migrated: 0, skipped: 0, errors: 0 };
}

async function migrateCollection<T extends { id?: string; createdAt?: string; updatedAt?: string }>(
  collection: string,
  items: T[],
  getExternalId: (item: T) => string
): Promise<CollectionResult> {
  const result = emptyResult();
  result.found = items.length;

  for (const item of items) {
    const externalId = getExternalId(item);
    try {
      const existing = await getRecordByExternalId(collection, externalId);
      if (existing) {
        result.skipped++;
        continue;
      }
      await upsertRecord(
        collection,
        externalId,
        item as unknown as Record<string, unknown>,
        (item as { createdAt?: string }).createdAt,
        (item as { updatedAt?: string }).updatedAt
      );
      result.migrated++;
    } catch (err) {
      result.errors++;
      console.error(`[migration] Failed to migrate ${collection}/${externalId}:`, err);
    }
  }

  return result;
}

export async function migrateLocalStorageToPocketBase(): Promise<MigrationSummary> {
  const errors: string[] = [];

  const connected = await testConnection();
  if (!connected) {
    return {
      success: false,
      collections: {
        trades: emptyResult(),
        daily_plans: emptyResult(),
        playbook_setups: emptyResult(),
        risk_settings: emptyResult(),
        tags: emptyResult(),
        import_batches: emptyResult(),
        daily_reviews: emptyResult(),
        weekly_reviews: emptyResult(),
        monthly_reviews: emptyResult(),
      },
      errors: ['PocketBase is not reachable. Start it with: docker compose up -d'],
    };
  }

  // Read all data from localStorage
  const trades = localStorageAdapter.getTrades();
  const dailyPlans = localStorageAdapter.getDailyPlans();
  const playbookSetups = localStorageAdapter.getPlaybookSetups();
  const tags = localStorageAdapter.getTags();
  const importBatches = localStorageAdapter.getImportBatches();
  const dailyReviews = localStorageAdapter.getDailyReviews();
  const weeklyReviews = localStorageAdapter.getWeeklyReviews();
  const monthlyReviews = localStorageAdapter.getMonthlyReviews();

  // Risk settings is a singleton
  const riskSettings = localStorageAdapter.getRiskSettings();
  const hasRisk = Object.keys(riskSettings).length > 0;

  const [
    tradesResult,
    plansResult,
    playbookResult,
    dailyReviewsResult,
    weeklyReviewsResult,
    monthlyReviewsResult,
  ] = await Promise.all([
    migrateCollection('trades', trades, t => t.id),
    migrateCollection('daily_plans', dailyPlans, p => p.id),
    migrateCollection('playbook_setups', playbookSetups, s => s.id),
    migrateCollection('daily_reviews', dailyReviews, r => r.id),
    migrateCollection('weekly_reviews', weeklyReviews, r => r.id),
    migrateCollection('monthly_reviews', monthlyReviews, r => r.id),
  ]);

  // Risk settings singleton
  let riskResult = emptyResult();
  if (hasRisk) {
    riskResult.found = 1;
    try {
      const existing = await getRecordByExternalId('risk_settings', 'singleton');
      if (existing) {
        riskResult.skipped = 1;
      } else {
        await upsertRecord('risk_settings', 'singleton', riskSettings);
        riskResult.migrated = 1;
      }
    } catch (err) {
      riskResult.errors = 1;
      errors.push(`risk_settings: ${String(err)}`);
    }
  }

  // Tags — use slug as externalId
  let tagsResult = emptyResult();
  tagsResult.found = tags.length;
  for (const tag of tags) {
    const slug = tag.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    try {
      const existing = await getRecordByExternalId('tags', slug);
      if (existing) { tagsResult.skipped++; continue; }
      await upsertRecord('tags', slug, { tag });
      tagsResult.migrated++;
    } catch (err) {
      tagsResult.errors++;
      errors.push(`tags/${tag}: ${String(err)}`);
    }
  }

  // Import batches
  let batchesResult = emptyResult();
  batchesResult.found = importBatches.length;
  for (const batchId of importBatches) {
    try {
      const existing = await getRecordByExternalId('import_batches', batchId);
      if (existing) { batchesResult.skipped++; continue; }
      await upsertRecord('import_batches', batchId, { batchId });
      batchesResult.migrated++;
    } catch (err) {
      batchesResult.errors++;
      errors.push(`import_batches/${batchId}: ${String(err)}`);
    }
  }

  const allResults = [tradesResult, plansResult, playbookResult, riskResult, tagsResult, batchesResult, dailyReviewsResult, weeklyReviewsResult, monthlyReviewsResult];
  const anyError = allResults.some(r => r.errors > 0) || errors.length > 0;

  return {
    success: !anyError,
    collections: {
      trades: tradesResult,
      daily_plans: plansResult,
      playbook_setups: playbookResult,
      risk_settings: riskResult,
      tags: tagsResult,
      import_batches: batchesResult,
      daily_reviews: dailyReviewsResult,
      weekly_reviews: weeklyReviewsResult,
      monthly_reviews: monthlyReviewsResult,
    },
    errors,
  };
}

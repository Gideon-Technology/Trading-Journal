'use client';

import { useRef, useState, useEffect } from 'react';
import { useJournalStore } from '@/lib/store';
import { tradesToCSV, exportJSON, downloadFile } from '@forex-journal/shared';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { BrokerImport } from '@/components/BrokerImport';
import { format } from 'date-fns';
import { getStorageMode, setStorageMode, isPocketBaseMode, type StorageMode } from '@/lib/storage/storageMode';
import { testConnection } from '@/lib/storage/pocketbaseAdapter';
import { migrateLocalStorageToPocketBase, type MigrationSummary } from '@/lib/storage/migrateLocalStorageToPocketBase';

export default function Settings() {
  const { trades, dailyReviews, weeklyReviews, monthlyReviews, importData, clearAll, undoLastImport, lastImportBatchId } = useJournalStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const stamp = format(new Date(), 'yyyy-MM-dd');

  // ── PocketBase state ────────────────────────────────────────────────────
  const [storageMode, setMode] = useState<StorageMode>('localStorage');
  const [pbStatus, setPbStatus] = useState<'unknown' | 'connected' | 'unavailable'>('unknown');
  const [pbTesting, setPbTesting] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationSummary, setMigrationSummary] = useState<MigrationSummary | null>(null);

  useEffect(() => {
    setMode(getStorageMode());
  }, []);

  const handleTestConnection = async () => {
    setPbTesting(true);
    setPbStatus('unknown');
    const ok = await testConnection();
    setPbStatus(ok ? 'connected' : 'unavailable');
    setPbTesting(false);
  };

  const handleMigrate = async () => {
    if (!confirm('Copy all localStorage data to PocketBase? This will not delete your localStorage data.')) return;
    setMigrating(true);
    setMigrationSummary(null);
    const summary = await migrateLocalStorageToPocketBase();
    setMigrationSummary(summary);
    setMigrating(false);
  };

  const handleSwitchMode = (mode: StorageMode) => {
    if (mode === 'pocketbase' && pbStatus !== 'connected') {
      alert('Test the PocketBase connection first to confirm it is running.');
      return;
    }
    setStorageMode(mode);
    setMode(mode);
  };

  // ── Export / Import ─────────────────────────────────────────────────────
  const exportAllJSON = () => {
    // TODO: If PB mode, export from PB records instead of Zustand state
    const data = { trades, dailyReviews, weeklyReviews, monthlyReviews };
    downloadFile(exportJSON(data), `fx-journal-${stamp}.json`, 'application/json');
  };

  const exportTradesCSV = () => {
    downloadFile(tradesToCSV(trades), `fx-trades-${stamp}.csv`, 'text/csv');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        const result = importData(data);
        alert(`Import successful. Added ${result.imported} trades${result.skipped > 0 ? `, skipped ${result.skipped} duplicates` : ''}.`);
      } catch {
        alert('Import failed — invalid JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleUndoImport = () => {
    if (!lastImportBatchId) return;
    if (!confirm('Remove all trades from the last CSV import? This cannot be undone.')) return;
    const count = undoLastImport();
    alert(`Removed ${count} trade${count !== 1 ? 's' : ''} from last import.`);
  };

  const handleClear = () => {
    if (!confirm('Delete ALL journal data? This cannot be undone.')) return;
    if (!confirm('Are you absolutely sure? All trades and reviews will be lost.')) return;
    clearAll();
    alert('Journal cleared.');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold">Import / Export</h1>
        <p className="text-muted text-sm">All data is stored locally in your browser. Export regularly to back up.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Trades', value: trades.length },
          { label: 'Daily Reviews', value: dailyReviews.length },
          { label: 'Weekly Reviews', value: weeklyReviews.length },
          { label: 'Monthly Reviews', value: monthlyReviews.length },
        ].map(s => (
          <div key={s.label} className="bg-bg-card border border-bg-border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold font-mono text-accent">{s.value}</p>
            <p className="text-muted text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── LOCAL DATABASE ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div>
            <p className="font-semibold text-sm">Local Database</p>
            <p className="text-muted text-xs mt-0.5">Optional PocketBase database running via Docker on your machine</p>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">

          {/* Status row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-bg-elevated rounded-lg border border-bg-border">
              <p className="text-muted text-xs mb-1">PocketBase Status</p>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${pbStatus === 'connected' ? 'bg-win animate-none' : pbStatus === 'unavailable' ? 'bg-loss' : 'bg-muted'}`} />
                <span className={`text-sm font-medium ${pbStatus === 'connected' ? 'text-win' : pbStatus === 'unavailable' ? 'text-loss' : 'text-muted'}`}>
                  {pbStatus === 'connected' ? 'Connected' : pbStatus === 'unavailable' ? 'Not Running' : 'Not Tested'}
                </span>
              </div>
            </div>
            <div className="p-3 bg-bg-elevated rounded-lg border border-bg-border">
              <p className="text-muted text-xs mb-1">Storage Mode</p>
              <span className={`text-sm font-medium ${storageMode === 'pocketbase' ? 'text-accent' : 'text-text'}`}>
                {storageMode === 'pocketbase' ? 'PocketBase (local DB)' : 'localStorage (browser)'}
              </span>
            </div>
          </div>

          {/* Warnings */}
          {pbStatus === 'unavailable' && (
            <div className="p-3 rounded-lg bg-loss/5 border border-loss/20">
              <p className="text-loss text-xs font-medium">PocketBase is not running.</p>
              <p className="text-muted text-xs mt-0.5 font-mono">docker compose up -d</p>
            </div>
          )}
          {storageMode === 'pocketbase' && pbStatus !== 'connected' && (
            <div className="p-3 rounded-lg bg-breakeven/5 border border-breakeven/20">
              <p className="text-breakeven text-xs">PocketBase mode is active, but connection has not been verified. Test the connection to confirm PocketBase is running.</p>
            </div>
          )}
          {storageMode === 'pocketbase' && !migrationSummary && trades.length > 0 && (
            <div className="p-3 rounded-lg bg-breakeven/5 border border-breakeven/20">
              <p className="text-breakeven text-xs">PocketBase mode is active, but your existing localStorage data may not be migrated yet. Click "Migrate localStorage → PocketBase" to copy your data.</p>
            </div>
          )}

          {/* Docker instructions */}
          <div className="p-3 bg-bg-elevated rounded-lg border border-bg-border">
            <p className="text-text text-xs font-semibold mb-2">Docker commands</p>
            <div className="space-y-1 font-mono text-xs text-muted">
              <p><span className="text-accent">Start:</span> docker compose up -d</p>
              <p><span className="text-accent">Stop:</span> docker compose down</p>
              <p><span className="text-accent">Logs:</span> docker logs -f gtrade-pocketbase</p>
              <p><span className="text-accent">Admin:</span> http://127.0.0.1:8090/_/</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={handleTestConnection} disabled={pbTesting}>
              {pbTesting ? 'Testing…' : 'Test Connection'}
            </Button>
            <Button
              variant="secondary"
              onClick={handleMigrate}
              disabled={migrating || pbStatus !== 'connected'}
            >
              {migrating ? 'Migrating…' : 'Migrate localStorage → PocketBase'}
            </Button>
          </div>

          {/* Mode switch */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => handleSwitchMode('localStorage')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${storageMode === 'localStorage' ? 'bg-accent text-white border-accent' : 'bg-bg-elevated text-muted border-bg-border hover:border-accent/50'}`}
            >
              Use localStorage
            </button>
            <button
              onClick={() => handleSwitchMode('pocketbase')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${storageMode === 'pocketbase' ? 'bg-accent text-white border-accent' : 'bg-bg-elevated text-muted border-bg-border hover:border-accent/50'}`}
            >
              Use PocketBase
            </button>
          </div>

          {/* Migration summary */}
          {migrationSummary && (
            <div className={`p-4 rounded-lg border ${migrationSummary.success ? 'bg-win/5 border-win/30' : 'bg-loss/5 border-loss/30'}`}>
              <p className={`text-sm font-semibold mb-3 ${migrationSummary.success ? 'text-win' : 'text-loss'}`}>
                {migrationSummary.success ? '✓ Migration complete' : '⚠ Migration completed with errors'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(migrationSummary.collections) as [string, { found: number; migrated: number; skipped: number; errors: number }][]).map(([name, r]) => (
                  r.found > 0 && (
                    <div key={name} className="text-xs">
                      <span className="text-muted font-medium">{name.replace('_', ' ')}: </span>
                      <span className="text-win">{r.migrated} migrated</span>
                      {r.skipped > 0 && <span className="text-muted"> · {r.skipped} skipped</span>}
                      {r.errors > 0 && <span className="text-loss"> · {r.errors} errors</span>}
                    </div>
                  )
                ))}
              </div>
              {migrationSummary.errors.length > 0 && (
                <div className="mt-3 space-y-1">
                  {migrationSummary.errors.map((e, i) => (
                    <p key={i} className="text-loss text-xs font-mono">{e}</p>
                  ))}
                </div>
              )}
              {migrationSummary.success && (
                <p className="text-muted text-xs mt-3">localStorage data is untouched. You can now switch to PocketBase mode.</p>
              )}
            </div>
          )}

          {/* Collection setup guide */}
          <details className="group">
            <summary className="text-accent text-xs cursor-pointer hover:underline select-none">
              How to create PocketBase collections (required once)
            </summary>
            <div className="mt-3 p-3 bg-bg-elevated rounded-lg border border-bg-border text-xs space-y-2">
              <p className="text-text font-medium">1. Open <span className="font-mono">http://127.0.0.1:8090/_/</span> and create an admin account.</p>
              <p className="text-text font-medium">2. Create these collections with identical schema:</p>
              <p className="font-mono text-muted">trades · daily_plans · playbook_setups · risk_settings · tags · import_batches · daily_reviews · weekly_reviews · monthly_reviews</p>
              <p className="text-text font-medium">3. Each collection needs these fields:</p>
              <div className="space-y-0.5 font-mono text-muted">
                <p>externalId — Text — required, unique</p>
                <p>data — JSON — required</p>
                <p>createdAtOriginal — Text — optional</p>
                <p>updatedAtOriginal — Text — optional</p>
              </div>
              <p className="text-muted">4. Leave auth and rules at default (no auth required for local use).</p>
            </div>
          </details>
        </CardBody>
      </Card>

      {/* Export */}
      <Card>
        <CardHeader><p className="font-semibold text-sm">Export Data</p></CardHeader>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-bg-elevated rounded-lg border border-bg-border">
            <div>
              <p className="text-text text-sm font-medium">Full Journal Backup (JSON)</p>
              <p className="text-muted text-xs">All trades, reviews, and notes. Use to restore or import into another device.</p>
            </div>
            <Button onClick={exportAllJSON} disabled={!trades.length && !dailyReviews.length}>
              Export JSON
            </Button>
          </div>
          <div className="flex items-center justify-between p-3 bg-bg-elevated rounded-lg border border-bg-border">
            <div>
              <p className="text-text text-sm font-medium">Trade Log (CSV)</p>
              <p className="text-muted text-xs">Open in Excel or Google Sheets. Includes all trade fields.</p>
            </div>
            <Button variant="secondary" onClick={exportTradesCSV} disabled={!trades.length}>
              Export CSV
            </Button>
          </div>
          <div className="flex items-center justify-between p-3 bg-bg-elevated rounded-lg border border-bg-border">
            <div>
              <p className="text-text text-sm font-medium">Extension / JSON Backup</p>
              <p className="text-muted text-xs">Import a JSON file exported from this app or the Chrome extension.</p>
            </div>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              Import JSON
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Import */}
      <Card>
        <CardHeader><p className="font-semibold text-sm">Import / Restore (JSON)</p></CardHeader>
        <CardBody className="space-y-4">
          <p className="text-muted text-sm">Import a JSON file exported from this app or the Chrome extension. New trades are merged with existing data — no duplicates.</p>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-bg-border rounded-lg p-8 text-center cursor-pointer hover:border-accent transition-colors group"
          >
            <p className="text-4xl mb-2">⬆</p>
            <p className="text-text text-sm font-medium group-hover:text-accent transition-colors">Click to select a JSON file</p>
            <p className="text-muted text-xs mt-1">fx-journal-YYYY-MM-DD.json</p>
          </div>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </CardBody>
      </Card>

      {/* Broker CSV import */}
      <Card>
        <CardHeader>
          <div>
            <p className="font-semibold text-sm">Import from Broker (CSV)</p>
            <p className="text-muted text-xs mt-0.5">Supports Topstep / NinjaTrader, MT4/5, Tradovate, IBKR, TradeStation</p>
          </div>
        </CardHeader>
        <CardBody>
          <BrokerImport />
        </CardBody>
      </Card>

      {/* Danger zone */}
      <Card>
        <CardHeader><p className="font-semibold text-sm text-loss">Danger Zone</p></CardHeader>
        <CardBody className="space-y-3">
          {lastImportBatchId && (
            <div className="flex items-center justify-between p-3 bg-breakeven/5 rounded-lg border border-breakeven/20">
              <div>
                <p className="text-text text-sm font-medium">Undo Last Import</p>
                <p className="text-muted text-xs">Remove all trades added in the most recent CSV import.</p>
              </div>
              <Button variant="secondary" onClick={handleUndoImport}>
                Undo Import
              </Button>
            </div>
          )}
          <div className="flex items-center justify-between p-3 bg-loss/5 rounded-lg border border-loss/20">
            <div>
              <p className="text-text text-sm font-medium">Clear All Data</p>
              <p className="text-muted text-xs">Permanently delete all trades and reviews. Export a backup first.</p>
            </div>
            <Button variant="danger" onClick={handleClear}>
              Clear All
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* About */}
      <Card>
        <CardHeader><p className="font-semibold text-sm">About</p></CardHeader>
        <CardBody className="text-sm text-muted space-y-1">
          <p>G-Trade — Professional Forex Trading Journal</p>
          <p>Built with Next.js 14 · TypeScript · Tailwind CSS · Recharts · Zustand · PocketBase</p>
          <p>All data stored locally. No account required.</p>
          <p className="text-xs pt-2">Strategy: Liquidity Sweep → FVG → S/R Retest → Rejection Candle → Entry after candle close</p>
        </CardBody>
      </Card>
    </div>
  );
}

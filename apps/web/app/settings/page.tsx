'use client';

import { useRef } from 'react';
import { useJournalStore } from '@/lib/store';
import { tradesToCSV, exportJSON, downloadFile } from '@forex-journal/shared';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { format } from 'date-fns';

export default function Settings() {
  const { trades, dailyReviews, weeklyReviews, monthlyReviews, importData, clearAll } = useJournalStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const stamp = format(new Date(), 'yyyy-MM-dd');

  const exportAllJSON = () => {
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
        importData(data);
        alert(`Import successful. Merged ${data.trades?.length ?? 0} trades.`);
      } catch {
        alert('Import failed — invalid JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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
              <p className="text-text text-sm font-medium">Extension Export</p>
              <p className="text-muted text-xs">If you logged trades in the Chrome extension, import the JSON file here.</p>
            </div>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              Import from Extension
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Import */}
      <Card>
        <CardHeader><p className="font-semibold text-sm">Import / Restore</p></CardHeader>
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

      {/* Danger zone */}
      <Card>
        <CardHeader><p className="font-semibold text-sm text-loss">Danger Zone</p></CardHeader>
        <CardBody>
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
          <p>Built with Next.js 14 · TypeScript · Tailwind CSS · Recharts · Zustand</p>
          <p>All data stored locally in your browser via localStorage. No account required.</p>
          <p className="text-xs pt-2">Strategy: Liquidity Sweep → FVG → S/R Retest → Rejection Candle → Entry after candle close</p>
        </CardBody>
      </Card>
    </div>
  );
}

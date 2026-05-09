'use client';

import { useState, useRef } from 'react';
import { previewBrokerImport, parsedRowToTrade, BROKER_LABELS } from '@forex-journal/shared';
import type { ImportPreview } from '@forex-journal/shared';
import { useJournalStore } from '@/lib/store';
import { formatCurrency, outcomeBg } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

const SUPPORTED = [
  { name: 'NinjaTrader / Topstep / Apex', steps: 'Control Center → Account Performance → Trades tab → Export → CSV' },
  { name: 'MetaTrader 4 / 5', steps: 'Account History tab → right-click → Save as Report (CSV/HTML, use CSV)' },
  { name: 'Tradovate', steps: 'Dashboard → Trade History → Export CSV' },
  { name: 'Interactive Brokers', steps: 'Reports → Activity → Flex Query → Trades section → CSV' },
  { name: 'TradeStation', steps: 'Trade Activity → Export → CSV' },
];

function StatusBadge({ outcome }: { outcome: string }) {
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${outcomeBg(outcome as 'WIN' | 'LOSS' | 'BREAKEVEN')}`}>
      {outcome}
    </span>
  );
}

export function BrokerImport() {
  const addTrade = useJournalStore(s => s.addTrade);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(0);
  const [showGuide, setShowGuide] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = previewBrokerImport(reader.result as string);
      setPreview(result);
      setDone(0);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = previewBrokerImport(reader.result as string);
      setPreview(result);
      setDone(0);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!preview) return;
    setImporting(true);
    let count = 0;
    for (const row of preview.rows) {
      try {
        addTrade(parsedRowToTrade(row));
        count++;
      } catch { /* skip malformed rows */ }
    }
    setDone(count);
    setPreview(null);
    setImporting(false);
  };

  const wins = preview?.rows.filter(r => r.outcome === 'WIN').length ?? 0;
  const losses = preview?.rows.filter(r => r.outcome === 'LOSS').length ?? 0;
  const totalPnL = preview?.rows.reduce((s, r) => s + r.profitLossDollar, 0) ?? 0;

  return (
    <div className="space-y-4">
      {done > 0 && (
        <div className="p-4 rounded-lg bg-win/10 border border-win/30 text-win text-sm font-medium">
          ✓ Imported {done} trade{done !== 1 ? 's' : ''} successfully. They now appear in Trade History tagged as "imported".
        </div>
      )}

      {/* Supported brokers toggle */}
      <button
        onClick={() => setShowGuide(g => !g)}
        className="text-accent text-xs hover:underline"
      >
        {showGuide ? '▲ Hide' : '▼ Show'} how to export from your broker
      </button>
      {showGuide && (
        <div className="bg-bg-elevated rounded-lg border border-bg-border p-4 space-y-2">
          {SUPPORTED.map(b => (
            <div key={b.name} className="text-sm">
              <span className="text-text font-medium">{b.name}: </span>
              <span className="text-muted text-xs">{b.steps}</span>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {!preview && (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-bg-border rounded-lg p-8 text-center cursor-pointer hover:border-accent transition-colors group"
        >
          <p className="text-3xl mb-2">📂</p>
          <p className="text-text text-sm font-medium group-hover:text-accent transition-colors">
            Drop your broker CSV here, or click to select
          </p>
          <p className="text-muted text-xs mt-1">
            NinjaTrader · MT4/MT5 · Tradovate · IBKR · TradeStation
          </p>
        </div>
      )}
      <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />

      {/* Preview */}
      {preview && (
        <div className="space-y-4">
          {/* Detected broker banner */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-accent/10 border border-accent/30">
            <div>
              <p className="text-accent text-sm font-semibold">
                {preview.broker === 'generic' ? '⚠ Unknown format' : `✓ Detected: ${preview.brokerLabel}`}
              </p>
              <p className="text-muted text-xs mt-0.5">
                {preview.rows.length} trades ready to import
                {preview.skipped > 0 && ` · ${preview.skipped} rows skipped (incomplete data)`}
              </p>
            </div>
            <button onClick={() => setPreview(null)} className="text-muted hover:text-text text-sm">✕</button>
          </div>

          {/* Errors */}
          {preview.errors.length > 0 && (
            <div className="p-3 rounded-lg bg-loss/10 border border-loss/30">
              {preview.errors.map(e => <p key={e} className="text-loss text-xs">{e}</p>)}
            </div>
          )}

          {/* Summary stats */}
          {preview.rows.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-bg-elevated rounded-lg border border-bg-border p-3 text-center">
                <p className="text-2xl font-bold font-mono text-win">{wins}</p>
                <p className="text-muted text-xs">Wins</p>
              </div>
              <div className="bg-bg-elevated rounded-lg border border-bg-border p-3 text-center">
                <p className="text-2xl font-bold font-mono text-loss">{losses}</p>
                <p className="text-muted text-xs">Losses</p>
              </div>
              <div className="bg-bg-elevated rounded-lg border border-bg-border p-3 text-center">
                <p className={`text-2xl font-bold font-mono ${totalPnL >= 0 ? 'text-win' : 'text-loss'}`}>
                  {formatCurrency(totalPnL)}
                </p>
                <p className="text-muted text-xs">Total P&L</p>
              </div>
            </div>
          )}

          {/* Preview table */}
          {preview.rows.length > 0 && (
            <div className="rounded-lg border border-bg-border overflow-hidden">
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-xs">
                  <thead className="bg-bg-elevated sticky top-0">
                    <tr className="text-muted border-b border-bg-border">
                      {['Date', 'Instrument', 'Dir', 'Size', 'Entry', 'P&L', 'Outcome'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, i) => (
                      <tr key={i} className="border-b border-bg-border hover:bg-bg-elevated transition-colors">
                        <td className="px-3 py-2 font-mono text-muted whitespace-nowrap">{row.date}</td>
                        <td className="px-3 py-2 font-semibold text-text whitespace-nowrap">{row.instrument}</td>
                        <td className="px-3 py-2">
                          <span className={row.direction === 'LONG' ? 'text-win font-mono font-bold' : 'text-loss font-mono font-bold'}>
                            {row.direction}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono">{row.positionSize}</td>
                        <td className="px-3 py-2 font-mono">{row.entryPrice}</td>
                        <td className={`px-3 py-2 font-mono font-semibold ${row.profitLossDollar >= 0 ? 'text-win' : 'text-loss'}`}>
                          {formatCurrency(row.profitLossDollar)}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge outcome={row.outcome} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Note about skeleton trades */}
          <p className="text-muted text-xs">
            Imported trades will have financial data filled in automatically. Open each trade in Trade History to add setup type, checklist, psychology notes and screenshots.
          </p>

          {/* Actions */}
          {preview.rows.length > 0 && (
            <div className="flex gap-3">
              <Button onClick={handleImport} disabled={importing}>
                {importing ? 'Importing…' : `Import ${preview.rows.length} trades`}
              </Button>
              <Button variant="secondary" onClick={() => setPreview(null)}>Cancel</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

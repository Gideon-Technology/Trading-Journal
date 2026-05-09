'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useJournalStore } from '../../../lib/store';
import { parseTradingViewAlert, calculateSignalScore } from '@forex-journal/shared';

const EXAMPLE_ALERT = `GTRADE_SIGNAL|symbol=NQ|tf=5M|direction=BUY|entry=21350|sl=21310|tp1=21430|tp2=21470|tp3=21550|setup=Liquidity Sweep + FVG Retest|liq=true|fvg=true|br=true|sr=true|score=8|session=NY|bias=Bullish`;

export default function ImportTradingViewPage() {
  const router = useRouter();
  const { addSignal, addAuditLog } = useJournalStore();
  const [raw, setRaw] = useState('');
  const [parsed, setParsed] = useState<ReturnType<typeof parseTradingViewAlert> | null>(null);
  const [saved, setSaved] = useState(false);

  function handleParse() {
    const result = parseTradingViewAlert(raw.trim());
    setParsed(result);
    setSaved(false);
  }

  function handleSave() {
    if (!parsed?.valid || !parsed.signal) return;
    const score = calculateSignalScore(parsed.signal);
    const signal = addSignal({
      ...parsed.signal,
      symbol: parsed.signal.symbol!,
      assetClass: parsed.signal.assetClass!,
      direction: parsed.signal.direction!,
      timeframe: parsed.signal.timeframe!,
      signalType: parsed.signal.signalType ?? 'TV Alert',
      setupReason: parsed.signal.setupReason ?? 'Unknown',
      status: 'NEW',
      source: 'TRADINGVIEW_PASTE',
      finalScore: score.total,
    });
    addAuditLog({
      action: 'SIGNAL_CREATED',
      severity: 'INFO',
      message: `Signal created from TradingView alert: ${signal.symbol} ${signal.direction}`,
      entityType: 'signal',
      entityId: signal.id,
    });
    setSaved(true);
    setTimeout(() => router.push('/signals'), 1200);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-1">Import TradingView Alert</h1>
      <p className="text-zinc-400 text-sm mb-6">
        Paste your TradingView alert message below. Configure this format in your TradingView alert settings.
      </p>

      {/* Format reference */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 mb-6">
        <p className="text-xs text-zinc-400 mb-2 font-medium uppercase tracking-wide">Alert format (copy to TradingView)</p>
        <pre className="text-xs text-zinc-300 font-mono break-all whitespace-pre-wrap">{EXAMPLE_ALERT}</pre>
        <button
          onClick={() => setRaw(EXAMPLE_ALERT)}
          className="mt-2 text-xs text-blue-400 hover:text-blue-300"
        >
          Use example
        </button>
      </div>

      {/* Input */}
      <div className="mb-4">
        <label className="block text-sm text-zinc-400 mb-2">Alert message</label>
        <textarea
          rows={5}
          value={raw}
          onChange={e => { setRaw(e.target.value); setParsed(null); setSaved(false); }}
          placeholder="GTRADE_SIGNAL|symbol=NQ|..."
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-sm text-white font-mono focus:outline-none focus:border-zinc-500 resize-none"
        />
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={handleParse}
          disabled={!raw.trim()}
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm font-medium disabled:opacity-40"
        >
          Parse Alert
        </button>
        {parsed?.valid && !saved && (
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            Save Signal
          </button>
        )}
        {saved && (
          <span className="px-4 py-2 bg-green-600/20 text-green-400 rounded-lg text-sm font-medium">
            Signal saved — redirecting…
          </span>
        )}
      </div>

      {/* Parse result */}
      {parsed && (
        <div className={`rounded-xl border p-4 ${parsed.valid ? 'bg-green-900/20 border-green-700' : 'bg-red-900/20 border-red-700'}`}>
          <p className={`text-sm font-semibold mb-3 ${parsed.valid ? 'text-green-400' : 'text-red-400'}`}>
            {parsed.valid ? '✓ Valid signal parsed' : '✗ Parse errors'}
          </p>

          {parsed.errors.length > 0 && (
            <ul className="mb-3 space-y-1">
              {parsed.errors.map((e, i) => (
                <li key={i} className="text-red-300 text-xs">• {e}</li>
              ))}
            </ul>
          )}

          {parsed.valid && parsed.signal && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              {[
                ['Symbol', parsed.signal.symbol],
                ['Direction', parsed.signal.direction],
                ['Timeframe', parsed.signal.timeframe],
                ['Asset Class', parsed.signal.assetClass],
                ['Setup', parsed.signal.setupReason],
                ['Entry', parsed.signal.entryPrice],
                ['Stop Loss', parsed.signal.stopLoss],
                ['TP1', parsed.signal.tp1 ?? '—'],
                ['TP2', parsed.signal.tp2 ?? '—'],
                ['TP3', parsed.signal.tp3 ?? '—'],
                ['Session', parsed.signal.session ?? '—'],
                ['Bias', parsed.signal.marketBias ?? '—'],
                ['Score', parsed.signal.confidenceScore ?? '—'],
                ['Liq. Swept', parsed.signal.liquiditySwept ? 'Yes' : 'No'],
                ['FVG', parsed.signal.fvgPresent ? 'Yes' : 'No'],
                ['Break & Retest', parsed.signal.breakRetestConfirmed ? 'Yes' : 'No'],
              ].map(([label, val]) => (
                <div key={label as string} className="flex justify-between border-b border-zinc-700/40 py-0.5">
                  <span className="text-zinc-400">{label}</span>
                  <span className="text-white font-mono">{String(val)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

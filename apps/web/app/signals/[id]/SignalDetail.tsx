'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useJournalStore } from '../../../lib/store';
import { calculateSignalScore, buildSignalReviewPrompt, convertSignalToTrade } from '@forex-journal/shared';
import type { Signal } from '@forex-journal/shared';

const CONFIRM_LABELS: Record<string, string> = {
  liquiditySwept: 'Liquidity Swept',
  fvgPresent: 'FVG Present',
  breakRetestConfirmed: 'Break & Retest',
  srRespected: 'S/R Respected',
  rejectionCandle: 'Rejection Candle',
};

export default function SignalDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { signals, updateSignal, addTrade, addAuditLog, automationRules } = useJournalStore();
  const signal = signals.find(s => s.id === params.id);

  const [aiPromptOpen, setAiPromptOpen] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [aiParsed, setAiParsed] = useState<{ score?: number; recommendation?: string; reasoning?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!signal) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-zinc-400">Signal not found.</p>
        <Link href="/signals" className="text-blue-400 text-sm mt-2 block">← Back to signals</Link>
      </div>
    );
  }

  // Narrow the type — signal is guaranteed non-null from this point on
  const sig = signal;
  const score = calculateSignalScore(sig);
  const aiPrompt = buildSignalReviewPrompt(sig);

  function handleCopyPrompt() {
    navigator.clipboard.writeText(aiPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleParseAiResponse() {
    try {
      const parsed = JSON.parse(aiResponse);
      setAiParsed({ score: parsed.score, recommendation: parsed.recommendation, reasoning: parsed.reasoning });
      updateSignal(sig.id, { aiScore: parsed.score });
      addAuditLog({ action: 'AI_SCORE_SUBMITTED', severity: 'INFO', message: `AI score ${parsed.score}/10 for ${sig.symbol}`, entityType: 'signal', entityId: sig.id });
    } catch {
      alert('Could not parse response — make sure you paste the full JSON block from the AI.');
    }
  }

  function handleConvertToPaper() {
    if (automationRules.killSwitchEnabled) {
      alert('Kill switch is active. Deactivate it in Automation Rules before converting signals.');
      return;
    }
    const tradeDraft = convertSignalToTrade(sig, { paperMode: true });
    const now = new Date().toISOString();
    const dateStr = now.slice(0, 10);
    addTrade({
      ...tradeDraft,
      date: dateStr,
      pair: sig.symbol,
      analysisTimeframe: sig.timeframe,
      entryTimeframe: sig.timeframe,
      direction: sig.direction,
      setupType: (tradeDraft.setupType as any) ?? 'Other',
      marketCondition: 'Trending',
      checklist: {
        htfBias: '',
        supportLevel: '',
        resistanceLevel: '',
        liquidityPresent: false,
        liquiditySwept: sig.liquiditySwept ?? false,
        fvgPresent: sig.fvgPresent ?? false,
        breakAndRetest: sig.breakRetestConfirmed ?? false,
        rejectionCandle: sig.rejectionCandle ?? false,
        goodZone: false,
        afterCandleClose: false,
        newsChecked: false,
        rrMinimum: false,
        priceWithHTF: false,
        noEarlyEntry: false,
        alignedWithPlan: false,
      },
      entryPrice: sig.entryPrice ?? 0,
      stopLoss: sig.stopLoss ?? 0,
      tp1: sig.tp1 ?? 0,
      tp2: sig.tp2 ?? 0,
      tp3: sig.tp3 ?? 0,
      positionSize: 1,
      riskPercent: 1,
      riskAmount: 500,
      entryReason: sig.setupReason,
      screenshotBefore: false,
      management: {
        movedInFavor: false,
        breakevenMoved: false,
        breakevenPrice: '',
        partialTP1: false,
        partialTP1Percent: 0,
        partialTP2: false,
        partialTP2Percent: 0,
        runnerTP3: false,
        exitedEarly: false,
        exitReason: '',
        interferedUnnecessarily: false,
      },
      outcome: 'WIN', // placeholder — paper trades marked open via paperMode=true
      profitLossDollar: 0,
      profitLossPoints: 0,
      rrTargeted: 2,
      rrAchieved: 0,
      followedPlan: 'YES',
      mistakesMade: '',
      wentWell: '',
      improvement: '',
      screenshotAfter: false,
      psychology: {
        feelingBefore: '',
        patience: 5,
        fomo: false,
        revengeTrade: false,
        overtrade: false,
        movedSlEmotionally: false,
        closedTooEarly: false,
        followedRiskRule: true,
        distracted: false,
        mainEmotion: 'Neutral',
        disciplinedAction: '',
      },
      mistakes: {
        noLiquiditySweep: !sig.liquiditySwept,
        noFvgConfirmation: !sig.fvgPresent,
        againstStructure: false,
        enteredTooLate: false,
        enteredTooEarly: false,
        ignoredSR: false,
        ignoredNews: false,
        tooLargeLot: false,
        movedSlWrong: false,
        closedTooEarly: false,
        revengeTrade: false,
        tooManyTrades: false,
        noPartialTP1: false,
        skippedChecklist: false,
        tradedDuringNews: false,
      },
      qualityScore: {
        htfAligned: false,
        liquiditySwept: sig.liquiditySwept ?? false,
        fvgPresent: sig.fvgPresent ?? false,
        breakAndRetest: sig.breakRetestConfirmed ?? false,
        srRespected: sig.srRespected ?? false,
        rejectionCandle: sig.rejectionCandle ?? false,
        rrMinimum: false,
        afterCandleClose: false,
        noNewsConflict: true,
        emotionControlled: true,
        total: 0,
      },
    } as any);
    updateSignal(sig.id, { status: 'TAKEN', linkedTradeId: sig.id });
    addAuditLog({ action: 'PAPER_TRADE_OPENED', severity: 'INFO', message: `Paper trade opened from signal ${sig.symbol} ${sig.direction}`, entityType: 'signal', entityId: sig.id });
    router.push('/paper');
  }

  function handleUpdateStatus(status: Signal['status']) {
    updateSignal(sig.id, { status });
  }

  const scoreColor = score.total >= 7 ? 'text-green-400' : score.total >= 5 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/signals" className="text-zinc-500 hover:text-zinc-300 text-sm">← Signals</Link>
        <span className="text-zinc-700">/</span>
        <span className="text-zinc-300 font-mono">{sig.symbol}</span>
      </div>

      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white font-mono">{sig.symbol}</h1>
            <p className="text-zinc-400 text-sm">{sig.setupReason}</p>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-bold ${scoreColor}`}>{(sig.finalScore ?? score.total).toFixed(1)}</p>
            <p className="text-zinc-500 text-xs">Signal Score / 10</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            ['Direction', sig.direction, sig.direction === 'BUY' || sig.direction === 'LONG' ? 'text-green-400' : 'text-red-400'],
            ['Timeframe', sig.timeframe, 'text-white'],
            ['Session', sig.session ?? '—', 'text-white'],
            ['Entry', sig.entryPrice ?? '—', 'text-white'],
            ['Stop Loss', sig.stopLoss ?? '—', 'text-red-400'],
            ['TP1', sig.tp1 ?? '—', 'text-green-400'],
          ].map(([label, value, color]) => (
            <div key={label as string} className="bg-zinc-800/60 rounded-lg p-3">
              <p className="text-zinc-500 text-xs mb-1">{label}</p>
              <p className={`font-mono font-semibold ${color}`}>{String(value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmations */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4">
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Confirmations</h2>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(CONFIRM_LABELS).map(([key, label]) => {
            const val = signal[key as keyof Signal] as boolean | undefined;
            return (
              <div key={key} className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded text-xs flex items-center justify-center ${val ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-500'}`}>
                  {val ? '✓' : '—'}
                </span>
                <span className={`text-sm ${val ? 'text-white' : 'text-zinc-500'}`}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Score breakdown */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4">
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Score Breakdown</h2>
        <div className="space-y-1">
          {score.details.map((d, i) => (
            <p key={i} className="text-xs text-zinc-400">{d}</p>
          ))}
        </div>
        {sig.aiScore !== undefined && (
          <p className="text-xs text-blue-400 mt-2">AI score applied: {sig.aiScore}/10</p>
        )}
      </div>

      {/* AI Review */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-300">AI Review (Local-First)</h2>
          <button
            onClick={() => setAiPromptOpen(!aiPromptOpen)}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            {aiPromptOpen ? 'Hide prompt' : 'Generate prompt'}
          </button>
        </div>

        {aiParsed && (
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3 mb-3">
            <p className="text-blue-300 font-semibold text-sm">AI Score: {aiParsed.score}/10 — {aiParsed.recommendation}</p>
            <p className="text-zinc-300 text-xs mt-1">{aiParsed.reasoning}</p>
          </div>
        )}

        {aiPromptOpen && (
          <>
            <div className="bg-zinc-800 rounded-lg p-3 mb-3">
              <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono overflow-auto max-h-48">{aiPrompt}</pre>
            </div>
            <button onClick={handleCopyPrompt} className="text-xs text-blue-400 hover:text-blue-300 mr-4">
              {copied ? '✓ Copied!' : 'Copy prompt'}
            </button>
            <div className="mt-3">
              <label className="text-xs text-zinc-400 block mb-1">Paste AI response (JSON):</label>
              <textarea
                rows={4}
                value={aiResponse}
                onChange={e => setAiResponse(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-xs text-white font-mono focus:outline-none focus:border-zinc-500 resize-none"
                placeholder='{"score": 8, "recommendation": "TAKE", "reasoning": "..."}'
              />
              <button
                onClick={handleParseAiResponse}
                disabled={!aiResponse.trim()}
                className="mt-2 px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded text-xs disabled:opacity-40"
              >
                Apply AI Score
              </button>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleConvertToPaper}
            disabled={sig.status === 'TAKEN' || automationRules.killSwitchEnabled}
            className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-lg text-sm font-medium disabled:opacity-40"
          >
            Convert to Paper Trade
          </button>
          {(['NEW', 'WATCHING', 'SKIPPED', 'EXPIRED'] as Signal['status'][]).map(s => (
            <button
              key={s}
              onClick={() => handleUpdateStatus(s)}
              disabled={sig.status === s}
              className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg text-xs disabled:opacity-40"
            >
              Mark {s}
            </button>
          ))}
        </div>
        {automationRules.killSwitchEnabled && (
          <p className="text-red-400 text-xs mt-3">⚠ Kill switch is active. Go to Automation Rules to deactivate.</p>
        )}
      </div>
    </div>
  );
}

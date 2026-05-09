'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useJournalStore } from '../../lib/store';
import type { Signal } from '@forex-journal/shared';
import { calculateSignalScore } from '@forex-journal/shared';

export default function ApprovalsPage() {
  const { signals, updateSignal, addAuditLog, automationRules } = useJournalStore();

  const pending = useMemo(
    () => signals.filter(s => s.approvalStatus === 'PENDING').sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [signals]
  );

  function handleApprove(signal: Signal) {
    updateSignal(signal.id, {
      approvalStatus: 'APPROVED',
      approvedAt: new Date().toISOString(),
      approvedBy: 'human',
    });
    addAuditLog({
      action: 'APPROVAL_GRANTED',
      severity: 'INFO',
      message: `Signal ${signal.symbol} ${signal.direction} approved for execution`,
      entityType: 'signal',
      entityId: signal.id,
    });
  }

  function handleReject(signal: Signal, reason: string) {
    updateSignal(signal.id, {
      approvalStatus: 'REJECTED',
      rejectionReasons: [reason],
    });
    addAuditLog({
      action: 'APPROVAL_DENIED',
      severity: 'WARNING',
      message: `Signal ${signal.symbol} rejected: ${reason}`,
      entityType: 'signal',
      entityId: signal.id,
    });
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-1">Approval Queue</h1>
      <p className="text-zinc-400 text-sm mb-6">
        Signals awaiting human approval before paper execution.
        {automationRules.killSwitchEnabled && (
          <span className="text-red-400 ml-2">⚠ Kill switch active — approvals blocked</span>
        )}
      </p>

      {pending.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <p className="text-lg mb-2">No signals pending approval</p>
          <p className="text-sm">Signals with <code>approvalStatus = PENDING</code> will appear here.</p>
          <Link href="/signals" className="text-blue-400 text-sm mt-2 block">← View all signals</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map(signal => (
            <ApprovalCard
              key={signal.id}
              signal={signal}
              onApprove={() => handleApprove(signal)}
              onReject={(reason) => handleReject(signal, reason)}
              killSwitchActive={automationRules.killSwitchEnabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ApprovalCard({
  signal,
  onApprove,
  onReject,
  killSwitchActive,
}: {
  signal: Signal;
  onApprove: () => void;
  onReject: (reason: string) => void;
  killSwitchActive: boolean;
}) {
  const score = calculateSignalScore(signal);
  const scoreColor = score.total >= 7 ? 'text-green-400' : score.total >= 5 ? 'text-yellow-400' : 'text-red-400';

  const confirmCount = [signal.liquiditySwept, signal.fvgPresent, signal.breakRetestConfirmed, signal.srRespected, signal.rejectionCandle].filter(Boolean).length;

  let rr = '—';
  if (signal.entryPrice && signal.stopLoss && signal.tp1) {
    const risk = Math.abs(signal.entryPrice - signal.stopLoss);
    const reward = Math.abs(signal.tp1 - signal.entryPrice);
    if (risk > 0) rr = (reward / risk).toFixed(2) + ':1';
  }

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-white text-lg">{signal.symbol}</span>
            <span className={`font-semibold ${signal.direction === 'BUY' || signal.direction === 'LONG' ? 'text-green-400' : 'text-red-400'}`}>
              {signal.direction}
            </span>
            <span className="text-zinc-500 text-sm">{signal.timeframe}</span>
          </div>
          <p className="text-zinc-400 text-sm mt-0.5">{signal.setupReason}</p>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold ${scoreColor}`}>{(signal.finalScore ?? score.total).toFixed(1)}</p>
          <p className="text-zinc-500 text-xs">Score</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          ['Entry', signal.entryPrice ?? '—'],
          ['SL', signal.stopLoss ?? '—'],
          ['TP1', signal.tp1 ?? '—'],
          ['R:R', rr],
        ].map(([label, val]) => (
          <div key={label as string} className="bg-zinc-800 rounded-lg p-2 text-center">
            <p className="text-zinc-500 text-xs">{label}</p>
            <p className="text-white font-mono text-sm font-semibold">{String(val)}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 mb-4 text-xs text-zinc-400">
        <span>Confirmations: <span className="text-white font-semibold">{confirmCount}/5</span></span>
        {signal.session && <span>Session: <span className="text-white">{signal.session}</span></span>}
        {signal.aiScore !== undefined && <span>AI Score: <span className="text-blue-400 font-semibold">{signal.aiScore}/10</span></span>}
        {signal.rejectionReasons?.length ? (
          <span className="text-red-400">Flags: {signal.rejectionReasons.join(', ')}</span>
        ) : null}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onApprove}
          disabled={killSwitchActive}
          className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-40"
        >
          ✓ Approve (Paper)
        </button>
        <button
          onClick={() => onReject('Manual rejection')}
          className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
        >
          ✗ Reject
        </button>
        <button
          onClick={() => onReject('Risk too high')}
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg text-sm"
        >
          Reject — Risk
        </button>
        <Link
          href={`/signals/${signal.id}`}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm ml-auto"
        >
          View Signal
        </Link>
      </div>
    </div>
  );
}

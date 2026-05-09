'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useJournalStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, outcomeBg, scoreBg } from '@/lib/utils';
import { getScoreGrade } from '@forex-journal/shared';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-4 py-2 border-b border-bg-border last:border-0">
      <span className="text-muted text-xs w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-text text-sm">{value}</span>
    </div>
  );
}

function Bool({ v }: { v: boolean }) {
  return <span className={v ? 'text-win' : 'text-muted'}>{v ? '✓ Yes' : '✗ No'}</span>;
}

export default function TradeDetail() {
  const { id } = useParams<{ id: string }>();
  const trade = useJournalStore(s => s.getTrade(id));
  const deleteTrade = useJournalStore(s => s.deleteTrade);
  const router = useRouter();

  if (!trade) return <div className="text-muted py-20 text-center">Trade not found.</div>;

  const grade = getScoreGrade(trade.qualityScore?.total ?? 0);
  const scoreTotal = trade.qualityScore?.total ?? 0;

  const handleDelete = () => {
    if (confirm('Delete this trade? This cannot be undone.')) {
      deleteTrade(id);
      router.push('/trades');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold">{trade.pair}</h1>
            <span className={trade.direction === 'BUY' || trade.direction === 'LONG' ? 'text-win font-mono font-bold' : 'text-loss font-mono font-bold'}>
              {trade.direction}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${outcomeBg(trade.outcome)}`}>{trade.outcome}</span>
          </div>
          {trade.tags && trade.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {trade.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 rounded text-xs border bg-accent/10 text-accent border-accent/30">{tag}</span>
              ))}
            </div>
          )}
          <p className="text-muted text-sm">{trade.date} · {trade.session} · {trade.setupType}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="danger" size="sm" onClick={handleDelete}>Delete</Button>
          <Link href="/trades"><Button variant="secondary" size="sm">← Back</Button></Link>
        </div>
      </div>

      {/* Quality Score */}
      <div className="bg-bg-card border border-bg-border rounded-lg p-5 flex items-center gap-6">
        <div className="text-center">
          <p className="text-5xl font-bold font-mono" style={{ color: grade.color }}>{scoreTotal}</p>
          <p className="text-muted text-xs mt-1">/ 10</p>
        </div>
        <div>
          <p className="font-bold text-lg" style={{ color: grade.color }}>{grade.label} Trade</p>
          <p className="text-muted text-sm">{grade.description}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {trade.qualityScore && Object.entries(trade.qualityScore)
              .filter(([k]) => k !== 'total')
              .map(([key, val]) => (
                <span key={key} className={`text-xs px-2 py-0.5 rounded ${val ? 'bg-win/10 text-win border border-win/20' : 'bg-bg-elevated text-muted border border-bg-border'}`}>
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              ))}
          </div>
        </div>
      </div>

      {/* P&L Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'P&L ($)', value: formatCurrency(trade.profitLossDollar), cls: trade.profitLossDollar >= 0 ? 'text-win' : 'text-loss' },
          { label: 'P&L (pts)', value: `${trade.profitLossPoints > 0 ? '+' : ''}${trade.profitLossPoints}`, cls: trade.profitLossPoints >= 0 ? 'text-win' : 'text-loss' },
          { label: 'RR Achieved', value: `${trade.rrAchieved?.toFixed(1)}:1`, cls: 'text-accent' },
          { label: 'Risk %', value: `${trade.riskPercent}%`, cls: 'text-text' },
        ].map(s => (
          <div key={s.label} className="bg-bg-card border border-bg-border rounded-lg p-3 text-center">
            <p className="text-muted text-xs mb-1">{s.label}</p>
            <p className={`font-bold font-mono ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Trade Info */}
      <Card>
        <CardHeader><p className="font-semibold text-sm">Trade Information</p></CardHeader>
        <CardBody>
          <Row label="Date" value={trade.date} />
          <Row label="Session" value={trade.session} />
          <Row label="Analysis TF" value={trade.analysisTimeframe} />
          <Row label="Entry TF" value={trade.entryTimeframe} />
          <Row label="Market Condition" value={trade.marketCondition} />
          <Row label="Followed Plan" value={<span className={trade.followedPlan === 'YES' ? 'text-win' : trade.followedPlan === 'NO' ? 'text-loss' : 'text-breakeven'}>{trade.followedPlan}</span>} />
        </CardBody>
      </Card>

      {/* Entry levels */}
      <Card>
        <CardHeader><p className="font-semibold text-sm">Entry Levels</p></CardHeader>
        <CardBody>
          <div className="grid grid-cols-3 gap-3 mb-3">
            {[
              { label: 'Entry', value: trade.entryPrice, cls: 'text-accent' },
              { label: 'Stop Loss', value: trade.stopLoss, cls: 'text-loss' },
              { label: 'Position Size', value: trade.positionSize, cls: 'text-text' },
              { label: 'TP1 (1:2)', value: trade.tp1, cls: 'text-win' },
              { label: 'TP2 (1:3)', value: trade.tp2, cls: 'text-win' },
              { label: 'TP3 (1:5)', value: trade.tp3, cls: 'text-win' },
            ].map(l => (
              <div key={l.label} className="bg-bg-elevated rounded p-3">
                <p className="text-muted text-xs mb-1">{l.label}</p>
                <p className={`font-mono font-semibold ${l.cls}`}>{l.value}</p>
              </div>
            ))}
          </div>
          <Row label="Risk %" value={`${trade.riskPercent}%`} />
          <Row label="Risk Amount" value={`$${trade.riskAmount}`} />
          <Row label="Entry Reason" value={<span className="text-muted">{trade.entryReason || '—'}</span>} />
        </CardBody>
      </Card>

      {/* Pre-trade checklist */}
      <Card>
        <CardHeader><p className="font-semibold text-sm">Pre-Trade Checklist</p></CardHeader>
        <CardBody>
          <Row label="HTF Bias" value={trade.checklist?.htfBias || '—'} />
          <Row label="Support Level" value={trade.checklist?.supportLevel || '—'} />
          <Row label="Resistance Level" value={trade.checklist?.resistanceLevel || '—'} />
          {trade.checklist && Object.entries(trade.checklist)
            .filter(([k]) => !['htfBias', 'supportLevel', 'resistanceLevel'].includes(k))
            .map(([k, v]) => (
              <Row key={k} label={k.replace(/([A-Z])/g, ' $1').trim()} value={<Bool v={!!v} />} />
            ))}
        </CardBody>
      </Card>

      {/* Management */}
      <Card>
        <CardHeader><p className="font-semibold text-sm">Trade Management</p></CardHeader>
        <CardBody>
          {trade.management && Object.entries(trade.management).map(([k, v]) => (
            <Row key={k} label={k.replace(/([A-Z])/g, ' $1').trim()}
              value={typeof v === 'boolean' ? <Bool v={v} /> : <span className="text-text">{String(v) || '—'}</span>} />
          ))}
        </CardBody>
      </Card>

      {/* Psychology */}
      <Card>
        <CardHeader><p className="font-semibold text-sm">Psychology Review</p></CardHeader>
        <CardBody>
          <Row label="Feeling Before" value={trade.psychology?.feelingBefore || '—'} />
          <Row label="Patience" value={`${trade.psychology?.patience}/5`} />
          <Row label="Main Emotion" value={trade.psychology?.mainEmotion || '—'} />
          <Row label="FOMO" value={<Bool v={!!trade.psychology?.fomo} />} />
          <Row label="Revenge Trade" value={<Bool v={!!trade.psychology?.revengeTrade} />} />
          <Row label="Followed Risk Rule" value={<Bool v={!!trade.psychology?.followedRiskRule} />} />
          <Row label="Disciplined Action" value={trade.psychology?.disciplinedAction || '—'} />
        </CardBody>
      </Card>

      {/* Mistakes */}
      {trade.mistakes && Object.values(trade.mistakes).some(Boolean) && (
        <Card>
          <CardHeader><p className="font-semibold text-sm text-loss">Mistakes Made</p></CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {Object.entries(trade.mistakes)
                .filter(([, v]) => v)
                .map(([k]) => (
                  <span key={k} className="px-2 py-1 rounded text-xs bg-loss/10 text-loss border border-loss/20">
                    {k.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardHeader><p className="font-semibold text-sm">Review Notes</p></CardHeader>
        <CardBody>
          <Row label="What went well" value={trade.wentWell || '—'} />
          <Row label="Improvement" value={trade.improvement || '—'} />
          <Row label="Mistakes made" value={trade.mistakesMade || '—'} />
        </CardBody>
      </Card>
    </div>
  );
}

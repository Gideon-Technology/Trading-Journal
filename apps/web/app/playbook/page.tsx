'use client';

import { useState, useMemo } from 'react';
import { useJournalStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import type { PlaybookSetup } from '@forex-journal/shared';

const CONFIRMATIONS = [
  'Liquidity swept', 'FVG present', 'Break of structure', 'S/R retest',
  'Rejection candle', 'Candle close confirmation', 'HTF aligned', 'No news conflict',
  'Premium/discount zone', 'Order block present', 'Clean structure', 'Volume confirmation',
];

const INSTRUMENTS_LIST = [
  'ES (S&P 500)', 'NQ (Nasdaq 100)', 'MES (Micro S&P)', 'MNQ (Micro Nasdaq)',
  'YM (Dow Jones)', 'RTY (Russell 2000)', 'CL (Crude Oil)', 'GC (Gold)',
  'EUR/USD', 'GBP/USD', 'XAU/USD',
];

const SESSIONS_LIST = ['Pre-Market', 'London', 'New York', 'London-NY Overlap', 'Asian', 'Regular Hours'];

const MARKET_CONDITIONS = ['Trending', 'Ranging', 'Reversal', 'Breakout'];

const blankSetup = (): Omit<PlaybookSetup, 'id' | 'createdAt' | 'updatedAt'> => ({
  name: '',
  description: '',
  bestInstruments: [],
  bestSessions: [],
  marketCondition: 'Trending',
  requiredConfirmations: [],
  invalidConditions: '',
  entryRule: '',
  stopLossRule: '',
  tpRule: '',
  minimumRR: 2,
  commonMistakes: '',
  notes: '',
});

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-muted uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function SetupForm({ initial, onSave, onCancel }: {
  initial: Omit<PlaybookSetup, 'id' | 'createdAt' | 'updatedAt'>;
  onSave: (data: typeof initial) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) => setForm(f => ({ ...f, [k]: v }));

  const toggleArr = <K extends 'bestInstruments' | 'bestSessions' | 'requiredConfirmations'>(k: K, val: string) =>
    setForm(f => ({
      ...f,
      [k]: (f[k] as string[]).includes(val) ? (f[k] as string[]).filter(x => x !== val) : [...(f[k] as string[]), val],
    }));

  return (
    <div className="space-y-4">
      <Field label="Setup Name *">
        <input value={form.name} onChange={e => set('name', e.target.value)}
          placeholder="e.g. NQ NY AM Liquidity Sweep + FVG Retest"
          className="w-full px-3 py-2 text-sm bg-bg-elevated border border-bg-border rounded-md text-text outline-none focus:border-accent" />
      </Field>

      <Field label="Description">
        <textarea value={form.description} onChange={e => set('description', e.target.value)}
          placeholder="Describe the setup in plain language..."
          rows={2} className="w-full px-3 py-2 text-sm bg-bg-elevated border border-bg-border rounded-md text-text outline-none focus:border-accent resize-none" />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Best Instruments">
          <div className="flex flex-wrap gap-1.5">
            {INSTRUMENTS_LIST.map(i => (
              <button key={i} type="button" onClick={() => toggleArr('bestInstruments', i)}
                className={cn('px-2 py-1 rounded text-xs border transition-all',
                  form.bestInstruments.includes(i) ? 'bg-accent/20 text-accent border-accent/40' : 'bg-bg-elevated text-muted border-bg-border')}>
                {i}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Best Sessions">
          <div className="flex flex-wrap gap-1.5">
            {SESSIONS_LIST.map(s => (
              <button key={s} type="button" onClick={() => toggleArr('bestSessions', s)}
                className={cn('px-2 py-1 rounded text-xs border transition-all',
                  form.bestSessions.includes(s) ? 'bg-accent/20 text-accent border-accent/40' : 'bg-bg-elevated text-muted border-bg-border')}>
                {s}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Market Condition">
          <select value={form.marketCondition} onChange={e => set('marketCondition', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-bg-elevated border border-bg-border rounded-md text-text">
            {MARKET_CONDITIONS.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Minimum R:R">
          <input type="number" step="0.5" min="1" value={form.minimumRR} onChange={e => set('minimumRR', parseFloat(e.target.value) || 2)}
            className="w-full px-3 py-2 text-sm bg-bg-elevated border border-bg-border rounded-md text-text outline-none focus:border-accent" />
        </Field>
      </div>

      <Field label="Required Confirmations">
        <div className="flex flex-wrap gap-1.5">
          {CONFIRMATIONS.map(c => (
            <button key={c} type="button" onClick={() => toggleArr('requiredConfirmations', c)}
              className={cn('px-2 py-1 rounded text-xs border transition-all',
                form.requiredConfirmations.includes(c) ? 'bg-win/10 text-win border-win/30' : 'bg-bg-elevated text-muted border-bg-border')}>
              {c}
            </button>
          ))}
        </div>
      </Field>

      {[
        { label: 'Entry Rule', key: 'entryRule' as const, placeholder: 'e.g. Enter on 5M candle close above FVG after liquidity sweep' },
        { label: 'Stop Loss Rule', key: 'stopLossRule' as const, placeholder: 'e.g. Below the swing low / below the FVG' },
        { label: 'Take Profit Rule', key: 'tpRule' as const, placeholder: 'e.g. TP1 at 1:2, TP2 at 1:3, runner to 1:5' },
        { label: 'Invalid Conditions (do not take)', key: 'invalidConditions' as const, placeholder: 'e.g. No trade if price is inside previous range. No trade against HTF trend.' },
        { label: 'Common Mistakes', key: 'commonMistakes' as const, placeholder: 'e.g. Entering before candle close. Skipping liquidity sweep confirmation.' },
        { label: 'Notes', key: 'notes' as const, placeholder: 'Any other notes, screenshot references, etc.' },
      ].map(f => (
        <Field key={f.key} label={f.label}>
          <textarea value={form[f.key] as string} onChange={e => set(f.key, e.target.value)}
            placeholder={f.placeholder} rows={2}
            className="w-full px-3 py-2 text-sm bg-bg-elevated border border-bg-border rounded-md text-text outline-none focus:border-accent resize-none" />
        </Field>
      ))}

      <div className="flex gap-3 pt-2">
        <Button onClick={() => onSave(form)} disabled={!form.name.trim()}>Save Setup</Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

export default function PlaybookPage() {
  const { playbookSetups, addPlaybookSetup, updatePlaybookSetup, deletePlaybookSetup, trades } = useJournalStore();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const statsById = useMemo(() => {
    const map: Record<string, { trades: number; wins: number; pnl: number; totalScore: number }> = {};
    for (const t of trades) {
      if (!t.playbookSetupId) continue;
      if (!map[t.playbookSetupId]) map[t.playbookSetupId] = { trades: 0, wins: 0, pnl: 0, totalScore: 0 };
      map[t.playbookSetupId].trades++;
      if (t.outcome === 'WIN') map[t.playbookSetupId].wins++;
      map[t.playbookSetupId].pnl += t.profitLossDollar ?? 0;
      map[t.playbookSetupId].totalScore += t.qualityScore?.total ?? 0;
    }
    return map;
  }, [trades]);

  const handleSave = (data: Omit<PlaybookSetup, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingId) {
      updatePlaybookSetup(editingId, data);
      setEditingId(null);
    } else {
      addPlaybookSetup(data);
      setCreating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Setup Playbook</h1>
          <p className="text-muted text-sm">{playbookSetups.length} setup{playbookSetups.length !== 1 ? 's' : ''} defined</p>
        </div>
        {!creating && !editingId && (
          <Button onClick={() => setCreating(true)}>+ New Setup</Button>
        )}
      </div>

      {/* Create form */}
      {creating && (
        <Card>
          <CardHeader><p className="font-semibold text-sm">New Setup</p></CardHeader>
          <CardBody>
            <SetupForm initial={blankSetup()} onSave={handleSave} onCancel={() => setCreating(false)} />
          </CardBody>
        </Card>
      )}

      {/* Empty state */}
      {playbookSetups.length === 0 && !creating && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-4xl mb-3">📋</p>
          <h2 className="text-lg font-bold text-text mb-2">No setups yet</h2>
          <p className="text-muted text-sm mb-5 max-w-sm">
            Define your repeatable setups here. Each trade you log can be linked to a playbook setup so you know exactly which setups make you money.
          </p>
          <Button onClick={() => setCreating(true)}>+ Add Your First Setup</Button>
        </div>
      )}

      {/* Setup list */}
      {playbookSetups.map(setup => {
        const stats = statsById[setup.id];
        const winRate = stats && stats.trades > 0 ? ((stats.wins / stats.trades) * 100).toFixed(0) : null;
        const avgScore = stats && stats.trades > 0 ? (stats.totalScore / stats.trades).toFixed(1) : null;
        const isExpanded = expandedId === setup.id;
        const isEditing = editingId === setup.id;

        return (
          <Card key={setup.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-text">{setup.name}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {setup.bestInstruments.slice(0, 3).map(i => (
                      <span key={i} className="text-xs text-accent bg-accent/10 px-1.5 py-0.5 rounded border border-accent/20">{i}</span>
                    ))}
                    {setup.bestSessions.slice(0, 2).map(s => (
                      <span key={s} className="text-xs text-muted bg-bg-elevated px-1.5 py-0.5 rounded border border-bg-border">{s}</span>
                    ))}
                  </div>
                </div>
                {stats && (
                  <div className="flex gap-4 text-center shrink-0 ml-4">
                    <div>
                      <p className={`font-mono font-bold text-sm ${parseFloat(winRate ?? '0') >= 50 ? 'text-win' : 'text-loss'}`}>{winRate}%</p>
                      <p className="text-muted text-xs">Win Rate</p>
                    </div>
                    <div>
                      <p className={`font-mono font-bold text-sm ${stats.pnl >= 0 ? 'text-win' : 'text-loss'}`}>{formatCurrency(stats.pnl)}</p>
                      <p className="text-muted text-xs">P&L</p>
                    </div>
                    <div>
                      <p className="font-mono font-bold text-sm text-text">{stats.trades}</p>
                      <p className="text-muted text-xs">Trades</p>
                    </div>
                    <div>
                      <p className="font-mono font-bold text-sm text-accent">{avgScore}</p>
                      <p className="text-muted text-xs">Avg Score</p>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>

            {isEditing ? (
              <CardBody>
                <SetupForm
                  initial={{ name: setup.name, description: setup.description, bestInstruments: setup.bestInstruments, bestSessions: setup.bestSessions, marketCondition: setup.marketCondition, requiredConfirmations: setup.requiredConfirmations, invalidConditions: setup.invalidConditions, entryRule: setup.entryRule, stopLossRule: setup.stopLossRule, tpRule: setup.tpRule, minimumRR: setup.minimumRR, commonMistakes: setup.commonMistakes, notes: setup.notes }}
                  onSave={handleSave}
                  onCancel={() => setEditingId(null)}
                />
              </CardBody>
            ) : (
              <CardBody className="pt-0">
                <div className="flex gap-2 mb-3">
                  <button onClick={() => setExpandedId(isExpanded ? null : setup.id)}
                    className="text-xs text-muted hover:text-accent transition-colors">
                    {isExpanded ? '▲ Collapse' : '▼ Details'}
                  </button>
                  <button onClick={() => { setEditingId(setup.id); setExpandedId(null); }}
                    className="text-xs text-muted hover:text-accent transition-colors">Edit</button>
                  <button onClick={() => { if (confirm('Delete this setup?')) deletePlaybookSetup(setup.id); }}
                    className="text-xs text-loss hover:text-loss/80 transition-colors">Delete</button>
                </div>

                {isExpanded && (
                  <div className="space-y-3 border-t border-bg-border pt-3">
                    {setup.description && <p className="text-sm text-muted">{setup.description}</p>}
                    {setup.requiredConfirmations.length > 0 && (
                      <div>
                        <p className="text-xs text-muted font-medium mb-1 uppercase tracking-wider">Required Confirmations</p>
                        <div className="flex flex-wrap gap-1">
                          {setup.requiredConfirmations.map(c => (
                            <span key={c} className="px-2 py-0.5 rounded text-xs bg-win/10 text-win border border-win/20">{c}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {[
                      { label: 'Entry Rule', value: setup.entryRule },
                      { label: 'Stop Loss Rule', value: setup.stopLossRule },
                      { label: 'Take Profit Rule', value: setup.tpRule },
                      { label: 'Invalid Conditions', value: setup.invalidConditions },
                      { label: 'Common Mistakes', value: setup.commonMistakes },
                    ].filter(f => f.value).map(f => (
                      <div key={f.label}>
                        <p className="text-xs text-muted font-medium mb-0.5 uppercase tracking-wider">{f.label}</p>
                        <p className="text-sm text-text">{f.value}</p>
                      </div>
                    ))}
                    <p className="text-xs text-muted">Min R:R: {setup.minimumRR}:1 · {setup.marketCondition}</p>
                  </div>
                )}
              </CardBody>
            )}
          </Card>
        );
      })}
    </div>
  );
}

import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { v4 as uuid } from 'uuid';
import { format } from 'date-fns';
import { calculateQualityScore } from '@forex-journal/shared';
import type { Trade, Session, Direction, SetupType, MarketCondition, Outcome } from '@forex-journal/shared';
import { addTrade, getTrades, exportToJSON } from './storage';

const S = {
  bg: '#0D1117', card: '#161B22', border: '#21262D', elevated: '#1C2128',
  text: '#E6EDF3', muted: '#8B949E', accent: '#58A6FF',
  win: '#3FB950', loss: '#F85149', breakeven: '#D29922',
};

const css = {
  card: { background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, marginBottom: 12 },
  label: { color: S.muted, fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: 4, fontWeight: 600 },
  input: { width: '100%', background: S.elevated, border: `1px solid ${S.border}`, borderRadius: 5, color: S.text, padding: '6px 8px', fontSize: 12, outline: 'none' },
  select: { width: '100%', background: S.elevated, border: `1px solid ${S.border}`, borderRadius: 5, color: S.text, padding: '6px 8px', fontSize: 12, outline: 'none' },
  btn: (active?: boolean, color?: string) => ({
    background: active ? (color ?? S.accent) : S.elevated,
    color: active ? '#fff' : S.muted,
    border: `1px solid ${active ? (color ?? S.accent) : S.border}`,
    borderRadius: 5, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 500,
    transition: 'all 0.15s',
  } as React.CSSProperties),
};

type Tab = 'entry' | 'checklist' | 'history';

const PAIRS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'NZD/USD', 'USD/CAD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'XAU/USD'];
const SESSIONS: Session[] = ['Asian', 'London', 'New York', 'London-NY Overlap'];
const SETUPS: SetupType[] = ['Liquidity Sweep + FVG', 'Break & Retest', 'S/R Retest', 'Trendline Retest', 'FVG Only', 'Other'];

const defaultEntry = {
  date: format(new Date(), 'yyyy-MM-dd'),
  session: 'London' as Session,
  pair: 'EUR/USD',
  direction: 'BUY' as Direction,
  setupType: 'Liquidity Sweep + FVG' as SetupType,
  marketCondition: 'Trending' as MarketCondition,
  analysisTimeframe: '4H',
  entryTimeframe: '15M',
  entryPrice: '', stopLoss: '', tp1: '', tp2: '', tp3: '',
  lotSize: '', riskPercent: '1', riskAmount: '',
  entryReason: '',
  outcome: 'WIN' as Outcome,
  profitLossDollar: '', profitLossPips: '',
  rrTargeted: '', rrAchieved: '',
};

const defaultChecklist = {
  htfBias: '', liquiditySwept: false, fvgPresent: false,
  breakAndRetest: false, rejectionCandle: false, afterCandleClose: false,
  newsChecked: false, rrMinimum: false, priceWithHTF: false,
  goodZone: false, noEarlyEntry: false, alignedWithPlan: false,
  supportLevel: '', resistanceLevel: '', liquidityPresent: false,
};

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 0', borderBottom: `1px solid ${S.border}` }}>
      <div onClick={() => onChange(!checked)} style={{
        width: 14, height: 14, borderRadius: 3, border: `2px solid ${checked ? S.accent : S.border}`,
        background: checked ? S.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {checked && <span style={{ color: '#fff', fontSize: 9, lineHeight: 1 }}>✓</span>}
      </div>
      <span style={{ fontSize: 11, color: S.text }}>{label}</span>
    </label>
  );
}

function Popup() {
  const [tab, setTab] = useState<Tab>('checklist');
  const [entry, setEntry] = useState(defaultEntry);
  const [checklist, setChecklist] = useState(defaultChecklist);
  const [saved, setSaved] = useState(false);
  const trades = getTrades();

  const se = (k: keyof typeof entry, v: unknown) => setEntry(e => ({ ...e, [k]: v }));
  const sc = (k: keyof typeof checklist, v: unknown) => setChecklist(c => ({ ...c, [k]: v }));

  const checkScore = Object.entries(checklist).filter(([k, v]) => !['htfBias', 'supportLevel', 'resistanceLevel'].includes(k) && v === true).length;

  const handleSave = () => {
    const trade: Trade = {
      id: uuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      date: entry.date,
      session: entry.session,
      pair: entry.pair,
      direction: entry.direction,
      setupType: entry.setupType,
      marketCondition: entry.marketCondition,
      analysisTimeframe: entry.analysisTimeframe,
      entryTimeframe: entry.entryTimeframe,
      checklist: { ...checklist },
      entryPrice: parseFloat(entry.entryPrice) || 0,
      stopLoss: parseFloat(entry.stopLoss) || 0,
      tp1: parseFloat(entry.tp1) || 0,
      tp2: parseFloat(entry.tp2) || 0,
      tp3: parseFloat(entry.tp3) || 0,
      lotSize: parseFloat(entry.lotSize) || 0,
      riskPercent: parseFloat(entry.riskPercent) || 1,
      riskAmount: parseFloat(entry.riskAmount) || 0,
      entryReason: entry.entryReason,
      screenshotBefore: false,
      outcome: entry.outcome,
      profitLossDollar: parseFloat(entry.profitLossDollar) || 0,
      profitLossPips: parseFloat(entry.profitLossPips) || 0,
      rrTargeted: parseFloat(entry.rrTargeted) || 0,
      rrAchieved: parseFloat(entry.rrAchieved) || 0,
      followedPlan: 'YES',
      mistakesMade: '', wentWell: '', improvement: '',
      screenshotAfter: false,
      management: { movedInFavor: false, breakevenMoved: false, breakevenPrice: '', partialTP1: false, partialTP1Percent: 50, partialTP2: false, partialTP2Percent: 30, runnerTP3: false, exitedEarly: false, exitReason: '', interferedUnnecessarily: false },
      psychology: { feelingBefore: '', patience: 3, fomo: false, revengeTrade: false, overtrade: false, movedSlEmotionally: false, closedTooEarly: false, followedRiskRule: true, distracted: false, mainEmotion: '', disciplinedAction: '' },
      mistakes: { noLiquiditySweep: false, noFvgConfirmation: false, againstStructure: false, enteredTooLate: false, enteredTooEarly: false, ignoredSR: false, ignoredNews: false, tooLargeLot: false, movedSlWrong: false, closedTooEarly: false, revengeTrade: false, tooManyTrades: false, noPartialTP1: false, skippedChecklist: false, tradedDuringNews: false },
      qualityScore: calculateQualityScore({ checklist }),
    };
    addTrade(trade);
    setSaved(true);
    setTimeout(() => { setSaved(false); setEntry(defaultEntry); setChecklist(defaultChecklist); }, 1500);
  };

  const handleExport = () => {
    const data = exportToJSON();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fx-journal-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${S.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>📈</span>
          <div>
            <p style={{ color: S.text, fontWeight: 700, fontSize: 13 }}>G-Trade</p>
            <p style={{ color: S.muted, fontSize: 10 }}>{trades.length} trades saved</p>
          </div>
        </div>
        <button onClick={handleExport} style={{ ...css.btn(), fontSize: 10, padding: '4px 8px' }}>
          Export JSON ↓
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {(['checklist', 'entry', 'history'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ ...css.btn(tab === t), flex: 1, textAlign: 'center', fontSize: 11, padding: '5px 4px', textTransform: 'capitalize' }}>
            {t === 'checklist' ? `Checklist (${checkScore}/12)` : t === 'entry' ? 'Log Trade' : `History (${trades.length})`}
          </button>
        ))}
      </div>

      {/* Checklist tab */}
      {tab === 'checklist' && (
        <div>
          <div style={css.card}>
            <div style={{ padding: '10px 12px' }}>
              <div style={{ marginBottom: 8 }}>
                <label style={css.label}>HTF Bias (write it)</label>
                <input style={css.input} placeholder="e.g. Bullish — 4H HH/HL" value={checklist.htfBias} onChange={e => sc('htfBias', e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
                <div>
                  <label style={css.label}>Support</label>
                  <input style={css.input} placeholder="Level" value={checklist.supportLevel} onChange={e => sc('supportLevel', e.target.value)} />
                </div>
                <div>
                  <label style={css.label}>Resistance</label>
                  <input style={css.input} placeholder="Level" value={checklist.resistanceLevel} onChange={e => sc('resistanceLevel', e.target.value)} />
                </div>
              </div>
              {[
                ['priceWithHTF', 'Aligned with HTF bias'],
                ['liquidityPresent', 'Liquidity pool identified'],
                ['liquiditySwept', 'Liquidity swept ✓'],
                ['fvgPresent', 'Valid FVG present ✓'],
                ['breakAndRetest', 'Break & retest confirmed'],
                ['rejectionCandle', 'Rejection candle present'],
                ['goodZone', 'Entering from good zone'],
                ['noEarlyEntry', 'Not entering too early'],
                ['afterCandleClose', 'Waiting for candle close ✓'],
                ['rrMinimum', 'RR is minimum 1:2'],
                ['newsChecked', 'News calendar checked'],
                ['alignedWithPlan', 'Aligned with my plan'],
              ].map(([key, label]) => (
                <CheckRow key={key} label={label}
                  checked={!!(checklist as Record<string, unknown>)[key]}
                  onChange={v => sc(key as keyof typeof checklist, v)} />
              ))}
            </div>
          </div>
          <div style={{ padding: '8px 12px', background: S.card, border: `1px solid ${checkScore >= 8 ? S.win : S.loss}`, borderRadius: 6, textAlign: 'center' }}>
            <span style={{ color: S.muted, fontSize: 11 }}>Score: </span>
            <span style={{ color: checkScore >= 8 ? S.win : checkScore >= 5 ? S.breakeven : S.loss, fontWeight: 700, fontSize: 14 }}>{checkScore}/12</span>
            <span style={{ color: S.muted, fontSize: 10, marginLeft: 6 }}>{checkScore >= 9 ? '— Take the trade ✓' : checkScore >= 6 ? '— Proceed with caution' : '— Do not trade'}</span>
          </div>
        </div>
      )}

      {/* Entry tab */}
      {tab === 'entry' && (
        <div>
          <div style={css.card}>
            <div style={{ padding: '10px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={css.label}>Date</label>
                <input type="date" style={css.input} value={entry.date} onChange={e => se('date', e.target.value)} />
              </div>
              <div>
                <label style={css.label}>Session</label>
                <select style={css.select} value={entry.session} onChange={e => se('session', e.target.value as Session)}>
                  {SESSIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={css.label}>Pair</label>
                <select style={css.select} value={entry.pair} onChange={e => se('pair', e.target.value)}>
                  {PAIRS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={css.label}>Setup</label>
                <select style={css.select} value={entry.setupType} onChange={e => se('setupType', e.target.value as SetupType)}>
                  {SETUPS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Direction */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {(['BUY', 'SELL'] as Direction[]).map(d => (
              <button key={d} onClick={() => se('direction', d)} style={{
                flex: 1, padding: '8px', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                background: entry.direction === d ? (d === 'BUY' ? S.win : S.loss) : S.elevated,
                color: entry.direction === d ? '#fff' : S.muted,
                border: `1px solid ${entry.direction === d ? (d === 'BUY' ? S.win : S.loss) : S.border}`,
              }}>{d}</button>
            ))}
          </div>

          {/* Levels */}
          <div style={css.card}>
            <div style={{ padding: '10px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {[
                ['Entry', 'entryPrice', '1.26875'],
                ['Stop Loss', 'stopLoss', '1.26740'],
                ['Lot Size', 'lotSize', '0.50'],
                ['TP1 (1:2)', 'tp1', 'TP1'],
                ['TP2 (1:3)', 'tp2', 'TP2'],
                ['TP3 (1:5)', 'tp3', 'TP3'],
              ].map(([label, key, ph]) => (
                <div key={key}>
                  <label style={{ ...css.label, fontSize: 9 }}>{label}</label>
                  <input type="number" step="0.00001" style={css.input}
                    placeholder={ph}
                    value={(entry as Record<string, string>)[key]}
                    onChange={e => se(key as keyof typeof entry, e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          {/* Risk */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
            <div>
              <label style={css.label}>Risk %</label>
              <input type="number" step="0.1" style={css.input} value={entry.riskPercent} onChange={e => se('riskPercent', e.target.value)} />
            </div>
            <div>
              <label style={css.label}>Risk Amount ($)</label>
              <input type="number" step="0.01" style={css.input} value={entry.riskAmount} onChange={e => se('riskAmount', e.target.value)} />
            </div>
          </div>

          {/* Outcome */}
          <div style={{ marginBottom: 8 }}>
            <label style={css.label}>Outcome</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['WIN', 'LOSS', 'BREAKEVEN'] as Outcome[]).map(o => (
                <button key={o} onClick={() => se('outcome', o)} style={{
                  flex: 1, padding: '5px', borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  background: entry.outcome === o ? (o === 'WIN' ? S.win : o === 'LOSS' ? S.loss : S.breakeven) : S.elevated,
                  color: entry.outcome === o ? '#fff' : S.muted,
                  border: `1px solid ${entry.outcome === o ? (o === 'WIN' ? S.win : o === 'LOSS' ? S.loss : S.breakeven) : S.border}`,
                }}>{o}</button>
              ))}
            </div>
          </div>

          {/* P&L fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
            {[
              ['P&L ($)', 'profitLossDollar'],
              ['P&L (pips)', 'profitLossPips'],
              ['RR Targeted', 'rrTargeted'],
              ['RR Achieved', 'rrAchieved'],
            ].map(([label, key]) => (
              <div key={key}>
                <label style={css.label}>{label}</label>
                <input type="number" step="0.01" style={css.input}
                  value={(entry as Record<string, string>)[key]}
                  onChange={e => se(key as keyof typeof entry, e.target.value)} />
              </div>
            ))}
          </div>

          {/* Entry reason */}
          <div style={{ marginBottom: 10 }}>
            <label style={css.label}>Reason for entry</label>
            <textarea style={{ ...css.input, resize: 'none' }} rows={2}
              placeholder="e.g. Swept equal lows, FVG filled, bullish engulfing closed above..."
              value={entry.entryReason} onChange={e => se('entryReason', e.target.value)} />
          </div>

          <button onClick={handleSave} style={{
            width: '100%', padding: '9px', borderRadius: 6, background: saved ? S.win : S.accent,
            color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
          }}>
            {saved ? '✓ Trade Saved!' : 'Save Trade'}
          </button>
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <div>
          {trades.length === 0 ? (
            <p style={{ color: S.muted, textAlign: 'center', padding: '20px 0' }}>No trades saved yet.</p>
          ) : (
            trades.slice(0, 15).map(t => (
              <div key={t.id} style={{ ...css.card, padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 12 }}>{t.pair}</span>
                    <span style={{ color: t.direction === 'BUY' ? S.win : S.loss, fontSize: 11, fontWeight: 700 }}>{t.direction}</span>
                    <span style={{ fontSize: 10, color: S.muted }}>{t.date}</span>
                  </div>
                  <span style={{ fontSize: 10, color: S.muted }}>{t.setupType}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                    background: t.outcome === 'WIN' ? '#3FB95020' : t.outcome === 'LOSS' ? '#F8514920' : '#D2992220',
                    color: t.outcome === 'WIN' ? S.win : t.outcome === 'LOSS' ? S.loss : S.breakeven,
                  }}>{t.outcome}</span>
                  <p style={{ color: t.profitLossDollar >= 0 ? S.win : S.loss, fontSize: 11, fontWeight: 700, marginTop: 2 }}>
                    {t.profitLossDollar >= 0 ? '+' : ''}${t.profitLossDollar?.toFixed(2)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const root = document.getElementById('root')!;
createRoot(root).render(<Popup />);

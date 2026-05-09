'use client';

import { useState } from 'react';
import { useJournalStore } from '../../lib/store';
import { AUTOMATION_LEVEL_LABELS, calculateAutomationReadiness } from '@forex-journal/shared';
import type { AutomationLevel } from '@forex-journal/shared';

const GRADE_COLORS = {
  NOT_READY: 'text-red-400 bg-red-900/20 border-red-700',
  COLLECTING_DATA: 'text-orange-400 bg-orange-900/20 border-orange-700',
  PAPER_ONLY: 'text-yellow-400 bg-yellow-900/20 border-yellow-700',
  HUMAN_APPROVAL: 'text-blue-400 bg-blue-900/20 border-blue-700',
  AUTOMATION_CANDIDATE: 'text-green-400 bg-green-900/20 border-green-700',
};

export default function AutomationRulesPage() {
  const { automationRules, updateAutomationRules, toggleKillSwitch, trades, signals, addAuditLog } = useJournalStore();
  const [saved, setSaved] = useState(false);
  const [local, setLocal] = useState(automationRules);

  const readiness = calculateAutomationReadiness({
    trades,
    signals,
    daysActive: Math.max(1, Math.ceil((Date.now() - new Date(trades[trades.length - 1]?.createdAt ?? Date.now()).getTime()) / 86400000)),
  });

  function handleSave() {
    updateAutomationRules(local);
    addAuditLog({ action: 'AUTOMATION_RULES_UPDATED', severity: 'INFO', message: 'Automation rules updated', details: local as unknown as Record<string, unknown> });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleKillSwitch() {
    toggleKillSwitch();
    addAuditLog({
      action: automationRules.killSwitchEnabled ? 'KILL_SWITCH_DEACTIVATED' : 'KILL_SWITCH_ACTIVATED',
      severity: automationRules.killSwitchEnabled ? 'INFO' : 'CRITICAL',
      message: `Kill switch ${automationRules.killSwitchEnabled ? 'deactivated' : 'ACTIVATED'}`,
    });
  }

  const gradeClass = GRADE_COLORS[readiness.grade];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-1">Automation Rules</h1>
      <p className="text-zinc-400 text-sm mb-6">Safety-first controls for signal processing and execution.</p>

      {/* Kill Switch */}
      <div className={`rounded-xl border p-5 mb-6 ${automationRules.killSwitchEnabled ? 'bg-red-900/30 border-red-600' : 'bg-zinc-900 border-zinc-700'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Kill Switch</h2>
            <p className="text-zinc-400 text-sm mt-0.5">
              {automationRules.killSwitchEnabled
                ? '⚠ ACTIVE — All signal conversion and execution blocked'
                : 'Inactive — System operating normally'}
            </p>
          </div>
          <button
            onClick={handleKillSwitch}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-colors ${
              automationRules.killSwitchEnabled
                ? 'bg-green-700 hover:bg-green-600 text-white'
                : 'bg-red-700 hover:bg-red-600 text-white'
            }`}
          >
            {automationRules.killSwitchEnabled ? 'Deactivate' : 'Activate Kill Switch'}
          </button>
        </div>
      </div>

      {/* Readiness Card */}
      <div className={`rounded-xl border p-5 mb-6 ${gradeClass}`}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-white">Automation Readiness</h2>
          <span className="text-2xl font-bold">{readiness.score}/100</span>
        </div>
        <p className="text-sm font-medium mb-2">{readiness.grade.replace('_', ' ')}</p>
        <p className="text-xs opacity-80 mb-3">{readiness.recommendation}</p>
        {readiness.reasons.length > 0 && (
          <ul className="space-y-0.5">
            {readiness.reasons.map((r, i) => <li key={i} className="text-xs opacity-70">• {r}</li>)}
          </ul>
        )}
        {readiness.warnings.map((w, i) => (
          <p key={i} className="text-xs opacity-60 mt-0.5">⚠ {w}</p>
        ))}
      </div>

      {/* Automation Level */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4">
        <h2 className="text-sm font-semibold text-zinc-300 mb-4">Automation Level</h2>
        <div className="grid grid-cols-1 gap-2">
          {([0, 1, 2, 3, 4, 5] as AutomationLevel[]).map(level => (
            <label
              key={level}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                local.allowedAutomationLevel === level
                  ? 'border-blue-500 bg-blue-900/20'
                  : 'border-zinc-700 bg-zinc-800/40 hover:border-zinc-600'
              } ${level >= 5 ? 'opacity-60' : ''}`}
            >
              <input
                type="radio"
                name="automationLevel"
                value={level}
                checked={local.allowedAutomationLevel === level}
                onChange={() => setLocal({ ...local, allowedAutomationLevel: level })}
                disabled={level >= 5}
                className="accent-blue-500"
              />
              <div>
                <span className="text-white font-medium text-sm">Level {level}: {AUTOMATION_LEVEL_LABELS[level]}</span>
                {level >= 5 && <span className="text-xs text-zinc-500 ml-2">(paper/demo only — future feature)</span>}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Risk Limits */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4">
        <h2 className="text-sm font-semibold text-zinc-300 mb-4">Risk Limits</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Max Risk / Trade (%)', key: 'maxRiskPerTrade', type: 'number', step: '0.1', min: '0.1', max: '5' },
            { label: 'Max Trades / Day', key: 'maxTradesPerDay', type: 'number', min: '1', max: '20' },
            { label: 'Max Signals / Day', key: 'maxSignalsPerDay', type: 'number', min: '1', max: '50' },
            { label: 'Max Contracts', key: 'maxContracts', type: 'number', min: '1', max: '50' },
            { label: 'Stop After Losses', key: 'stopAfterLosses', type: 'number', min: '1', max: '10' },
            { label: 'Daily Loss Limit ($)', key: 'dailyLossLimit', type: 'number', min: '100', max: '50000' },
            { label: 'Weekly Loss Limit ($)', key: 'weeklyLossLimit', type: 'number', min: '100', max: '100000' },
            { label: 'Min Signal Score (0–10)', key: 'minimumSignalScore', type: 'number', step: '0.5', min: '0', max: '10' },
            { label: 'Min AI Score (0–10)', key: 'minimumAiScore', type: 'number', step: '0.5', min: '0', max: '10' },
            { label: 'Min Readiness Score (0–100)', key: 'minimumAutomationReadiness', type: 'number', min: '0', max: '100' },
          ].map(({ label, key, type, step, min, max }) => (
            <div key={key}>
              <label className="text-xs text-zinc-400 block mb-1">{label}</label>
              <input
                type={type}
                step={step ?? '1'}
                min={min}
                max={max}
                value={local[key as keyof typeof local] as number}
                onChange={e => setLocal({ ...local, [key]: parseFloat(e.target.value) || 0 })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Safety Toggles */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-zinc-300 mb-4">Safety Toggles</h2>
        <div className="space-y-3">
          {[
            { label: 'Paper Mode Only', key: 'paperModeOnly', desc: 'No real broker execution, ever' },
            { label: 'Require Human Approval', key: 'requireHumanApproval', desc: 'All signals need manual approval before execution' },
            { label: 'No Trade During News', key: 'noTradeDuringNews', desc: 'Block signals within news event windows' },
            { label: 'Allow Only Playbook Setups', key: 'allowOnlyPlaybookSetups', desc: 'Only process signals matching saved playbook setups' },
            { label: 'Allow Live Execution', key: 'allowLiveExecution', desc: 'DANGER: Enable real broker execution (disabled in this build)', disabled: true },
          ].map(({ label, key, desc, disabled }) => (
            <label key={key} className={`flex items-center gap-3 cursor-pointer ${disabled ? 'opacity-40' : ''}`}>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={local[key as keyof typeof local] as boolean}
                  onChange={e => !disabled && setLocal({ ...local, [key]: e.target.checked })}
                  disabled={disabled}
                  className="sr-only"
                />
                <div
                  className={`w-10 h-6 rounded-full transition-colors ${(local[key as keyof typeof local] as boolean) ? 'bg-blue-600' : 'bg-zinc-700'}`}
                  onClick={() => !disabled && setLocal({ ...local, [key]: !(local[key as keyof typeof local] as boolean) })}
                />
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${(local[key as keyof typeof local] as boolean) ? 'translate-x-5' : 'translate-x-1'}`}
                />
              </div>
              <div>
                <p className="text-sm text-white">{label}</p>
                <p className="text-xs text-zinc-500">{desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium"
      >
        {saved ? '✓ Saved' : 'Save Rules'}
      </button>
    </div>
  );
}

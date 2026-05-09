'use client';

import { useState, useMemo } from 'react';
import { useJournalStore } from '../../lib/store';
import { buildTradeReviewPrompt, buildDisciplineAnalysisPrompt } from '@forex-journal/shared';

type ReviewMode = 'weekly' | 'discipline';

export default function AICoachPage() {
  const { trades, addAIReview, aiReviews } = useJournalStore();
  const [mode, setMode] = useState<ReviewMode>('weekly');
  const [copied, setCopied] = useState(false);
  const [rawResponse, setRawResponse] = useState('');
  const [saved, setSaved] = useState(false);

  const recentTrades = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return trades.filter(t => new Date(t.createdAt) >= cutoff).slice(0, 30);
  }, [trades]);

  const allTrades = trades.slice(0, 50);

  const prompt = useMemo(() => {
    if (mode === 'weekly') {
      const weekOf = new Date();
      weekOf.setDate(weekOf.getDate() - weekOf.getDay());
      return buildTradeReviewPrompt({ trades: recentTrades, period: `Week of ${weekOf.toLocaleDateString()}` });
    }
    return buildDisciplineAnalysisPrompt(allTrades);
  }, [mode, recentTrades, allTrades]);

  function handleCopy() {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSaveReview() {
    try {
      const parsed = JSON.parse(rawResponse);
      const now = new Date().toISOString();
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      addAIReview({
        periodType: mode === 'weekly' ? 'weekly' : 'daily',
        periodStart: weekStart.toISOString(),
        periodEnd: now,
        modelSource: 'local_prompt',
        prompt,
        rawResponse,
        overallScore: parsed.overallScore,
        disciplineScore: parsed.disciplineScore,
        riskScore: parsed.riskScore,
        consistencyScore: parsed.consistencyScore,
        strengths: parsed.strengths ?? [],
        weaknesses: parsed.weaknesses ?? [],
        recommendations: parsed.recommendations ?? [],
        patterns: parsed.patterns ?? [],
        reviewed: true,
      });
      setSaved(true);
      setRawResponse('');
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert('Could not parse response. Make sure you paste the full JSON from the AI.');
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-1">AI Coach</h1>
      <p className="text-zinc-400 text-sm mb-6">
        Local-first AI coaching. Generate a prompt, paste into your LLM (Claude, GPT-4, Ollama), paste the response back.
      </p>

      {/* Mode tabs */}
      <div className="flex gap-2 mb-6">
        {([
          { key: 'weekly', label: `Weekly Review (${recentTrades.length} trades)` },
          { key: 'discipline', label: `Discipline Analysis (${allTrades.length} trades)` },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === key ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Prompt area */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-300">Generated Prompt</h2>
          <button onClick={handleCopy} className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs font-medium">
            {copied ? '✓ Copied!' : 'Copy Prompt'}
          </button>
        </div>
        <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto bg-zinc-800 rounded-lg p-3">
          {prompt}
        </pre>
        <p className="text-zinc-500 text-xs mt-2">
          Copy this prompt → paste into Claude.ai, ChatGPT, or local Ollama → paste the JSON response below.
        </p>
      </div>

      {/* Response input */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">AI Response</h2>
        <textarea
          rows={8}
          value={rawResponse}
          onChange={e => { setRawResponse(e.target.value); setSaved(false); }}
          placeholder='{"overallScore": 7, "disciplineScore": 8, "strengths": [...], "weaknesses": [...], "recommendations": [...]}'
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm text-white font-mono focus:outline-none focus:border-zinc-500 resize-none"
        />
        <button
          onClick={handleSaveReview}
          disabled={!rawResponse.trim() || saved}
          className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-40"
        >
          {saved ? '✓ Review Saved' : 'Save AI Review'}
        </button>
      </div>

      {/* Past reviews */}
      {aiReviews.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Past Reviews</h2>
          <div className="space-y-3">
            {aiReviews.slice(0, 5).map(r => (
              <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium capitalize">{r.periodType} Review</span>
                  <span className="text-zinc-500 text-xs">{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    { label: 'Overall', value: r.overallScore },
                    { label: 'Discipline', value: r.disciplineScore },
                    { label: 'Risk', value: r.riskScore },
                    { label: 'Consistency', value: r.consistencyScore },
                  ].map(({ label, value }) => value !== undefined && (
                    <div key={label} className="text-center">
                      <p className="text-zinc-500 text-xs">{label}</p>
                      <p className={`font-bold ${(value ?? 0) >= 7 ? 'text-green-400' : (value ?? 0) >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {value}/10
                      </p>
                    </div>
                  ))}
                </div>
                {r.recommendations.length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">Recommendations:</p>
                    <ul className="space-y-0.5">
                      {r.recommendations.slice(0, 3).map((rec, i) => (
                        <li key={i} className="text-xs text-zinc-300">• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

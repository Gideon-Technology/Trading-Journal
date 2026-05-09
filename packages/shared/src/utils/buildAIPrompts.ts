import type { Trade } from '../types/trade';
import type { Signal } from '../types/signal';

interface TradeGroup {
  trades: Trade[];
  period: string;  // e.g. "Week of 2026-05-05"
}

/**
 * Generates structured prompts for local AI review.
 * User pastes the prompt into their local LLM and pastes the response back.
 */

export function buildTradeReviewPrompt(group: TradeGroup): string {
  const { trades, period } = group;
  const wins = trades.filter(t => t.outcome === 'WIN').length;
  const losses = trades.filter(t => t.outcome === 'LOSS').length;
  const totalPnl = trades.reduce((s, t) => s + (t.profitLossDollar ?? 0), 0);
  const avgRisk = trades.length > 0
    ? trades.reduce((s, t) => s + (t.riskPercent ?? 0), 0) / trades.length
    : 0;

  const tradeLines = trades.map((t, i) =>
    `${i + 1}. ${t.pair} ${t.direction} | Setup: ${t.setupType} | Entry: ${t.entryPrice ?? 'N/A'} | SL: ${t.stopLoss ?? 'N/A'} | Outcome: ${t.outcome ?? 'OPEN'} | P&L: $${(t.profitLossDollar ?? 0).toFixed(2)} | Risk: ${t.riskPercent ?? 'N/A'}% | Exec Score: ${t.executionScore ?? 'N/A'}`
  ).join('\n');

  return `You are a professional trading coach reviewing a trader's journal data.

PERIOD: ${period}
TRADES: ${trades.length} (${wins} wins, ${losses} losses)
TOTAL P&L: $${totalPnl.toFixed(2)}
AVG RISK: ${avgRisk.toFixed(2)}%

TRADE DETAILS:
${tradeLines}

Please provide a structured review in this EXACT JSON format:
{
  "overallScore": <0-10>,
  "disciplineScore": <0-10>,
  "riskScore": <0-10>,
  "consistencyScore": <0-10>,
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "recommendations": ["<action 1>", "<action 2>", "<action 3>"],
  "patterns": ["<pattern observed>"]
}

Focus on: risk management, execution discipline, setup selection, emotional patterns.
Be specific and reference the actual trades listed above.`;
}

export function buildSignalReviewPrompt(signal: Partial<Signal>): string {
  const confirmations = [
    signal.liquiditySwept && 'Liquidity Swept',
    signal.fvgPresent && 'FVG Present',
    signal.breakRetestConfirmed && 'Break & Retest Confirmed',
    signal.srRespected && 'S/R Respected',
    signal.rejectionCandle && 'Rejection Candle',
  ].filter(Boolean).join(', ') || 'None';

  const rrLine = signal.entryPrice && signal.stopLoss && signal.tp1
    ? `R:R to TP1: ${(Math.abs(signal.tp1 - signal.entryPrice) / Math.abs(signal.entryPrice - signal.stopLoss)).toFixed(2)}:1`
    : 'R:R: insufficient data';

  return `You are a professional trading signal analyst.

SIGNAL DETAILS:
- Symbol: ${signal.symbol ?? 'Unknown'}
- Direction: ${signal.direction ?? 'Unknown'}
- Timeframe: ${signal.timeframe ?? 'Unknown'}
- Setup: ${signal.setupReason ?? signal.signalType ?? 'Unknown'}
- Entry: ${signal.entryPrice ?? 'N/A'} | SL: ${signal.stopLoss ?? 'N/A'} | TP1: ${signal.tp1 ?? 'N/A'} | TP2: ${signal.tp2 ?? 'N/A'} | TP3: ${signal.tp3 ?? 'N/A'}
- ${rrLine}
- Confirmations: ${confirmations}
- Session: ${signal.session ?? 'Unknown'}
- Market Bias: ${signal.marketBias ?? 'Unknown'}
- Manual Score: ${signal.confidenceScore ?? 'Not scored'}

Evaluate this trading signal and respond in this EXACT JSON format:
{
  "score": <0-10>,
  "confidence": <0-10>,
  "reasoning": "<2-3 sentence analysis>",
  "risks": ["<risk 1>", "<risk 2>"],
  "opportunities": ["<opportunity>"],
  "recommendation": "<TAKE|SKIP|WATCH|REDUCE_SIZE>",
  "suggestedMaxContracts": <number or null>
}

Be conservative. Prioritize capital preservation. Only score above 7 if multiple confirmations align.`;
}

export function buildDisciplineAnalysisPrompt(trades: Trade[]): string {
  const planViolations = trades.filter(t => t.outsidePlan).length;
  const avgExecScore = trades.filter(t => t.executionScore != null).length > 0
    ? trades.reduce((s, t) => s + (t.executionScore ?? 0), 0) / trades.filter(t => t.executionScore != null).length
    : 0;

  const emotionPatterns = trades
    .map(t => t.psychology?.mainEmotion)
    .filter(Boolean)
    .reduce((acc: Record<string, number>, e) => {
      acc[e!] = (acc[e!] ?? 0) + 1;
      return acc;
    }, {});

  return `You are a trading psychology coach reviewing discipline data.

DISCIPLINE METRICS (${trades.length} trades):
- Plan violations: ${planViolations}/${trades.length} (${Math.round((planViolations / trades.length) * 100)}%)
- Avg execution score: ${avgExecScore.toFixed(1)}/100
- FOMO trades: ${trades.filter(t => t.psychology?.fomo).length}
- Revenge trades: t${trades.filter(t => t.psychology?.revengeTrade).length}
- Moved SL emotionally: ${trades.filter(t => t.psychology?.movedSlEmotionally).length}
- Closed too early: ${trades.filter(t => t.psychology?.closedTooEarly).length}
- Emotion distribution: ${JSON.stringify(emotionPatterns)}

Provide a psychology-focused coaching response in this EXACT JSON format:
{
  "overallScore": <0-10>,
  "disciplineScore": <0-10>,
  "strengths": ["<strength>"],
  "weaknesses": ["<weakness>"],
  "recommendations": ["<actionable step>"],
  "patterns": ["<behavioral pattern observed>"]
}`;
}

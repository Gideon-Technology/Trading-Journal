export type AIPeriodType = 'daily' | 'weekly' | 'monthly' | 'signal' | 'trade';
export type AIModelSource = 'local_prompt' | 'ollama' | 'openai' | 'anthropic' | 'other';

export interface AIReview {
  id: string;
  createdAt: string;
  updatedAt: string;

  periodType: AIPeriodType;
  periodStart: string;
  periodEnd: string;

  modelSource: AIModelSource;
  modelName?: string;

  prompt: string;
  rawResponse: string;

  overallScore?: number;       // 0–10
  disciplineScore?: number;    // 0–10
  riskScore?: number;          // 0–10
  consistencyScore?: number;   // 0–10

  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  patterns: string[];

  linkedEntityIds?: string[];  // trade/signal IDs reviewed
  notes?: string;
  reviewed: boolean;
}

export interface AISignalScore {
  id: string;
  createdAt: string;

  signalId: string;
  modelSource: AIModelSource;
  modelName?: string;

  prompt: string;
  rawResponse: string;

  score: number;               // 0–10
  confidence: number;          // 0–10
  reasoning: string;
  risks: string[];
  opportunities: string[];
  recommendation: 'TAKE' | 'SKIP' | 'WATCH' | 'REDUCE_SIZE';
  suggestedMaxContracts?: number;
}

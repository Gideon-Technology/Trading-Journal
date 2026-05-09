export type AutomationLevel = 0 | 1 | 2 | 3 | 4 | 5;
export type ReadinessGrade = 'NOT_READY' | 'COLLECTING_DATA' | 'PAPER_ONLY' | 'HUMAN_APPROVAL' | 'AUTOMATION_CANDIDATE';

export const AUTOMATION_LEVEL_LABELS: Record<AutomationLevel, string> = {
  0: 'Manual Journal Only',
  1: 'Signal Tracking',
  2: 'Paper Trading',
  3: 'AI Scoring (no execution)',
  4: 'Human-Approved Execution',
  5: 'Fully Automated (paper/demo only)',
};

export interface AutomationRules {
  allowedInstruments: string[];
  allowedSessions: string[];
  maxSignalsPerDay: number;
  maxTradesPerDay: number;
  maxRiskPerTrade: number;        // %
  minimumSignalScore: number;     // 0–10
  minimumAiScore: number;         // 0–10
  minimumAutomationReadiness: number;  // 0–100
  stopAfterLosses: number;
  dailyLossLimit: number;         // $
  weeklyLossLimit: number;        // $
  maxContracts: number;
  requireHumanApproval: boolean;
  paperModeOnly: boolean;
  allowLiveExecution: boolean;    // always false until explicitly enabled
  killSwitchEnabled: boolean;
  noTradeDuringNews: boolean;
  allowOnlyPlaybookSetups: boolean;
  allowedPlaybookSetupIds: string[];
  allowedAutomationLevel: AutomationLevel;
}

export const DEFAULT_AUTOMATION_RULES: AutomationRules = {
  allowedInstruments: [],
  allowedSessions: [],
  maxSignalsPerDay: 10,
  maxTradesPerDay: 6,
  maxRiskPerTrade: 1,
  minimumSignalScore: 7,
  minimumAiScore: 7,
  minimumAutomationReadiness: 75,
  stopAfterLosses: 3,
  dailyLossLimit: 1000,
  weeklyLossLimit: 2500,
  maxContracts: 5,
  requireHumanApproval: true,
  paperModeOnly: true,
  allowLiveExecution: false,
  killSwitchEnabled: false,
  noTradeDuringNews: true,
  allowOnlyPlaybookSetups: false,
  allowedPlaybookSetupIds: [],
  allowedAutomationLevel: 2,
};

export interface AutomationReadinessResult {
  score: number;
  grade: ReadinessGrade;
  reasons: string[];
  warnings: string[];
  recommendation: string;
}

export interface RiskEvaluationResult {
  allowed: boolean;
  riskScore: number;       // 0–100, higher = more risk
  reasons: string[];
  warnings: string[];
  positionSizeRecommendation: number;
  maxContracts: number;
  requiredHumanApproval: boolean;
}

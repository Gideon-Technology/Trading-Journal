export interface DailyReview {
  id: string;
  date: string;
  bestTrade: string;
  worstTrade: string;
  mainLesson: string;
  improveTomorrow: string;
  continueTomorrow: 'YES' | 'NO' | 'REDUCE SIZE';
  continueReason: string;
  notes: string;
}

export interface WeeklyReview {
  id: string;
  weekStart: string;
  weekEnd: string;
  bestSetup: string;
  worstSetup: string;
  biggestPsychChallenge: string;
  bestLesson: string;
  mainFocusNextWeek: string;
  onTrackMonthlyGoal: 'YES' | 'NO' | 'CLOSE';
  notes: string;
}

export interface MonthlyReview {
  id: string;
  month: string;
  year: number;
  biggestPsychWin: string;
  biggestPsychChallenge: string;
  mainImprovementNextMonth: string;
  tradingGoalNextMonth: string;
  increaseLotSize: boolean;
  increaseLotSizeReason: string;
  notes: string;
}

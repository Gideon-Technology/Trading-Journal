export type AuditSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
export type AuditAction =
  | 'SIGNAL_CREATED'
  | 'SIGNAL_UPDATED'
  | 'SIGNAL_CONVERTED'
  | 'SIGNAL_APPROVED'
  | 'SIGNAL_REJECTED'
  | 'SIGNAL_EXPIRED'
  | 'EXECUTION_SUBMITTED'
  | 'EXECUTION_FILLED'
  | 'EXECUTION_CANCELLED'
  | 'EXECUTION_ERROR'
  | 'KILL_SWITCH_ACTIVATED'
  | 'KILL_SWITCH_DEACTIVATED'
  | 'AUTOMATION_RULES_UPDATED'
  | 'RISK_CHECK_FAILED'
  | 'RISK_CHECK_PASSED'
  | 'AI_REVIEW_GENERATED'
  | 'AI_SCORE_SUBMITTED'
  | 'PAPER_TRADE_OPENED'
  | 'PAPER_TRADE_CLOSED'
  | 'APPROVAL_REQUESTED'
  | 'APPROVAL_GRANTED'
  | 'APPROVAL_DENIED'
  | 'TRADE_CREATED'
  | 'TRADE_UPDATED'
  | 'DAILY_LOSS_LIMIT_HIT'
  | 'WEEKLY_LOSS_LIMIT_HIT'
  | 'MAX_TRADES_PER_DAY_HIT'
  | 'STORAGE_MODE_CHANGED'
  | 'MIGRATION_COMPLETED'
  | 'SYSTEM_ERROR';

export interface AuditLog {
  id: string;
  createdAt: string;

  action: AuditAction;
  severity: AuditSeverity;
  message: string;

  entityType?: 'signal' | 'trade' | 'execution' | 'approval' | 'system';
  entityId?: string;

  details?: Record<string, unknown>;
  userId?: string;
}

export type ExecutionMode = 'paper' | 'mock' | 'live';
export type ExecutionStatus = 'PENDING' | 'SUBMITTED' | 'FILLED' | 'PARTIAL' | 'CANCELLED' | 'REJECTED' | 'ERROR';
export type ExecutionAdapterType = 'paper' | 'mock';

export interface OrderRequest {
  signalId: string;
  symbol: string;
  direction: 'BUY' | 'SELL' | 'LONG' | 'SHORT';
  entryPrice: number;
  stopLoss: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  contracts: number;
  mode: ExecutionMode;
  riskPercent: number;
  accountSize: number;
  notes?: string;
}

export interface ExecutionRecord {
  id: string;
  createdAt: string;
  updatedAt: string;

  signalId: string;
  linkedTradeId?: string;

  adapterType: ExecutionAdapterType;
  mode: ExecutionMode;
  status: ExecutionStatus;

  symbol: string;
  direction: 'BUY' | 'SELL' | 'LONG' | 'SHORT';
  requestedEntry: number;
  filledEntry?: number;
  stopLoss: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  contracts: number;
  riskPercent: number;
  accountSize: number;

  submittedAt?: string;
  filledAt?: string;
  closedAt?: string;

  exitPrice?: number;
  realizedPnl?: number;
  realizedRR?: number;

  errorMessage?: string;
  brokerOrderId?: string;
  notes?: string;
}

export interface ExecutionAdapterInterface {
  type: ExecutionAdapterType;
  submit(order: OrderRequest): Promise<ExecutionRecord>;
  cancel(recordId: string): Promise<ExecutionRecord>;
  getStatus(recordId: string): Promise<ExecutionRecord>;
}

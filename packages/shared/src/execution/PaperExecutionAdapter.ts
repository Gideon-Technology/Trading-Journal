import type { OrderRequest, ExecutionRecord } from '../types/execution';
import { BaseExecutionAdapter } from './ExecutionAdapter';

/**
 * Paper execution adapter — simulates fills instantly, never touches a real broker.
 * Stores records in-memory; caller persists to store/PocketBase.
 */
export class PaperExecutionAdapter extends BaseExecutionAdapter {
  readonly type = 'paper' as const;

  private records = new Map<string, ExecutionRecord>();

  async submit(order: OrderRequest): Promise<ExecutionRecord> {
    const record: ExecutionRecord = {
      id: this.makeId(),
      createdAt: this.now(),
      updatedAt: this.now(),
      signalId: order.signalId,
      adapterType: 'paper',
      mode: 'paper',
      status: 'FILLED',
      symbol: order.symbol,
      direction: order.direction,
      requestedEntry: order.entryPrice,
      filledEntry: order.entryPrice,   // paper: filled at requested price
      stopLoss: order.stopLoss,
      tp1: order.tp1,
      tp2: order.tp2,
      tp3: order.tp3,
      contracts: order.contracts,
      riskPercent: order.riskPercent,
      accountSize: order.accountSize,
      submittedAt: this.now(),
      filledAt: this.now(),
      notes: order.notes,
    };
    this.records.set(record.id, record);
    return record;
  }

  async cancel(recordId: string): Promise<ExecutionRecord> {
    const record = this.records.get(recordId);
    if (!record) throw new Error(`Paper record ${recordId} not found`);
    const updated: ExecutionRecord = {
      ...record,
      status: 'CANCELLED',
      updatedAt: this.now(),
    };
    this.records.set(recordId, updated);
    return updated;
  }

  async getStatus(recordId: string): Promise<ExecutionRecord> {
    const record = this.records.get(recordId);
    if (!record) throw new Error(`Paper record ${recordId} not found`);
    return record;
  }

  /**
   * Close a paper trade with final P&L.
   */
  async close(recordId: string, exitPrice: number): Promise<ExecutionRecord> {
    const record = this.records.get(recordId);
    if (!record) throw new Error(`Paper record ${recordId} not found`);
    if (!record.filledEntry) throw new Error('No filled entry price');

    const isBuy = record.direction === 'BUY' || record.direction === 'LONG';
    const priceDiff = isBuy
      ? exitPrice - record.filledEntry
      : record.filledEntry - exitPrice;

    const realizedPnl = priceDiff * record.contracts;
    const risk = Math.abs(record.filledEntry - record.stopLoss);
    const realizedRR = risk > 0 ? priceDiff / risk : 0;

    const updated: ExecutionRecord = {
      ...record,
      status: 'FILLED',
      exitPrice,
      realizedPnl,
      realizedRR: Math.round(realizedRR * 100) / 100,
      closedAt: this.now(),
      updatedAt: this.now(),
    };
    this.records.set(recordId, updated);
    return updated;
  }
}

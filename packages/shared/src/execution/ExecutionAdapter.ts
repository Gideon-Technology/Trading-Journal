import type { OrderRequest, ExecutionRecord, ExecutionAdapterInterface } from '../types/execution';

export type { OrderRequest, ExecutionRecord, ExecutionAdapterInterface };

export abstract class BaseExecutionAdapter implements ExecutionAdapterInterface {
  abstract type: import('../types/execution').ExecutionAdapterType;

  protected makeId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  protected now(): string {
    return new Date().toISOString();
  }

  abstract submit(order: OrderRequest): Promise<ExecutionRecord>;
  abstract cancel(recordId: string): Promise<ExecutionRecord>;
  abstract getStatus(recordId: string): Promise<ExecutionRecord>;
}

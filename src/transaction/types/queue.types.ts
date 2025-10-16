import { Account } from '@prisma/client';

export type MonitorBatchJob = {
  batchIndex: number;
  batchSize: number;
  offset: number;
};

export type SuccessfulTransactionJob = {
  account: Partial<Account>;
  amount: number;
  tronId: string;
  timestamp: Date;
  originalAmount: number;
};

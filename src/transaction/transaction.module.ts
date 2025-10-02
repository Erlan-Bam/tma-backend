import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TransactionCronService } from './services/cron.service';
import { TransactionTronService } from './services/tron.service';
import { TransactionQueue } from './transaction.queue';
import { TransactionController } from './transaction.controller';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'transaction-queue',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
  ],
  providers: [TransactionCronService, TransactionTronService, TransactionQueue],
  controllers: [TransactionController],
})
export class TransactionModule {}

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/shared/services/prisma.service';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';

@Injectable()
export class TransactionCronService {
  private readonly logger = new Logger(TransactionCronService.name);
  private readonly BATCH_SIZE = 5;
  private readonly CONCURRENT_BATCHES = 2;

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('transaction-queue') private queue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleWalletMonitoring() {
    try {
      const wallets = await this.prisma.account.count();

      this.logger.log(`📊 Scheduling monitoring for ${wallets} wallets`);

      const totalBatches = Math.ceil(wallets / this.BATCH_SIZE);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const delay = (batchIndex % this.CONCURRENT_BATCHES) * 1500;

        await this.queue.add(
          'monitor-wallet-batch',
          {
            batchIndex: batchIndex,
            batchSize: this.BATCH_SIZE,
            offset: batchIndex * this.BATCH_SIZE,
          },
          {
            delay,
            attempts: 2,
            backoff: {
              type: 'exponential',
              delay: 3000,
            },
            removeOnComplete: true,
            removeOnFail: 100,
          },
        );
      }

      this.logger.log(
        `🚀 Scheduled ${totalBatches} batches with ${this.CONCURRENT_BATCHES} concurrent workers`,
      );
    } catch (error) {
      this.logger.error('Error scheduling wallet monitoring:', error);
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async monitorQueueHealth() {
    try {
      const waiting = await this.queue.getWaiting();
      const active = await this.queue.getActive();
      const failed = await this.queue.getFailed();

      this.logger.log(
        `📊 Queue Status - Waiting: ${waiting.length}, Active: ${active.length}, Failed: ${failed.length}`,
      );

      if (failed.length > 100) {
        this.logger.warn(
          `⚠️ High failure rate detected: ${failed.length} failed jobs`,
        );
      }
    } catch (error) {
      this.logger.error('Error monitoring queue health:', error);
    }
  }
}

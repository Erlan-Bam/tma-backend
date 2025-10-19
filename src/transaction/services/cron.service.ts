import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/shared/services/prisma.service';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';

@Injectable()
export class TransactionCronService {
  private readonly logger = new Logger(TransactionCronService.name);
  private readonly BATCH_SIZE = 5;
  private readonly BATCH_DELAY_MS = 1100;
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('transaction-queue') private queue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleWalletMonitoring() {
    if (this.isRunning) {
      this.logger.warn(
        '⏸️ Previous wallet monitoring still running, skipping this cycle to prevent overlap',
      );
      return;
    }

    this.isRunning = true;
    try {
      const time = new Date(Date.now() - 10 * 60 * 1000);

      const wallets = await this.prisma.account.count({
        where: {
          checkedAt: {
            gte: time,
          },
        },
      });

      this.logger.log(
        `📊 Scheduling monitoring for ${wallets} active wallets (logged in within last 10 minutes)`,
      );

      if (wallets === 0) {
        this.logger.log('✅ No active wallets to monitor at this time');
        return;
      }

      const totalBatches = Math.ceil(wallets / this.BATCH_SIZE);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const delay = batchIndex * this.BATCH_DELAY_MS;

        await this.queue.add(
          'monitor-wallet-batch',
          {
            batchIndex: batchIndex,
            batchSize: this.BATCH_SIZE,
            offset: batchIndex * this.BATCH_SIZE,
            time: time.toISOString(),
          },
          {
            delay,
            attempts: 5,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
            removeOnComplete: true,
            removeOnFail: 100,
          },
        );
      }

      this.logger.log(
        `🚀 Scheduled ${totalBatches} batches (${this.BATCH_SIZE} wallets per batch, ${this.BATCH_DELAY_MS}ms between batches)`,
      );
    } catch (error) {
      this.logger.error('Error scheduling wallet monitoring:', error);
    } finally {
      this.isRunning = false;
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

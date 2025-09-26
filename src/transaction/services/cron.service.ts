import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/shared/services/prisma.service';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';

@Injectable()
export class TransactionCronService {
  private readonly logger = new Logger(TransactionCronService.name);
  private readonly BATCH_SIZE = 4;
  private readonly CONCURRENT_BATCHES = 1;

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('transaction-queue') private queue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleWalletMonitoring() {
    try {
      const wallets = await this.prisma.account.count({
        where: {
          address: { not: null },
          childUserId: { not: null },
        },
      });

      this.logger.log(`📊 Scheduling monitoring for ${wallets} wallets`);

      const totalBatches = Math.ceil(wallets / this.BATCH_SIZE);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const delay = (batchIndex % this.CONCURRENT_BATCHES) * 12000;

        await this.queue.add(
          'monitor-wallet-batch',
          {
            batchIndex,
            batchSize: this.BATCH_SIZE,
            offset: batchIndex * this.BATCH_SIZE,
          },
          {
            delay,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
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
}

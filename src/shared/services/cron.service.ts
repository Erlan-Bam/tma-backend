import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TransactionStatus } from '@prisma/client';
import { PrismaService } from 'src/shared/services/prisma.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredTransactions() {
    try {
      const transactions = await this.prisma.transaction.updateMany({
        where: {
          status: TransactionStatus.PENDING,
          createdAt: { lt: new Date(Date.now() - 2 * 60 * 60_000) },
        },
        data: { status: TransactionStatus.FAILED },
      });

      this.logger.log(`Expired transactions updated: ${transactions.count}`);
    } catch (error) {
      this.logger.error('Error in handleExpiredTransactions: ' + error);
    }
  }
}

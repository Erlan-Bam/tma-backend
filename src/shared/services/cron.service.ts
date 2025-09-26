import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TransactionStatus } from '@prisma/client';
import { PrismaService } from 'src/shared/services/prisma.service';
import { ZephyrService } from './zephyr.service';

@Injectable()
export class CronService {
  private readonly TRANSACTION_EXPIRE_HOURS = 24 * 60 * 60 * 1000;
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private zephyr: ZephyrService,
  ) {}

  @Cron(CronExpression.EVERY_2_HOURS)
  async handleExpiredTransactions() {
    try {
      const transactions = await this.prisma.transaction.updateMany({
        where: {
          status: TransactionStatus.PENDING,
          createdAt: {
            lt: new Date(Date.now() - this.TRANSACTION_EXPIRE_HOURS),
          },
        },
        data: { status: TransactionStatus.FAILED },
      });

      this.logger.log(`Expired transactions updated: ${transactions.count}`);
    } catch (error) {
      this.logger.error('Error in handleExpiredTransactions: ' + error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredTopupApplications() {
    try {
      const now = new Date();
      const { applications } = await this.zephyr.getAllTopupApplications(0);

      const tasks = applications
        .filter(
          (app) =>
            new Date(app.createTime).getTime() <
            now.getTime() - this.TRANSACTION_EXPIRE_HOURS,
        )
        .map(async (app) => {
          try {
            const result = await this.zephyr.rejectTopupApplication(app.id);
            if (result.status === 'error') {
              this.logger.error(
                `Failed to reject topup application: ${app.id}, reason: ${result.message}`,
              );
            } else {
              this.logger.log(`Rejected expired topup application: ${app.id}`);
            }
          } catch (error) {
            this.logger.error(
              `Error rejecting topup application ${app.id}: ` + error,
            );
          }
        });

      await Promise.allSettled(tasks);
    } catch (error) {
      this.logger.error('Error in handleExpiredTopupApplications: ' + error);
    }
  }
}

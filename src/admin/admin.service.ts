import { HttpException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/shared/services/prisma.service';
import { TronService } from 'src/shared/services/tron.service';
import { ZephyrService } from 'src/shared/services/zephyr.service';
import { TransactionQueue } from 'src/transaction/transaction.queue';
import { TronAddress } from 'src/transaction/types/tron.types';
import { UpdateCommissionDto } from './dto/update-commision.dto';
import { CommissionName, TransactionStatus } from '@prisma/client';
import { CardService } from 'src/card/card.service';
import { GetStatsDto } from './dto/get-stats.dto';
import { MaintenanceService } from 'src/shared/services/maintenance.service';
import { GetUserTransactionsDto } from './dto/get-user-transactions.dto';
import { TopupUserAccountDto } from './dto/topup-user-account.dto';
import { PaginationDto } from 'src/shared/dto/pagination.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  constructor(
    private zephyr: ZephyrService,
    private prisma: PrismaService,
    private tron: TronService,
    private card: CardService,
    private transactionQueue: TransactionQueue,
    private maintenanceService: MaintenanceService,
  ) {}

  async getAllCards() {
    try {
      return await this.zephyr.getAllCards();
    } catch (error) {
      this.logger.error(`Error when getting all cards, error: ${error}`);
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async getUserTransactions(query: GetUserTransactionsDto) {
    try {
      return await this.zephyr.getUserTransactions(query);
    } catch (error) {
      this.logger.error(
        `Error when getting user transactions for childUserId=${query.childUserId}, error: ${error}`,
      );
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async getAllAccounts(query: PaginationDto) {
    try {
      const accounts = await this.prisma.account.findMany({
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      });

      return accounts.map((account) => ({
        ...account,
        telegramId: account.telegramId.toString(),
      }));
    } catch (error) {
      this.logger.error(`Error when getting all accounts, error: ${error}`);
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async getUserCards(childUserId: string) {
    try {
      return await this.zephyr.getActiveCards(childUserId);
    } catch (error) {
      this.logger.error(
        `Error when getting user cards for childUserId=${childUserId}, error: ${error}`,
      );
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async getUserAccount(childUserId: string) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { childUserId: childUserId },
        select: {
          id: true,
          telegramId: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          childUserId: true,
          isBanned: true,
        },
      });

      if (!account) {
        throw new HttpException('Account not found', 404);
      }

      const zephyrAccount = await this.zephyr.getChildAccount(childUserId);

      return {
        ...account,
        telegramId: account.telegramId.toString(),
        ...zephyrAccount,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error when getting user account for childUserId=${childUserId}, error: ${error}`,
      );
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async disableUser(userId: string) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { id: userId },
      });

      if (!account) {
        throw new HttpException('Account not found', 404);
      }

      await this.prisma.account.update({
        where: { id: userId },
        data: { isBanned: true },
      });

      await this.zephyr.disableUser(account.childUserId);

      return {
        status: 'success',
        message: 'User disabled successfully in both database and Zephyr',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error when disabling user userId=${userId}, error: ${error}`,
      );
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async enableUser(userId: string) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { id: userId },
      });

      if (!account) {
        throw new HttpException('Account not found', 404);
      }

      await this.prisma.account.update({
        where: { id: userId },
        data: { isBanned: false },
      });

      const zephyrResult = await this.zephyr.enableUser(account.childUserId);

      return {
        status: 'success',
        message: 'User enabled successfully in both database and Zephyr',
        zephyrResponse: zephyrResult,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error when enabling user userId=${userId}, error: ${error}`,
      );
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async transferUSDT(userId: string) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { id: userId },
        select: { address: true, privateKey: true },
      });

      if (!account) {
        throw new HttpException('Account not found', 404);
      }

      const address = account.address as TronAddress;

      return await this.tron.transferUSDTToMainWallet({
        address: address.base58,
        privateKey: account.privateKey,
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error when transferring USDT for userId=${userId}, error: ${error}`,
      );
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async transferTRX(userId: string) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { id: userId },
        select: { address: true, privateKey: true },
      });

      if (!account) {
        throw new HttpException('Account not found', 404);
      }

      const address = account.address as TronAddress;

      return await this.tron.transferTRXToMainWallet({
        address: address.base58,
        privateKey: account.privateKey,
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error when transferring TRX for userId=${userId}, error: ${error}`,
      );
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async transferTRXToSubWallet(userId: string, amount: number) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { id: userId },
        select: { address: true },
      });

      if (!account) {
        throw new HttpException('Account not found', 404);
      }

      const address = account.address as TronAddress;

      return await this.tron.transferTRXToSubWallet({
        address: address.base58,
        amount: amount,
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error when transferring TRX to sub-wallet for userId=${userId}, error: ${error}`,
      );
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async getGeneralStats(query: GetStatsDto) {
    try {
      const where: any = { status: TransactionStatus.SUCCESS };

      if (query.startDate || query.endDate) {
        where.createdAt = {};

        if (query.startDate) {
          where.createdAt.gte = new Date(query.startDate);
        }

        if (query.endDate) {
          where.createdAt.lte = new Date(query.endDate);
        }
      }

      const [totalAccounts, totalTransactions, cards, amount] =
        await Promise.all([
          this.prisma.account.count(),
          this.prisma.transaction.count(),
          this.getAllCards(),
          this.prisma.transaction.aggregate({
            _sum: { amount: true },
            where: where,
          }),
        ]);

      return {
        totalAccounts: totalAccounts,
        totalTransactions: totalTransactions,
        totalCards: cards.total,
        totalAmount: amount._sum.amount,
        zephyrFee: cards.total * 2,
      };
    } catch (error) {
      this.logger.error(`Error when getting general stats, error: ${error}`);
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async getUserBalance(userId: string) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!account) {
        throw new HttpException('Account not found', 404);
      }

      const amount = await this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { accountId: userId, status: TransactionStatus.SUCCESS },
      });

      return {
        balance: amount._sum.amount,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error when getting account by telegram id: ' + error);
      throw new HttpException('Something went wrong', 500);
    }
  }

  async getTronBalance(id: string) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { id: id },
        select: { address: true, privateKey: true },
      });

      if (!account) {
        throw new HttpException('Account not found', 404);
      }
      const address = account.address as TronAddress;

      return await this.tron.getTronBalance(address.base58);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        'Error when getting general balance with commision by telegram id: ' +
          error,
      );
      throw new HttpException('Something went wrong', 500);
    }
  }

  async getZephyrBalance(userId: string) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { id: userId },
        select: { childUserId: true },
      });

      if (!account) {
        throw new HttpException('Account not found', 404);
      }

      return await this.zephyr.getAccountBalance(account.childUserId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error when getting Zephyr balance for userId=${userId}, error: ${error}`,
      );
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async getCardFee() {
    try {
      const commission = await this.prisma.commission.findUnique({
        where: { name: CommissionName.CARD_FEE },
      });

      return { commission };
    } catch (error) {
      this.logger.error(`Error when getting card fee, error: ${error}`);
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async updateCardFee(data: UpdateCommissionDto) {
    try {
      const commission = await this.prisma.commission.upsert({
        where: { name: CommissionName.CARD_FEE },
        update: {
          type: data.type,
          rate: data.rate,
        },
        create: {
          name: CommissionName.CARD_FEE,
          type: data.type,
          rate: data.rate,
        },
      });

      try {
        await this.card.loadCardFee();
      } catch (error) {
        this.logger.error(
          `Failed to reload card fee in transaction queue in admin service: ${error}`,
        );
      }

      return { commission };
    } catch (error) {
      this.logger.error(`Error when updating card fee, error: ${error}`);
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async getTransactionFee() {
    try {
      const commission = await this.prisma.commission.findUnique({
        where: { name: CommissionName.TRANSACTION_FEE },
      });

      return { commission };
    } catch (error) {
      this.logger.error(`Error when getting transaction fee, error: ${error}`);
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async updateTransactionFee(data: UpdateCommissionDto) {
    try {
      const commission = await this.prisma.commission.upsert({
        where: { name: CommissionName.TRANSACTION_FEE },
        update: {
          type: data.type,
          rate: data.rate,
        },
        create: {
          name: CommissionName.TRANSACTION_FEE,
          type: data.type,
          rate: data.rate,
        },
      });

      try {
        await this.transactionQueue.loadTransactionFee();
      } catch (error) {
        this.logger.error(
          `Failed to reload transaction fee in transaction queue in admin service: ${error}`,
        );
      }

      return { commission };
    } catch (error) {
      this.logger.error(`Error when updating card fee, error: ${error}`);
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async getMaintenanceStatus() {
    try {
      const isMaintenanceMode = this.maintenanceService.getMaintenanceStatus();
      return {
        isTechWork: isMaintenanceMode,
        message: isMaintenanceMode
          ? 'System is under maintenance'
          : 'System is operational',
      };
    } catch (error) {
      this.logger.error(
        `Error when getting maintenance status, error: ${error}`,
      );
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async enableMaintenance() {
    try {
      this.maintenanceService.enableMaintenance();
      return {
        isTechWork: true,
        message: 'Maintenance mode enabled',
      };
    } catch (error) {
      this.logger.error(`Error when enabling maintenance, error: ${error}`);
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async disableMaintenance() {
    try {
      this.maintenanceService.disableMaintenance();
      return {
        isTechWork: false,
        message: 'Maintenance mode disabled',
      };
    } catch (error) {
      this.logger.error(`Error when disabling maintenance, error: ${error}`);
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async setMaintenance(isTechWork: boolean) {
    try {
      this.maintenanceService.setMaintenanceMode(isTechWork);
      return {
        isTechWork: isTechWork,
        message: isTechWork
          ? 'Maintenance mode enabled'
          : 'Maintenance mode disabled',
      };
    } catch (error) {
      this.logger.error(`Error when setting maintenance, error: ${error}`);
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async getWebsiteTechWorkStatus() {
    try {
      const isWebsiteTechWorkMode =
        this.maintenanceService.getWebsiteTechWorkStatus();
      return {
        isWebsiteTechWork: isWebsiteTechWorkMode,
        message: isWebsiteTechWorkMode
          ? 'Website is under technical work'
          : 'Website is operational',
      };
    } catch (error) {
      this.logger.error(
        `Error when getting website tech work status, error: ${error}`,
      );
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async enableWebsiteTechWork() {
    try {
      this.maintenanceService.enableWebsiteTechWork();
      return {
        isWebsiteTechWork: true,
        message: 'Website tech work mode enabled',
      };
    } catch (error) {
      this.logger.error(
        `Error when enabling website tech work, error: ${error}`,
      );
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async disableWebsiteTechWork() {
    try {
      this.maintenanceService.disableWebsiteTechWork();
      return {
        isWebsiteTechWork: false,
        message: 'Website tech work mode disabled',
      };
    } catch (error) {
      this.logger.error(
        `Error when disabling website tech work, error: ${error}`,
      );
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async setWebsiteTechWork(isWebsiteTechWork: boolean) {
    try {
      this.maintenanceService.setWebsiteTechWorkMode(isWebsiteTechWork);
      return {
        isWebsiteTechWork: isWebsiteTechWork,
        message: isWebsiteTechWork
          ? 'Website tech work mode enabled'
          : 'Website tech work mode disabled',
      };
    } catch (error) {
      this.logger.error(
        `Error when setting website tech work, error: ${error}`,
      );
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async getQueueStatus() {
    try {
      const queue = this.transactionQueue['queue'];
      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const failed = await queue.getFailed();
      const completed = await queue.getCompleted();
      const delayed = await queue.getDelayed();

      return {
        status: 'success',
        queue: {
          waiting: waiting.length,
          active: active.length,
          failed: failed.length,
          completed: completed.length,
          delayed: delayed.length,
        },
      };
    } catch (error) {
      this.logger.error(`Error when getting queue status, error: ${error}`);
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async getFailedJobs(limit: number = 100) {
    try {
      const queue = this.transactionQueue['queue'];
      const failed = await queue.getFailed(0, limit - 1);

      const failedJobsDetails = failed.map((job) => ({
        id: job.id,
        name: job.name,
        data: job.data,
        failedReason: job.failedReason,
        stacktrace: job.stacktrace,
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
      }));

      return {
        status: 'success',
        count: failed.length,
        jobs: failedJobsDetails,
      };
    } catch (error) {
      this.logger.error(`Error when getting failed jobs, error: ${error}`);
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async retryFailedJob(jobId: string) {
    try {
      const queue = this.transactionQueue['queue'];
      const job = await queue.getJob(jobId);

      if (!job) {
        throw new HttpException('Job not found', 404);
      }

      await job.retry();

      return {
        status: 'success',
        message: `Job ${jobId} has been queued for retry`,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error when retrying failed job, error: ${error}`);
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async retryAllFailedJobs() {
    try {
      const queue = this.transactionQueue['queue'];
      const failed = await queue.getFailed();

      let retriedCount = 0;
      for (const job of failed) {
        try {
          await job.retry();
          retriedCount++;
        } catch (error) {
          this.logger.error(`Failed to retry job ${job.id}: ${error.message}`);
        }
      }

      return {
        status: 'success',
        message: `Retried ${retriedCount} out of ${failed.length} failed jobs`,
        retriedCount,
        totalFailed: failed.length,
      };
    } catch (error) {
      this.logger.error(`Error when retrying all failed jobs, error: ${error}`);
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async clearFailedJobs() {
    try {
      const queue = this.transactionQueue['queue'];
      const failed = await queue.getFailed();

      for (const job of failed) {
        await job.remove();
      }

      return {
        status: 'success',
        message: `Cleared ${failed.length} failed jobs`,
        clearedCount: failed.length,
      };
    } catch (error) {
      this.logger.error(`Error when clearing failed jobs, error: ${error}`);
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async removeFailedJob(jobId: string) {
    try {
      const queue = this.transactionQueue['queue'];
      const job = await queue.getJob(jobId);

      if (!job) {
        throw new HttpException('Job not found', 404);
      }

      await job.remove();

      return {
        status: 'success',
        message: `Job ${jobId} has been removed`,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error when removing failed job, error: ${error}`);
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async topupUserAccount(data: TopupUserAccountDto) {
    try {
      // Step 1: Create topup application
      this.logger.log(
        `Starting topup process for childUserId=${data.childUserId}, amount=${data.amount}`,
      );

      const createResult = await this.zephyr.topupWallet(
        data.childUserId,
        data.amount,
      );

      if (createResult.status !== 'success') {
        throw new HttpException(
          createResult.message || 'Failed to create topup application',
          400,
        );
      }

      this.logger.log(
        `Topup application created successfully for childUserId=${data.childUserId}`,
      );

      const { applications } = await this.zephyr.getTopupApplications(
        data.childUserId,
        { page: 1, limit: 5, status: 0 },
      );

      if (!applications || applications.length === 0) {
        throw new HttpException('Failed to retrieve topup applications', 500);
      }

      const latestApplication = applications.find(
        (app) => app.amount === data.amount,
      );

      if (!latestApplication) {
        throw new HttpException(
          'Failed to find the created topup application',
          500,
        );
      }

      this.logger.log(
        `Found topup application with id=${latestApplication.id}`,
      );

      // Step 3: Approve the application
      const approveResult = await this.zephyr.acceptTopupApplication(
        latestApplication.id,
      );

      if (approveResult.status !== 'success') {
        throw new HttpException(
          approveResult.message || 'Failed to approve topup application',
          400,
        );
      }

      this.logger.log(
        `Topup application approved successfully for childUserId=${data.childUserId}, applicationId=${latestApplication.id}`,
      );

      // Step 4: Get updated balance
      const balanceResult = await this.zephyr.getAccountBalance(
        data.childUserId,
      );

      return {
        status: 'success',
        message: 'User account topped up successfully',
        data: {
          childUserId: data.childUserId,
          amount: data.amount,
          applicationId: latestApplication.id,
          newBalance: balanceResult.balance,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error when topping up user account for childUserId=${data.childUserId}, error: ${error}`,
      );
      throw new HttpException('Something Went Wrong', 500);
    }
  }
}

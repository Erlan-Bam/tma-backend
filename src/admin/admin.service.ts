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

  async getAllAccounts() {
    try {
      const accounts = await this.prisma.account.findMany({});

      return accounts;
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

      const [totalAccounts, totalTransactions, amount] = await Promise.all([
        this.prisma.account.count(),
        this.prisma.transaction.count(),
        this.prisma.transaction.aggregate({
          _sum: { amount: true },
          where: where,
        }),
      ]);

      return {
        totalAccounts: totalAccounts,
        totalTransactions: totalTransactions,
        totalAmount: amount._sum.amount,
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

      return await this.tron.getTronBalance(address.base58, account.privateKey);
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
      const isMaintenanceMode =
        this.maintenanceService.getMaintenanceStatus();
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
}

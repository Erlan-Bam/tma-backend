import { HttpException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/shared/services/prisma.service';
import { TronService } from 'src/shared/services/tron.service';
import { ZephyrService } from 'src/shared/services/zephyr.service';
import { TronAddress } from 'src/transaction/types/tron.types';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  constructor(
    private zephyr: ZephyrService,
    private prisma: PrismaService,
    private tron: TronService,
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
      this.logger.error('Error when getting account by telegram id: ' + error);
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
}

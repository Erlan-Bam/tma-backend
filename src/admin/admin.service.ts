import { HttpException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/shared/services/prisma.service';
import { ZephyrService } from 'src/shared/services/zephyr.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  constructor(
    private zephyr: ZephyrService,
    private prisma: PrismaService,
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

      if (!account.childUserId) {
        throw new HttpException(
          'Zephyr integration not available for this account',
          400,
        );
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

      if (!account.childUserId) {
        throw new HttpException(
          'Zephyr integration not available for this account',
          400,
        );
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
}

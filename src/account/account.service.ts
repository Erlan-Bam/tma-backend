import { HttpException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/shared/services/prisma.service';
import { ZephyrService } from 'src/shared/services/zephyr.service';
import { GetTopupApplications } from './dto/get-topup-applications.dto';
import { TronAddress } from 'src/transaction/types/tron.types';
import { ConfigService } from '@nestjs/config';
import { BotService } from 'src/shared/services/bot.service';

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);
  constructor(
    private zephyr: ZephyrService,
    private prisma: PrismaService,
    private bot: BotService,
  ) {}

  async topupWallet(id: string) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { id: id },
        select: { address: true },
      });
      if (!account) {
        throw new HttpException('Account not found', 404);
      }
      const address = account.address as TronAddress;

      return {
        currency: 'USDT',
        address: address.base58,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error when topping up wallet: ' + error);
      throw new HttpException('Something went wrong', 500);
    }
  }
  async getAccountById(id: string) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { id: id },
      });

      if (!account) {
        throw new HttpException('Account not found', 404);
      }

      return await this.zephyr.getChildAccount(account.childUserId);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error when getting account by telegram id: ' + error);
      throw new HttpException('Something went wrong', 500);
    }
  }

  async getAccountBalance(id: string) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { id: id },
      });

      if (!account) {
        throw new HttpException('Account not found', 404);
      }

      return await this.zephyr.getAccountBalance(account.childUserId);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error when getting account by telegram id: ' + error);
      throw new HttpException('Something went wrong', 500);
    }
  }

  async getTopupTransactions(id: string) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { id: id },
      });

      if (!account) {
        throw new HttpException('Account not found', 404);
      }

      return await this.zephyr.getTopupTransactions(account.childUserId);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        'Error when getting topup transactions by telegram id: ' + error,
      );
      throw new HttpException('Something went wrong', 500);
    }
  }

  async getTopupApplications(id: string, data: GetTopupApplications) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { id: id },
      });

      if (!account) {
        throw new HttpException('Account not found', 404);
      }

      return await this.zephyr.getTopupApplications(account.childUserId, data);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error when getting account by telegram id: ' + error);
      throw new HttpException('Something went wrong', 500);
    }
  }

  async getReferralLink(id: string) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { id: id },
      });

      if (!account) {
        throw new HttpException('Account not found', 404);
      }

      const bot = await this.bot.getBotInfo();
      const referralLink = `https://t.me/${bot.username}?start=${account.id}`;

      return {
        referralLink: referralLink,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error when getting referral link: ' + error);
      throw new HttpException('Something went wrong', 500);
    }
  }
}

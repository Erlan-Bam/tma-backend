import { HttpException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/shared/services/prisma.service';
import { ZephyrService } from 'src/shared/services/zephyr.service';
import { TopupWalletDto } from './dto/topup-wallet.dto';
import { GetTopupApplications } from './dto/get-topup-applications.dto';

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);
  constructor(
    private zephyr: ZephyrService,
    private prisma: PrismaService,
  ) {}
  async getAccountById(id: string) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { id: id },
      });

      if (!account) {
        throw new HttpException('Account not found', 404);
      }

      this.logger.debug('Account: ' + JSON.stringify(account));
      return await this.zephyr.getChildAccount(account.childUserId);
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

      this.logger.debug('Account: ' + JSON.stringify(account));
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

      this.logger.debug('Account: ' + JSON.stringify(account));
      return await this.zephyr.getTopupApplications(account.childUserId, data);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error when getting account by telegram id: ' + error);
      throw new HttpException('Something went wrong', 500);
    }
  }

  async topupWallet(id: string, data: TopupWalletDto) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { id: id },
      });

      if (!account) {
        throw new HttpException('Account not found', 404);
      }

      this.logger.debug('Account: ' + JSON.stringify(account));
      const result = await this.zephyr.topupWallet(
        account.childUserId,
        data.amount,
      );
      if (result.status === 'success') {
        return result;
      } else {
        throw new HttpException(result.message, 400);
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error when getting account by telegram id: ' + error);
      throw new HttpException('Something went wrong', 500);
    }
  }
}

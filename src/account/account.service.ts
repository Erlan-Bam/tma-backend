import { HttpException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/shared/services/prisma.service';
import { ZephyrService } from 'src/shared/services/zephyr.service';

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);
  constructor(
    private zephyr: ZephyrService,
    private prisma: PrismaService,
  ) {}
  async getAccountByTelegramId(id: number) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { telegramId: id },
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
}

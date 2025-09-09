import { HttpException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/shared/services/prisma.service';
import { ZephyrService } from 'src/shared/services/zephyr.service';

@Injectable()
export class CardService {
  private readonly logger = new Logger(CardService.name);
  constructor(
    private prisma: PrismaService,
    private zephyr: ZephyrService,
  ) {}

  async getProductList(id: string) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { id: id },
      });

      if (!account) {
        throw new HttpException('Account not found', 404);
      }

      this.logger.debug('Account: ' + JSON.stringify(account));
      return await this.zephyr.getProductList(account.childUserId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error when getting card product list for userId=${id}, error: ${error}`,
      );
      throw new HttpException('Something Went Wrong', 500);
    }
  }
}

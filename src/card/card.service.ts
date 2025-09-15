import { HttpException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/shared/services/prisma.service';
import { ZephyrService } from 'src/shared/services/zephyr.service';
import { CreateCardDto } from './dto/create-card.dto';

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

      if (!account.childUserId) {
        throw new HttpException(
          'Zephyr integration not available for this account',
          400,
        );
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

  async createCard(id: string, createCardDto: CreateCardDto) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { id: id },
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

      const response = await this.zephyr.createCard(
        account.childUserId,
        createCardDto,
      );

      return response;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error when creating card for userId=${id}, error: ${error}`,
      );
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async getActiveCards(id: string) {
    this.logger.log(`🎯 Starting getActiveCards request for userId: ${id}`);

    try {
      this.logger.debug(`🔍 Looking up account with id: ${id}`);

      const account = await this.prisma.account.findUnique({
        where: { id: id },
      });

      if (!account) {
        this.logger.warn(`❌ Account not found for userId: ${id}`);
        throw new HttpException('Account not found', 404);
      }

      this.logger.log(
        `✅ Account found: ${account.email || 'no email'}, childUserId: ${account.childUserId || 'null'}`,
      );

      if (!account.childUserId) {
        this.logger.warn(
          `⚠️ No childUserId for account ${id}, Zephyr integration not available`,
        );
        throw new HttpException(
          'Zephyr integration not available for this account',
          400,
        );
      }

      this.logger.debug(
        `📋 Account details: ${JSON.stringify({
          id: account.id,
          email: account.email,
          childUserId: account.childUserId,
          createdAt: account.createdAt,
        })}`,
      );

      this.logger.log(
        `🚀 Calling Zephyr getActiveCards with childUserId: ${account.childUserId}`,
      );

      const activeCards = await this.zephyr.getActiveCards(account.childUserId);

      this.logger.log(
        `📊 Zephyr returned ${Array.isArray(activeCards) ? activeCards.length : 'unknown'} active cards`,
      );
      this.logger.debug(`📋 Active cards data: ${JSON.stringify(activeCards)}`);

      return activeCards;
    } catch (error) {
      if (error instanceof HttpException) {
        this.logger.error(
          `💥 HTTP Exception in getActiveCards for userId=${id}: ${error.message} (status: ${error.getStatus()})`,
        );
        throw error;
      }
      this.logger.error(
        `💥 Unexpected error in getActiveCards for userId=${id}, error: ${error}`,
      );
      this.logger.error(`🔍 Error stack: ${error.stack}`);
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async getCardInfo(id: string, cardId: string) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { id: id },
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

      this.logger.debug(
        `Getting card info for cardId=${cardId}, account: ` +
          JSON.stringify(account),
      );
      return await this.zephyr.getCardInfo(account.childUserId, cardId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error when getting card info for userId=${id}, cardId=${cardId}, error: ${error}`,
      );
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async destroyCard(id: string, cardId: string) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { id: id },
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

      this.logger.debug(
        `Destroying card cardId=${cardId}, account: ` + JSON.stringify(account),
      );
      return await this.zephyr.destroyCard(account.childUserId, cardId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error when destroying card for userId=${id}, cardId=${cardId}, error: ${error}`,
      );
      throw new HttpException('Something Went Wrong', 500);
    }
  }
}

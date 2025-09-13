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
        'Getting active cards for account: ' + JSON.stringify(account),
      );
      return await this.zephyr.getActiveCards(account.childUserId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error when getting active cards for userId=${id}, error: ${error}`,
      );
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

import { HttpException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/shared/services/prisma.service';
import { ZephyrService } from 'src/shared/services/zephyr.service';
import { BotService } from 'src/shared/services/bot.service';
import { CreateCardDto } from './dto/create-card.dto';
import { TopupCardDto } from './dto/topup-card.dto';
import { CommissionName, Commission, CommissionType } from '@prisma/client';

@Injectable()
export class CardService {
  private readonly logger = new Logger(CardService.name);
  private commission: Commission | null = null;

  constructor(
    private prisma: PrismaService,
    private zephyr: ZephyrService,
    private bot: BotService,
  ) {
    this.loadCardFee();
  }

  async loadCardFee() {
    try {
      const commission = await this.prisma.commission.findUnique({
        where: { name: CommissionName.CARD_FEE },
      });

      if (commission) {
        this.commission = commission;
        this.logger.log(
          `✅ Card fee loaded: ${this.commission.rate} ${commission.type === 'FIXED' ? 'USDT' : '%'}`,
        );
      } else {
        this.logger.warn(
          '⚠️ Card fee not found in database, using default value of 1',
        );
        this.commission = await this.prisma.commission.create({
          data: {
            name: CommissionName.CARD_FEE,
            type: CommissionType.FIXED,
            rate: 1,
          },
        });
      }
    } catch (error) {
      this.logger.error('❌ Error loading card fee:', error);
      this.commission = null;
    }
  }

  private async getCardFee(): Promise<Commission | null> {
    if (this.commission === null) {
      await this.loadCardFee();
    }
    return this.commission;
  }

  private processFee(amount: number, commission: Commission): number {
    if (commission.type === 'FIXED') {
      return amount - commission.rate;
    } else {
      return amount * (1 - commission.rate / 100);
    }
  }

  async getProductList(id: string) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { id: id },
        select: { childUserId: true },
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

  async getCardCvv(id: string, cardId: string) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { id: id },
        select: { childUserId: true },
      });

      if (!account) {
        throw new HttpException('Account not found', 404);
      }

      return await this.zephyr.getCardCvv(account.childUserId, cardId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error when getting card cvv for userId=${id}, cardId=${cardId}, error: ${error}`,
      );
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async getCardExpiry(id: string, cardId: string) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { id: id },
        select: { childUserId: true },
      });

      if (!account) {
        throw new HttpException('Account not found', 404);
      }

      return await this.zephyr.getCardExpiry(account.childUserId, cardId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error when getting card expiry for userId=${id}, cardId=${cardId}, error: ${error}`,
      );
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async getCardNumber(id: string, cardId: string) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { id: id },
        select: { childUserId: true },
      });

      if (!account) {
        throw new HttpException('Account not found', 404);
      }

      return await this.zephyr.getCardNumber(account.childUserId, cardId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error when getting card number for userId=${id}, cardId=${cardId}, error: ${error}`,
      );
      throw new HttpException('Something Went Wrong', 500);
    }
  }

  async createCard(id: string, createCardDto: CreateCardDto) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { id: id },
        select: { childUserId: true, referrer: true, telegramId: true },
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

      const cardFee = await this.getCardFee();
      if (!cardFee) {
        throw new HttpException('Card fee not configured', 500);
      }

      const processedAmount = this.processFee(
        createCardDto.topupAmount,
        cardFee,
      );

      if (processedAmount <= 0) {
        throw new HttpException(
          `Amount must be greater than card fee (${cardFee.rate} ${cardFee.type === 'FIXED' ? 'USDT' : '%'})`,
          400,
        );
      }

      createCardDto.topupAmount = processedAmount;
      this.logger.log(
        `💳 Creating card for userId=${id} with topupAmount=${createCardDto.topupAmount}`,
      );

      const response = await this.zephyr.createCard(
        account.childUserId,
        createCardDto,
      );

      if (response.status === 'error') {
        this.logger.warn(`❌ Zephyr error: ${response.message}`);
        throw new HttpException(
          response.message || 'Card creation failed',
          400,
        );
      }

      try {
        const card = await this.zephyr.getCardInfo(
          account.childUserId,
          response.data.id,
        );

        if (card.status !== 'error') {
          const cardMessage = `
💳 *Your ${card.organize} ${card.cardArea} ${card.cardNo}*
Card Created Successfully!

Your virtual card has been created and is ready to use.

✅ *Status:* Active

You can now use your card for online payments worldwide! 🌍

🔒 Keep your card details secure and never share them with anyone.
        `.trim();

          await this.bot.sendMessage(
            account.telegramId.toString(),
            cardMessage,
            {
              parse_mode: 'Markdown',
            },
          );

          this.logger.log(
            `📨 Card creation notification sent to user ${account.telegramId}`,
          );
        }
      } catch (botError) {
        this.logger.error(
          `Failed to send card creation notification to user ${account.telegramId}: ${botError}`,
        );
      }

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

  async topupCard(id: string, topupCardDto: TopupCardDto) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { id: id },
        select: { childUserId: true },
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

      const response = await this.zephyr.topupCard(
        account.childUserId,
        topupCardDto,
      );

      if (response.status === 'error') {
        this.logger.warn(`❌ Zephyr error: ${response.message}`);
        throw new HttpException(response.message || 'Card topup failed', 400);
      }

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
        select: { childUserId: true },
      });

      if (!account) {
        this.logger.warn(`❌ Account not found for userId: ${id}`);
        throw new HttpException('Account not found', 404);
      }

      if (!account.childUserId) {
        this.logger.warn(
          `⚠️ No childUserId for account ${id}, Zephyr integration not available`,
        );
        throw new HttpException(
          'Zephyr integration not available for this account',
          400,
        );
      }

      this.logger.log(
        `🚀 Calling Zephyr getActiveCards with childUserId: ${account.childUserId}`,
      );

      const cards = await this.zephyr.getActiveCards(account.childUserId);

      this.logger.debug(`📋 Active cards data: ${JSON.stringify(cards)}`);

      return cards;
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

      this.logger.debug(
        `Getting card info for cardId=${cardId}, account: ` + account,
      );

      const result = await this.zephyr.getCardInfo(account.childUserId, cardId);
      if (result.status === 'error') {
        throw new HttpException(result.msg, 400);
      } else {
        return result;
      }
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

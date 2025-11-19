import { Injectable, Logger } from '@nestjs/common';
import { BotService } from './shared/services/bot.service';
import { ZephyrService } from './shared/services/zephyr.service';
import { PrismaService } from './shared/services/prisma.service';
import {
  CARD_STATUS,
  TXN_TYPES,
  ZephyrWebhook,
} from './shared/types/zephyr.types';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly botService: BotService,
    private readonly zephyr: ZephyrService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Send transaction notification to user
   */
  private async sendTransactionNotification(
    telegramId: string,
    transaction: ZephyrWebhook,
    cardInfo?: any,
  ): Promise<void> {
    try {
      // Determine status emoji and text
      let statusText = '';
      let statusEmoji = '';

      // Check if transaction failed or was declined first
      const isFailed =
        transaction.txnStatus === 'FAILED' || transaction.result === 'DECLINE';

      if (isFailed) {
        // For failed/declined transactions
        statusText = 'DECLINED';
        statusEmoji = '❌';
      } else if (transaction.txnType === 'AUTH') {
        // For AUTH transactions, show PENDING status
        statusText = 'PENDING';
        statusEmoji = '🟡';
      } else if (transaction.txnType === 'REVERSAL') {
        // For REVERSAL, the frozen amount is returned
        statusText = 'CANCELLED';
        statusEmoji = '❌';
      } else if (
        transaction.txnType === 'CLEARING' ||
        transaction.txnType === 'SETTLED'
      ) {
        // For settlement, actual deduction happens
        statusText = 'APPROVED';
        statusEmoji = '✅';
      } else if (
        transaction.txnType === 'RETURN' ||
        transaction.txnType === 'REFUND'
      ) {
        // For refunds
        statusText = 'CANCELLED';
        statusEmoji = '❌';
      } else if (transaction.txnType === 'TOPUP') {
        // For top-ups - send immediate success message
        let topupMessage = '';
        if (transaction.txnStatus === 'SUCCESS') {
          topupMessage = `✅ Card successfully topped up!\nCredited ${transaction.amount.toFixed(2)} ${transaction.currency} to your card`;
        } else {
          if (transaction.amount < cardInfo.minTopupAmount) {
            topupMessage = `❌ Card top-up failed: Amount is below the minimum top-up limit of ${cardInfo.minTopupAmount.toFixed(2)} USD. Please try again with a higher amount.`;
          } else {
            topupMessage = `❌ Card top-up failed. Please try again later or contact support.`;
          }
        }
        await this.botService.sendMessage(telegramId, topupMessage);
        this.logger.log(`📨 Topup notification sent to user ${telegramId}`);
        return; // Return after sending topup notification
      } else if (!isFailed) {
        return;
      }

      if (!statusText) {
        return;
      }

      // Format amount with sign
      const formattedAmount = `-${transaction.orderAmount} ${transaction.orderCurrency}`;

      // Convert amount to USD if orderCurrency is provided
      const usdAmount = `(-${transaction.amount} ${transaction.amount})`;

      // Build the message in the format from the image
      let message = `💳 <b>Card ${cardInfo?.cardNo}, ${cardInfo?.cardArea}, ${cardInfo?.organize}</b>\n`;
      message += `${statusEmoji} ${statusText} ${formattedAmount} ${usdAmount}\n`;

      // Add merchant info if available
      if (transaction.merchant) {
        message += `${transaction.merchant}\n`;
      }

      // Add new balance if card info is available
      if (cardInfo?.balance !== undefined) {
        message += `New balance ${cardInfo.balance}\n`;
      }

      // Add available balance (same as new balance in most cases)
      if (cardInfo?.balance !== undefined) {
        message += `Available ${cardInfo.balance}`;
      }

      message = message.trim();

      await this.botService.sendMessage(telegramId, message, {
        parse_mode: 'HTML',
      });

      this.logger.log(
        `📨 Transaction notification sent to user ${telegramId} for ${transaction.txnType}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send transaction notification to user ${telegramId}:`,
        error,
      );
    }
  }

  async handleWebhook(update: ZephyrWebhook) {
    try {
      // Handle card status webhooks
      if (update.txnType === 'CREATE_CARD') {
        this.logger.log(
          `🔔 Received card webhook - cardStatus: ${update.cardStatus} (${CARD_STATUS[update.cardStatus]}), cardId: ${update.cardId}`,
        );

        if (update.cardStatus === 0) {
          // Card is Active
          this.logger.log(
            `✅ Card is active, sending notification for cardId: ${update.cardId}`,
          );

          try {
            const card = await this.zephyr.getWebhookCardInfo(update.cardId);
            const account = await this.prisma.account.findUnique({
              where: { childUserId: card.userId },
              select: { telegramId: true },
            });

            if (card.status !== 'error') {
              const cardMessage = `
💳 <b>Your ${card.organize} ${card.cardArea} ${card.cardNo}</b>
Card Created Successfully!

Your virtual card has been created and is ready to use.

✅ <b>Status:</b> ${CARD_STATUS[0]}

You can now use your card for online payments worldwide! 🌍

🔒 Keep your card details secure and never share them with anyone.
        `.trim();

              this.logger.debug(
                `Sending message about successful card creation to childUserId=${card.userId}, telegramId=${account.telegramId}, cardId=${update.cardId}`,
              );
              await this.botService.sendMessage(
                account.telegramId.toString(),
                cardMessage,
                {
                  parse_mode: 'HTML',
                },
              );

              this.logger.log(
                `📨 Card creation notification sent to user ${account.telegramId}`,
              );
            }
          } catch (botError) {
            this.logger.error(
              `Failed to send card creation notification to user with bot: ${botError}`,
            );
          }
          return 'success';
        } else {
          this.logger.log(
            `ℹ️ Card status is ${update.cardStatus} (${CARD_STATUS[update.cardStatus]}), no notification needed`,
          );
          return 'success';
        }
      }

      // Handle transaction webhooks
      if (update.txnType) {
        this.logger.log(
          `💼 Received transaction webhook - txnType: ${update.txnType}, status: ${update.txnStatus}, amount: ${update.amount} ${update.currency}`,
        );

        try {
          // Get account by userId from the webhook
          const account = await this.prisma.account.findUnique({
            where: { childUserId: update.userId },
            select: { telegramId: true, childUserId: true },
          });

          if (!account) {
            this.logger.warn(`Account not found for userId: ${update.userId}`);
            return { success: true, message: 'Account not found' };
          }

          // Fetch card info to get current balance and card details
          let cardInfo = await this.zephyr.getWebhookCardInfo(update.cardId);

          // Send transaction notification with card info
          await this.sendTransactionNotification(
            account.telegramId.toString(),
            update,
            cardInfo,
          );

          return 'success';
        } catch (error) {
          this.logger.error(`Failed to process transaction webhook: ${error}`);
          throw error;
        }
      }

      this.logger.log('📥 Received webhook update:', JSON.stringify(update));
      return 'success';
    } catch (error) {
      this.logger.error('Error processing webhook', error);
      throw error;
    }
  }
}

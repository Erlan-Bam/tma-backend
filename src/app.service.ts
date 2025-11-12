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
   * Get transaction emoji based on type
   */
  private getTransactionEmoji(type: string): string {
    const emojiMap: Record<string, string> = {
      DECREASE: '💳',
      INCREASE: '💰',
    };
    return emojiMap[type] || '💼';
  }

  /**
   * Format transaction amount for display
   */
  private formatAmount(
    amount: number,
    type: string,
    currency: string = 'USD',
  ): string {
    const sign = type === 'DECREASE' ? '-' : '+';
    return `${sign}${amount.toFixed(2)} ${currency}`;
  }

  /**
   * Send transaction notification to user
   */
  private async sendTransactionNotification(
    telegramId: string,
    transaction: ZephyrWebhook,
  ): Promise<void> {
    try {
      const txnLabel = TXN_TYPES[transaction.txnType] || TXN_TYPES.UNKNOWN;
      const emoji = this.getTransactionEmoji(transaction.type);
      const formattedAmount = this.formatAmount(
        transaction.amount,
        transaction.type,
        transaction.currency,
      );
      const statusEmoji = transaction.txnStatus === 'SUCCESS' ? '✅' : '⚠️';

      let message = `
${emoji} *${txnLabel}*

${statusEmoji} *Status:* ${transaction.txnStatus}
💵 *Amount:* \`${formattedAmount}\`
${transaction.fee > 0 ? `💼 *Fee:* ${transaction.fee.toFixed(2)} ${transaction.currency}\n` : ''}`;

      // Add merchant info for AUTH transactions
      if (transaction.txnType === 'AUTH' && transaction.merchant) {
        message += `🏪 *Merchant:* ${transaction.merchant}\n`;
      }

      // Add order details if different currency
      if (
        transaction.orderCurrency &&
        transaction.orderCurrency !== transaction.currency
      ) {
        message += `\n*Order Details:*\n`;
        message += `💱 *Original Amount:* ${transaction.orderAmount.toFixed(2)} ${transaction.orderCurrency}\n`;
      }

      message += `\n📝 *Transaction ID:* \`${transaction.billNo}\``;

      if (transaction.transactionTime) {
        message += `\n🕒 *Time:* ${new Date(
          transaction.transactionTime,
        ).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}`;
      }

      message += `\n\nThank you for using Arctic Pay! 💎`;
      message = message.trim();

      await this.botService.sendMessage(telegramId, message, {
        parse_mode: 'Markdown',
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
      if (update.cardStatus !== undefined) {
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
💳 *Your ${card.organize} ${card.cardArea} ${card.cardNo}*
Card Created Successfully!

Your virtual card has been created and is ready to use.

✅ *Status:* ${CARD_STATUS[0]}

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
                  parse_mode: 'Markdown',
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
          return { success: true, message: 'Webhook processed' };
        } else {
          this.logger.log(
            `ℹ️ Card status is ${update.cardStatus} (${CARD_STATUS[update.cardStatus]}), no notification needed`,
          );
          return { success: true, message: 'Webhook received' };
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
            select: { telegramId: true },
          });

          if (!account) {
            this.logger.warn(`Account not found for userId: ${update.userId}`);
            return { success: true, message: 'Account not found' };
          }

          // Send transaction notification
          await this.sendTransactionNotification(
            account.telegramId.toString(),
            update,
          );

          return { success: true, message: 'Transaction webhook processed' };
        } catch (error) {
          this.logger.error(`Failed to process transaction webhook: ${error}`);
          throw error;
        }
      }

      this.logger.log('📥 Received webhook update:', JSON.stringify(update));
      return { success: true, message: 'Webhook processed' };
    } catch (error) {
      this.logger.error('Error processing webhook', error);
      throw error;
    }
  }
}

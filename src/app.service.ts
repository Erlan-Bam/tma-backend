import { Injectable, Logger } from '@nestjs/common';
import { BotService } from './shared/services/bot.service';
import { ZephyrService } from './shared/services/zephyr.service';
import { PrismaService } from './shared/services/prisma.service';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly botService: BotService,
    private readonly zephyr: ZephyrService,
    private readonly prisma: PrismaService,
  ) {}

  async handleWebhook(update: any) {
    try {
      if (update.cardStatus !== undefined) {
        this.logger.log(
          `🔔 Received card webhook - cardStatus: ${update.cardStatus}, cardId: ${update.cardId}`,
        );

        if (update.cardStatus === 0) {
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

✅ *Status:* Active

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
            `ℹ️ Card status is ${update.cardStatus}, no notification needed`,
          );
          return { success: true, message: 'Webhook received' };
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

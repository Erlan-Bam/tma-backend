// bot.service.ts
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ConfigService } from '@nestjs/config';
import { Markup, Telegraf } from 'telegraf';

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotService.name);
  private bot: Telegraf;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const token = this.configService.getOrThrow<string>('TELEGRAM_BOT_TOKEN');

    this.bot = new Telegraf(token);

    this.bot.catch((err) => this.logger.error('Telegraf error', err as Error));

    this.setup();
  }

  private setup() {
    this.bot.start((ctx) => {
      return ctx.reply(
        'Welcome! Use the buttons below to navigate.',
        Markup.inlineKeyboard([
          Markup.button.webApp('Open wallet', 'http://localhost:3000'),
        ]),
      );
    });

    this.bot.use(async (ctx, next) => {
      if (ctx.update && 'update_id' in ctx.update) {
        this.logger.debug(`Update received: ${ctx.update.update_id}`);
      }
      return next();
    });

    this.logger.log('Bot commands have been set up');
  }

  async onModuleInit() {
    this.logger.debug('Initializing Telegram bot...');
    try {
      // 👇 IMPORTANT: disable webhook if it was previously configured
      await this.bot.telegram.deleteWebhook({ drop_pending_updates: true });

      // (Optional) confirm webhook was cleared
      const info = await this.bot.telegram.getWebhookInfo();
      if (info.url) {
        this.logger.warn(`Webhook still set to ${info.url} — polling may fail`);
      }

      await this.bot.launch({
        allowedUpdates: ['message', 'callback_query'],
      });

      this.logger.log('Telegram bot launched (long polling)');
    } catch (error) {
      this.logger.error('Failed to launch Telegram bot', error as Error);
      throw error; // rethrow so you notice in logs/infra
    }
  }

  async onModuleDestroy() {
    this.bot.stop('SIGTERM');
    this.logger.log('Telegram bot stopped');
  }
}

// bot.service.ts
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ConfigService } from '@nestjs/config';
import { Bot, InlineKeyboard } from 'grammy';

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotService.name);
  private bot: Bot;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const token = this.configService.getOrThrow<string>('TELEGRAM_BOT_TOKEN');
    this.bot = new Bot(token);

    this.bot.catch((err) => {
      const e = err.error as Error;
      this.logger.error('grammY error', e);
    });

    this.setup();
  }

  private setup() {
    this.bot.command('start', async (ctx) => {
      const url = this.configService.getOrThrow<string>('FRONTEND_URL');

      await ctx.reply(
        'Welcome to Arctic Pay! Use the buttons below to navigate.',
        {
          reply_markup: new InlineKeyboard().webApp('Open Arctic Pay!', url),
        },
      );
    });
  }

  async onModuleInit() {
    this.logger.debug('Initializing Telegram bot...');
    try {
      this.bot.start({
        drop_pending_updates: true,
        allowed_updates: ['message', 'callback_query'],
        onStart: () => {
          this.logger.log('Telegram bot launched');
        },
      });
    } catch (error) {
      this.logger.error('Failed to launch Telegram bot', error as Error);
      throw error;
    }
  }

  async onModuleDestroy() {
    this.bot.stop();
    this.logger.log('Telegram bot stopped');
  }
}

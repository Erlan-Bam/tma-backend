import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ConfigService } from '@nestjs/config';
import { Markup, Telegraf } from 'telegraf';

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);
  private bot: Telegraf;
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const token = this.configService.getOrThrow('TELEGRAM_BOT_TOKEN');
    this.bot = new Telegraf(token);
    this.setup();
  }

  private setup() {
    this.bot.start((ctx) => {
      ctx.reply(
        'Welcome! Use the buttons below to navigate.',
        Markup.inlineKeyboard([
          Markup.button.webApp('Open wallet', 'http://localhost:3000'),
        ]),
      );
    });
  }
}

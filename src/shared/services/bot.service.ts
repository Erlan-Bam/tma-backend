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

      const user = ctx.from;
      const firstName = user?.first_name || 'Friend';
      const username = user?.username ? `@${user.username}` : '';

      const referralCode = ctx.match ? ctx.match.toString().trim() : null;

      const appUrl = referralCode ? `${url}?ref=${referralCode}` : url;

      // Красивое приветственное сообщение
      const welcomeMessage = `
🌟 Welcome to Arctic Pay! 🌟

💳 Managing your money is now easy.

We leverage the financial and technological expertise of our team in Dubai and Hong Kong to develop solutions that provide clarity in every transaction and help you earn more, consistently.

✨ What you can do:
🔹 Create virtual cards instantly
🔹 Secure payments worldwide  
🔹 Real-time transaction monitoring
🔹 Multi-currency support
🔹 24/7 global acceptance

🚀 Ready to get started?
Tap the button below to open your Arctic Pay wallet!

Welcome to Arctic Pay, a new way to manage your finances! 💎
      `.trim();

      const keyboard = new InlineKeyboard()
        .webApp('🏦 Open Arctic Pay Wallet', appUrl)
        .row()
        .url('📞 Support', 'https://t.me/arctic_pay_support')
        .url('📖 Help Center', 'https://arcticpay.io/help');

      await ctx.reply(welcomeMessage, {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      });

      this.logger.log(
        `New user started bot: ${firstName} (ID: ${user?.id})${username ? ` ${username}` : ''}${referralCode ? ` [Referred by: ${referralCode}]` : ''}`,
      );
    });

    // Добавляем команду help
    this.bot.command('help', async (ctx) => {
      const helpMessage = `
🔧 Arctic Pay Commands

/start - Welcome message and open wallet
/help - Show this help message
/support - Contact support team
/about - Learn more about Arctic Pay

💡 Quick Tips:
• Use the web app for full functionality
• Your data is encrypted and secure
• Need help? Just type /support

🌐 Visit our website: arcticpay.io
      `.trim();

      await ctx.reply(helpMessage, {
        parse_mode: 'Markdown',
      });
    });

    // Добавляем команду support
    this.bot.command('support', async (ctx) => {
      const supportMessage = `
🆘 Need Help?

Our support team is here to assist you 24/7!

📞 Contact Options:
• Support Chat: @arctic_pay_support
• Email: support@arcticpay.io  
• Help Center: arcticpay.io/help

⏰ Response Time:
We typically respond within 2-4 hours

🔒 Security Note:
Arctic Pay staff will never ask for your passwords or private keys in DMs.
      `.trim();

      const supportKeyboard = new InlineKeyboard()
        .url('💬 Chat with Support', 'https://t.me/arctic_pay_support')
        .row()
        .url('📖 Help Center', 'https://arcticpay.io/help')
        .url('📧 Email Support', 'mailto:support@arcticpay.io');

      await ctx.reply(supportMessage, {
        reply_markup: supportKeyboard,
        parse_mode: 'Markdown',
      });
    });

    // Добавляем команду about
    this.bot.command('about', async (ctx) => {
      const aboutMessage = `
🏢 About Arctic Pay

Arctic Pay is a next-generation financial platform that makes managing your money simple, secure, and globally accessible.

🌍 Our Mission:
To provide clarity in every transaction and help you earn more, consistently.

🏙️ Global Presence:
• Dubai - Financial Hub
• Hong Kong - Technology Center
• Worldwide - Customer Support

💼 Our Expertise:
✅ Advanced Financial Technology
✅ Blockchain Security
✅ Global Payment Processing
✅ Regulatory Compliance

🔐 Security First:
Your funds and data are protected by bank-level encryption and security measures.

🌐 Website: arcticpay.io
📱 App: Available in Telegram
      `.trim();

      await ctx.reply(aboutMessage, {
        parse_mode: 'Markdown',
      });
    });
  }

  async onModuleInit() {
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

  async getBotInfo() {
    try {
      return await this.bot.api.getMe();
    } catch (error) {
      this.logger.error('Failed to get bot info', error as Error);
      throw error;
    }
  }

  async sendMessage(
    chatId: number | string,
    message: string,
    options?: {
      parse_mode?: 'Markdown' | 'HTML';
      disable_web_page_preview?: boolean;
    },
  ) {
    try {
      await this.bot.api.sendMessage(chatId, message, options);
      this.logger.log(`Message sent to user ${chatId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send message to user ${chatId}`,
        error as Error,
      );
      throw error;
    }
  }

  async sendSuccessfulTransactionMessage(
    telegramId: bigint | string,
    amount: number,
    tronId: string,
  ) {
    try {
      const successMessage = `
🎉 *Payment Successful!*

Your payment has been processed successfully.

💰 *Amount:* ${amount.toFixed(2)} USDT
📝 *Transaction ID:* \`${tronId}\`
✅ *Status:* Completed

Your wallet has been topped up! 🚀

Thank you for using Arctic Pay! 💎
      `.trim();

      await this.bot.api.sendMessage(telegramId.toString(), successMessage, {
        parse_mode: 'Markdown',
      });

      this.logger.log(
        `📨 Success message sent to user ${telegramId} for transaction ${tronId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send successful transaction message to user ${telegramId} for transaction ${tronId}`,
        error as Error,
      );
      throw error;
    }
  }

  async sendUnsuccessfulTransactionMessage(
    telegramId: bigint | string,
    amount: number,
    tronId: string,
    errorReason?: string,
  ) {
    try {
      const failureMessage = `
⚠️ *Payment Processing Failed*

We encountered an issue processing your payment.

💰 *Amount:* ${amount.toFixed(2)} USDT
📝 *Transaction ID:* \`${tronId}\`
❌ *Status:* Failed

${errorReason ? `*Reason:* ${errorReason}\n` : ''}
Please contact our support team if you need assistance.

💬 Support: @arctic_pay_support
      `.trim();

      await this.bot.api.sendMessage(telegramId.toString(), failureMessage, {
        parse_mode: 'Markdown',
      });

      this.logger.log(
        `📨 Failure message sent to user ${telegramId} for transaction ${tronId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send unsuccessful transaction message to user ${telegramId} for transaction ${tronId}`,
        error as Error,
      );
      throw error;
    }
  }

  async onModuleDestroy() {
    this.bot.stop();
    this.logger.log('Telegram bot stopped');
  }
}

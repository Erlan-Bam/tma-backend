import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Account } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TmaAuthDto } from './dto/tma-auth.dto';
import { PrismaService } from 'src/shared/services/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ZephyrService } from 'src/shared/services/zephyr.service';
import { TelegramAuthUtils } from 'src/shared/utils/telegram-auth.utils';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly JWT_ACCESS_SECRET: string;
  private readonly JWT_REFRESH_SECRET: string;
  private readonly BOT_TOKEN: string;
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private zephyrService: ZephyrService,
  ) {
    this.JWT_ACCESS_SECRET = this.configService.getOrThrow('JWT_ACCESS_SECRET');
    this.JWT_REFRESH_SECRET =
      this.configService.getOrThrow('JWT_REFRESH_SECRET');
    this.BOT_TOKEN = this.configService.getOrThrow('TELEGRAM_BOT_TOKEN');
  }
  async generateAccessToken(account: Account): Promise<string> {
    return await this.jwtService.signAsync(
      {
        id: account.id,
        role: account.role,
        email: account.email,
        isBanned: account.isBanned,
      },
      {
        secret: this.JWT_ACCESS_SECRET,
        expiresIn: '1y',
      },
    );
  }

  async tmaAuth(data: TmaAuthDto) {
    const parsedData = TelegramAuthUtils.validateInitData(
      data.initData,
      this.BOT_TOKEN,
    );
    if (!parsedData) {
      throw new HttpException('Invalid Telegram data', 400);
    }

    if (!parsedData.user || !parsedData.auth_date) {
      throw new HttpException('Invalid Telegram user data', 400);
    }

    const telegramUser = parsedData.user;

    let account = await this.prisma.account.findUnique({
      where: { telegramId: telegramUser.id },
    });

    if (!account) {
      try {
        const tempEmail = `telegram_${telegramUser.id}@arctic.pay`;
        const tempPassword = crypto.randomBytes(32).toString('hex');

        const childAccount = await this.zephyrService.createChildAccount(
          tempEmail,
          tempPassword,
        );

        account = await this.prisma.account.create({
          data: {
            telegramId: telegramUser.id,
            email: tempEmail,
            password: tempPassword,
            childUserId: childAccount.childUserId,
          },
        });
      } catch (error) {
        this.logger.error('Error creating TMA account: ' + error);
        throw new HttpException('Failed to create account', 500);
      }
    }

    const accessToken = await this.generateAccessToken(account);

    return {
      access_token: accessToken,
      user: {
        id: account.id,
        telegramId: account.telegramId.toString(),
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        username: telegramUser.username,
      },
    };
  }

  async test() {
    let account = await this.prisma.account.findUnique({
      where: { telegramId: 975314612 },
    });

    const accessToken = await this.generateAccessToken(account);

    return {
      access_token: accessToken,
    };
  }
}

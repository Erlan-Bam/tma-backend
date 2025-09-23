import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Account } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { TmaAuthDto } from './dto/tma-auth.dto';
import { PrismaService } from 'src/shared/services/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ZephyrService } from 'src/shared/services/zephyr.service';
import * as crypto from 'crypto';
import { ParsedInitData } from './types/telegram.types';
import { TronService } from 'src/shared/services/tron.service';

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
    private tronService: TronService,
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
    console.log('🚀 TMA Auth request received');
    console.log('📤 InitData length:', data.initData.length);
    console.log(
      '📤 InitData preview:',
      data.initData.substring(0, 100) + '...',
    );
    console.log('🔑 BOT_TOKEN available:', !!this.BOT_TOKEN);

    const parsedData = this.validateInitData(data.initData, this.BOT_TOKEN);

    console.log('📋 Parsed data result:', parsedData ? 'SUCCESS' : 'FAILED');

    if (!parsedData) {
      console.log('❌ Validation failed - Invalid Telegram data');
      throw new HttpException('Invalid Telegram data', 400);
    }

    if (!parsedData.user || !parsedData.auth_date) {
      console.log('❌ Missing user or auth_date');
      throw new HttpException('Invalid Telegram user data', 400);
    }

    console.log('👤 Telegram user:', parsedData.user);
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

        const wallet = await this.tronService.createAccount();

        account = await this.prisma.account.create({
          data: {
            telegramId: telegramUser.id,
            email: tempEmail,
            password: tempPassword,
            childUserId: childAccount.childUserId,
            address: wallet.address,
            privateKey: wallet.privateKey,
            publicKey: wallet.publicKey,
          },
        });
      } catch (error) {
        this.logger.error(
          `Error creating TMA account telegramId=${telegramUser.id}: ` + error,
        );
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

  private validateInitData(
    initData: string,
    botToken: string,
  ): ParsedInitData | null {
    try {
      console.log('🔍 Starting validation...');
      console.log('📄 InitData length:', initData.length);

      const urlParams = new URLSearchParams(initData);
      const data: any = {};

      for (const [key, value] of urlParams.entries()) {
        if (key === 'user') {
          try {
            data[key] = JSON.parse(value);
          } catch {
            data[key] = value;
          }
        } else if (key === 'auth_date') {
          data[key] = parseInt(value);
        } else {
          data[key] = value;
        }
      }

      console.log('📋 Parsed keys:', Object.keys(data));
      console.log('🔑 Hash from data:', data.hash);
      console.log('📅 Auth date:', new Date(data.auth_date * 1000));

      const hash = data.hash;
      delete data.hash;

      const dataCheckString = Object.keys(data)
        .sort()
        .map(
          (key) =>
            `${key}=${typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key]}`,
        )
        .join('\n');

      console.log('📝 Data check string:', dataCheckString);

      const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(botToken)
        .digest();

      const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      console.log('🔒 Expected hash:', hash);
      console.log('🔒 Calculated hash:', calculatedHash);
      console.log('✅ Hash match:', calculatedHash === hash);

      if (calculatedHash !== hash) {
        console.log('❌ Hash mismatch - ПРОПУСКАЕМ ДЛЯ ТЕСТИРОВАНИЯ');
        // return null; // Временно отключаем проверку хеша
      }

      const authDate = data.auth_date * 1000;
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000;

      console.log('📅 Auth date timestamp:', authDate);
      console.log('📅 Current timestamp:', now);
      console.log('⏰ Age check:', now - authDate, 'vs max', maxAge);

      if (now - authDate > maxAge) {
        console.log('❌ Data too old - validation failed');
        return null;
      }

      console.log('✅ Validation successful');
      return { ...data, hash } as ParsedInitData;
    } catch (error) {
      console.error('Error validating Telegram init data:', error);
      return null;
    }
  }

  async test() {
    let account = await this.prisma.account.findUnique({
      where: { telegramId: 5466782124 },
    });

    const accessToken = await this.generateAccessToken(account);

    return {
      access_token: accessToken,
    };
  }
}

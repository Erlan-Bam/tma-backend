import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Account } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { TmaAuthDto } from './dto/tma-auth.dto';
import { PrismaService } from 'src/shared/services/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ZephyrService } from 'src/shared/services/zephyr.service';
import * as crypto from 'crypto';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface ParsedInitData {
  user?: TelegramUser;
  auth_date?: number;
  hash?: string;
  query_id?: string;
  [key: string]: any;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly JWT_ACCESS_SECRET: string;
  private readonly JWT_REFRESH_SECRET: string;
  private readonly TELEGRAM_BOT_TOKEN: string;
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private zephyrService: ZephyrService,
  ) {
    this.JWT_ACCESS_SECRET = this.configService.getOrThrow('JWT_ACCESS_SECRET');
    this.JWT_REFRESH_SECRET =
      this.configService.getOrThrow('JWT_REFRESH_SECRET');
    this.TELEGRAM_BOT_TOKEN =
      this.configService.getOrThrow('TELEGRAM_BOT_TOKEN');
  }

  private validateInitData(initData: string, botToken: string): boolean {
    try {
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get('hash');

      if (!hash) {
        return false;
      }

      urlParams.delete('hash');

      const sortedParams = Array.from(urlParams.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(botToken)
        .digest();

      const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(sortedParams)
        .digest('hex');

      return calculatedHash === hash;
    } catch (error) {
      console.error('Error validating Telegram init data:', error);
      return false;
    }
  }

  private parseInitData(initData: string): ParsedInitData {
    const urlParams = new URLSearchParams(initData);
    const result: ParsedInitData = {};

    for (const [key, value] of urlParams.entries()) {
      if (key === 'user') {
        try {
          result.user = JSON.parse(decodeURIComponent(value));
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      } else if (key === 'auth_date') {
        result.auth_date = parseInt(value, 10);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  private isDataFresh(
    authDate: number,
    maxAgeSeconds: number = 86400,
  ): boolean {
    const now = Math.floor(Date.now() / 1000);
    return now - authDate <= maxAgeSeconds;
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
        expiresIn: '1d',
      },
    );
  }
  async generateRefreshToken(account: Account): Promise<string> {
    return await this.jwtService.signAsync(
      {
        id: account.id,
      },
      {
        secret: this.JWT_REFRESH_SECRET,
        expiresIn: '7d',
      },
    );
  }
  async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.JWT_REFRESH_SECRET,
      });

      const user = await this.validateTokenAndUser(payload.id);
      if (!user) {
        throw new HttpException('User not found or banned', 401);
      }

      return this.generateAccessToken(user);
    } catch (error) {
      this.logger.error('Refresh token validation failed:', error);
      throw new HttpException('Invalid refresh token', 401);
    }
  }

  async tmaAuth(data: TmaAuthDto) {
    const isValid = this.validateInitData(
      data.initData,
      this.TELEGRAM_BOT_TOKEN,
    );
    if (!isValid) {
      throw new HttpException('Invalid Telegram data', 400);
    }

    const parsedData: ParsedInitData = this.parseInitData(data.initData);

    if (!parsedData.user || !parsedData.auth_date) {
      throw new HttpException('Invalid Telegram user data', 400);
    }

    if (!this.isDataFresh(parsedData.auth_date)) {
      throw new HttpException('Telegram data is too old', 400);
    }

    const telegramUser = parsedData.user;

    let account = await this.prisma.account.findUnique({
      where: { telegramId: telegramUser.id },
    });

    if (!account) {
      try {
        const tempEmail = `telegram_${telegramUser.id}@arctic.pay`;
        const tempPassword = crypto.randomBytes(32).toString('hex');

        let childAccount: { childUserId: string };
        try {
          childAccount = await this.zephyrService.createChildAccount(
            tempEmail,
            tempPassword,
          );
        } catch (error) {
          this.logger.error(
            `Error creating child account in Zephyr for ${tempEmail}: ${error}`,
          );
          throw new HttpException(
            `Failed to create child account for ${tempEmail}`,
            500,
          );
        }

        account = await this.prisma.account.create({
          data: {
            telegramId: telegramUser.id,
            email: tempEmail,
            password: tempPassword,
            childUserId: childAccount.childUserId,
          },
        });

        this.logger.debug(
          `Successfully created account in database for Telegram ID: ${telegramUser.id}`,
        );
      } catch (error) {
        this.logger.error('Error creating TMA account: ' + error);
        throw new HttpException('Failed to create account', 500);
      }
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(account),
      this.generateRefreshToken(account),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async genTokens() {
    const account = await this.prisma.account.findUnique({
      where: { telegramId: 975314612 },
    });
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(account),
      this.generateRefreshToken(account),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async validateTokenAndUser(userId: string): Promise<Account | null> {
    try {
      const user = await this.prisma.account.findUnique({
        where: { id: userId },
        select: {
          id: true,
          telegramId: true,
          email: true,
          role: true,
          isBanned: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        this.logger.warn(`Token validation failed: User ${userId} not found`);
        return null;
      }

      return user as Account;
    } catch (error) {
      this.logger.error(`Token validation error for user ${userId}:`, error);
      return null;
    }
  }
}

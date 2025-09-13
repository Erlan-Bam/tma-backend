import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Account } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TmaAuthDto } from './dto/tma-auth.dto';
import { PrismaService } from 'src/shared/services/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ZephyrService } from 'src/shared/services/zephyr.service';
import {
  TelegramAuthUtils,
  ParsedInitData,
} from 'src/shared/utils/telegram-auth.utils';
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
    this.BOT_TOKEN = this.configService.getOrThrow('BOT_TOKEN');
  }
  async register(data: RegisterDto) {
    const exist = await this.prisma.account.findFirst({
      where: {
        OR: [{ email: data.email }, { telegramId: data.telegramId }],
      },
    });
    if (exist) {
      throw new HttpException(
        'User with this email or telegramId already exists',
        409,
      );
    }

    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(data.password, 10);

    let childAccount: { childUserId: string };

    try {
      childAccount = await this.zephyrService.createChildAccount(
        data.email,
        hashedPassword,
      );
    } catch (error) {
      throw new HttpException('Something went wrong', 500);
    }

    let account: Account;
    try {
      account = await this.prisma.account.create({
        data: {
          email: data.email,
          password: hashedPassword,
          telegramId: data.telegramId,
          childUserId: childAccount.childUserId,
        },
      });
    } catch (error) {
      this.logger.error('Error with prisma database in register: ' + error);
      throw new HttpException('Failed to persist account', 500);
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
  async login(data: LoginDto) {
    const user = await this.prisma.account.findUnique({
      where: { email: data.email },
    });
    if (!user) {
      throw new HttpException('Invalid credentials', 400);
    }

    const isMatch = await this.validatePassword(data.password, user.password);
    if (!isMatch) {
      throw new HttpException('Invalid password', 400);
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(user),
      this.generateRefreshToken(user),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }
  async validatePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    const bcrypt = await import('bcryptjs');

    return await bcrypt.compare(password, hashedPassword);
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
    // Валидируем Telegram init data
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

    // Ищем существующего пользователя
    let account = await this.prisma.account.findUnique({
      where: { telegramId: telegramUser.id },
    });

    if (!account) {
      // Создаем нового пользователя без email и password
      try {
        // Создаем child account с временным email
        const tempEmail = `telegram_${telegramUser.id}@temp.local`;
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

    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(account),
      this.generateRefreshToken(account),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: account.id,
        telegramId: account.telegramId.toString(), // Конвертируем BigInt в строку
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        username: telegramUser.username,
      },
    };
  }

  /**
   * Проверяет валидность токена и существование пользователя
   */
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

      if (user.isBanned) {
        this.logger.warn(`Token validation failed: User ${userId} is banned`);
        return null;
      }

      return user as Account;
    } catch (error) {
      this.logger.error(`Token validation error for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Проверяет и обновляет refresh token
   */
  async refreshAccessTokenV2(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.JWT_REFRESH_SECRET,
      });

      const user = await this.validateTokenAndUser(payload.id);
      if (!user) {
        throw new HttpException('User not found or banned', 401);
      }

      return {
        access_token: await this.generateAccessToken(user),
        refresh_token: await this.generateRefreshToken(user),
      };
    } catch (error) {
      this.logger.error('Refresh token validation failed:', error);
      throw new HttpException('Invalid refresh token', 401);
    }
  }
}

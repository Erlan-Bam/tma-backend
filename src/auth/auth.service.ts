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
    const isValid = TelegramAuthUtils.validateInitData(
      data.initData,
      this.BOT_TOKEN,
    );
    if (!isValid) {
      throw new HttpException('Invalid Telegram data', 400);
    }

    // Парсим данные
    const parsedData: ParsedInitData = TelegramAuthUtils.parseInitData(
      data.initData,
    );

    if (!parsedData.user || !parsedData.auth_date) {
      throw new HttpException('Invalid Telegram user data', 400);
    }

    // Проверяем свежесть данных (не старше 1 дня)
    if (!TelegramAuthUtils.isDataFresh(parsedData.auth_date)) {
      throw new HttpException('Telegram data is too old', 400);
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

        let childUserId = null;

        try {
          const childAccount = await this.zephyrService.createChildAccount(
            tempEmail,
            tempPassword,
          );
          childUserId = childAccount.childUserId;
          this.logger.debug(
            `Successfully created Zephyr child account for Telegram ID: ${telegramUser.id}`,
          );
        } catch (zephyrError) {
          this.logger.warn(
            `Failed to create Zephyr child account for Telegram ID: ${telegramUser.id}, error: ${zephyrError.message}. Creating account without Zephyr integration.`,
          );
          // Если аккаунт уже существует в Zephyr или другая ошибка - продолжаем без childUserId
        }

        account = await this.prisma.account.create({
          data: {
            telegramId: telegramUser.id,
            email: tempEmail,
            password: tempPassword,
            childUserId: childUserId, // Может быть null если не удалось создать в Zephyr
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
        this.logger.warn(
          `Refresh failed: User not found or banned for ID ${payload.id}`,
        );
        throw new HttpException('REDIRECT_TO_ONBOARDING', 401);
      }

      return {
        access_token: await this.generateAccessToken(user),
        refresh_token: await this.generateRefreshToken(user),
      };
    } catch (error) {
      this.logger.error('Refresh token validation failed:', error);

      // Если это наша специальная ошибка, пробрасываем её
      if (
        error instanceof HttpException &&
        error.message === 'REDIRECT_TO_ONBOARDING'
      ) {
        throw error;
      }

      // Для всех остальных ошибок также перенаправляем на онбординг
      throw new HttpException('REDIRECT_TO_ONBOARDING', 401);
    }
  }

  /**
   * Связывает существующий Zephyr аккаунт с пользователем по email
   */
  async linkZephyrAccount(userId: string, email: string, password: string) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { id: userId },
      });

      if (!account) {
        throw new HttpException('Account not found', 404);
      }

      if (account.childUserId) {
        throw new HttpException('Account already linked to Zephyr', 400);
      }

      // Пытаемся найти существующий Zephyr аккаунт
      try {
        const childAccount = await this.zephyrService.createChildAccount(
          email,
          password,
        );

        // Если удалось создать - значит такого аккаунта не было
        await this.prisma.account.update({
          where: { id: userId },
          data: {
            childUserId: childAccount.childUserId,
            email: email,
            password: password,
          },
        });

        this.logger.log(
          `Created and linked new Zephyr account for user ${userId}`,
        );
        return {
          success: true,
          message: 'New Zephyr account created and linked',
        };
      } catch (zephyrError) {
        if (zephyrError.message.includes('already exists')) {
          // Аккаунт существует в Zephyr, нужно получить его childUserId
          // Можно попробовать авторизоваться или использовать другой метод для получения childUserId
          this.logger.warn(
            `Zephyr account exists for email ${email}, but we need childUserId`,
          );

          // Обновляем email и password в любом случае
          await this.prisma.account.update({
            where: { id: userId },
            data: {
              email: email,
              password: password,
              // childUserId остается null, пока не найдем способ получить его
            },
          });

          return {
            success: false,
            message:
              'Zephyr account exists but childUserId unknown. Please contact support to link existing account.',
          };
        }

        throw zephyrError;
      }
    } catch (error) {
      this.logger.error(
        `Error linking Zephyr account for user ${userId}:`,
        error,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to link Zephyr account', 500);
    }
  }

  /**
   * Повторная попытка создания Zephyr аккаунта с данными из TMA регистрации
   */
  async retryZephyrLinking(userId: string) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { id: userId },
      });

      if (!account) {
        throw new HttpException('Account not found', 404);
      }

      if (account.childUserId) {
        return {
          success: true,
          message: 'Account already linked to Zephyr',
          childUserId: account.childUserId,
        };
      }

      // Используем существующие email и password из аккаунта
      const email = account.email;
      const password = account.password;

      this.logger.debug(
        `Retrying Zephyr linking for user ${userId} with email: ${email}`,
      );

      // Пытаемся создать child account с существующими данными
      try {
        const childAccount = await this.zephyrService.createChildAccount(
          email,
          password,
        );

        // Если удалось создать - обновляем childUserId
        await this.prisma.account.update({
          where: { id: userId },
          data: {
            childUserId: childAccount.childUserId,
          },
        });

        this.logger.log(
          `Successfully linked Zephyr account for user ${userId}, childUserId: ${childAccount.childUserId}`,
        );

        return {
          success: true,
          message: 'Zephyr account linked successfully',
          childUserId: childAccount.childUserId,
        };
      } catch (zephyrError) {
        if (zephyrError.message.includes('already exists')) {
          this.logger.warn(
            `Zephyr account already exists for user ${userId} with email ${email}. Manual childUserId linking required.`,
          );

          return {
            success: false,
            message: `Zephyr account exists but needs manual childUserId linking. Email: ${email}`,
            email: email,
            needsManualLinking: true,
          };
        }

        throw zephyrError;
      }
    } catch (error) {
      this.logger.error(
        `Error retrying Zephyr linking for user ${userId}:`,
        error,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to retry Zephyr linking', 500);
    }
  }

  /**
   * Устанавливает childUserId для пользователя (для ручной привязки)
   */
  async setChildUserId(userId: string, childUserId: string) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { id: userId },
      });

      if (!account) {
        throw new HttpException('Account not found', 404);
      }

      await this.prisma.account.update({
        where: { id: userId },
        data: { childUserId: childUserId },
      });

      this.logger.log(
        `Manually set childUserId ${childUserId} for user ${userId}`,
      );
      return { success: true, message: 'ChildUserId set successfully' };
    } catch (error) {
      this.logger.error(`Error setting childUserId for user ${userId}:`, error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to set childUserId', 500);
    }
  }
}

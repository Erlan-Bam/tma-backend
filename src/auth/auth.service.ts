import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Account } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from 'src/shared/services/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ZephyrService } from 'src/shared/services/zephyr.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly JWT_ACCESS_SECRET: string;
  private readonly JWT_REFRESH_SECRET: string;
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private zephyrService: ZephyrService,
  ) {
    this.JWT_ACCESS_SECRET = this.configService.getOrThrow('JWT_ACCESS_SECRET');
    this.JWT_REFRESH_SECRET =
      this.configService.getOrThrow('JWT_REFRESH_SECRET');
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
      const user = await this.prisma.account.findUnique({
        where: { email: payload.email },
      });
      if (!user) {
        throw new HttpException('Invalid refresh token', 401);
      }
      return this.generateAccessToken(user);
    } catch (error) {
      throw new HttpException('Invalid refresh token', 401);
    }
  }
}

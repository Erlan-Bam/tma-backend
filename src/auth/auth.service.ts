import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Account } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/shared/services/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ZephyrService } from 'src/shared/services/zephyr.service';
import * as bcrypt from 'bcryptjs';
import { TronService } from 'src/shared/services/tron.service';
import { TmaDto } from './dto/tma-auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly JWT_ACCESS_SECRET: string;
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private zephyrService: ZephyrService,
    private tronService: TronService,
  ) {
    this.JWT_ACCESS_SECRET = this.configService.getOrThrow('JWT_ACCESS_SECRET');
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

  async tma(data: TmaDto) {
    const { email, password, telegramId } = data;
    const hashedPassword = await bcrypt.hash(password, 10);

    let account = await this.prisma.account.findUnique({
      where: { telegramId: telegramId },
    });

    if (!account) {
      if (!email || !password) {
        throw new HttpException('Missing required fields', 400);
      }
      try {
        const childAccount = await this.zephyrService.createChildAccount(
          email,
          hashedPassword,
        );

        const wallet = await this.tronService.createAccount();

        let referrerId: string | null = null;
        if (data.referralCode) {
          const referrer = await this.prisma.account.findUnique({
            where: { id: data.referralCode },
            select: { id: true, telegramId: true },
          });

          if (referrer) {
            referrerId = referrer.id;
            this.logger.log(
              `New user ${telegramId} referred by ${referrer.telegramId}`,
            );
          } else {
            this.logger.warn(
              `Invalid referral code provided: ${data.referralCode}`,
            );
          }
        }

        account = await this.prisma.account.create({
          data: {
            telegramId: telegramId,
            email: email,
            password: hashedPassword,
            childUserId: childAccount.childUserId,
            address: wallet.address,
            privateKey: wallet.privateKey,
            publicKey: wallet.publicKey,
            referredBy: referrerId,
          },
        });
      } catch (error) {
        this.logger.error(
          `Error creating TMA account telegramId=${telegramId}: ` + error,
        );
        throw new HttpException('Failed to create account', 500);
      }
    } else {
      const isMatch = await bcrypt.compare(password, account.password);
      if (!isMatch) {
        throw new HttpException('Invalid credentials', 401);
      }
    }

    const accessToken = await this.generateAccessToken(account);

    return {
      access_token: accessToken,
    };
  }
}

import { Module } from '@nestjs/common';
import { SharedModule } from './shared/shared.module';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AccountModule } from './account/account.module';
import { AuthModule } from './auth/auth.module';
import { CardModule } from './card/card.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';
import * as Joi from 'joi';
import { ScheduleModule } from '@nestjs/schedule';
import { TransactionModule } from './transaction/transaction.module';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      envFilePath: ['.env'],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),
        PORT: Joi.number().default(6001),
        DATABASE_URL: Joi.string().uri().required(),
        FRONTEND_URL: Joi.string().uri().required(),
        WEBAPP_URL: Joi.string().uri().optional(),
        JWT_ACCESS_SECRET: Joi.string().min(8).required(),
        JWT_REFRESH_SECRET: Joi.string().min(8).required(),
        TELEGRAM_BOT_TOKEN: Joi.string().required(),
        ZEPHYR_SECRET_KEY: Joi.string().required(),
        ZEPHYR_BASE_URL: Joi.string()
          .uri()
          .valid(
            'https://dev-sandbox-v423.zephyrcards.com',
            'https://dev-docs-v2821.zephyrcards.com',
          )
          .required(),
        TRON_API_KEY: Joi.string().required(),
        TRON_WALLET_ADDRESS: Joi.string().required(),
        REDIS_HOST: Joi.string().default('localhost'),
        REDIS_PORT: Joi.number().default(6379),
        REDIS_PASSWORD: Joi.string().optional(),
      }),
      validationOptions: { allowUnknown: true, abortEarly: true },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 150,
      },
    ]),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      },
    }),
    SharedModule,
    AccountModule,
    AuthModule,
    CardModule,
    AdminModule,
    HealthModule,
    TransactionModule,
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { SharedModule } from './shared/shared.module';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AccountModule } from './account/account.module';
import { AuthModule } from './auth/auth.module';
import * as Joi from 'joi';

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
      }),
      validationOptions: { allowUnknown: true, abortEarly: true },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 150,
      },
    ]),
    SharedModule,
    AccountModule,
    AuthModule,
  ],
})
export class AppModule {}

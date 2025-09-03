import { Module } from '@nestjs/common';
import { SharedModule } from './shared/shared.module';
import config from './config';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import Joi from 'joi';

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
  ],
})
export class AppModule {}

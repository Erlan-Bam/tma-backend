import { Module } from '@nestjs/common';
import { PrismaService } from './services/prisma.service';
import { CronService } from './services/cron.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { BotService } from './services/bot.service';
import { ZephyrService } from './services/zephyr.service';

@Module({
  imports: [JwtModule],
  providers: [
    PrismaService,
    BotService,
    ZephyrService,
    CronService,
    JwtStrategy,
    JwtService,
  ],
  exports: [
    PrismaService,
    BotService,
    ZephyrService,
    CronService,
    JwtStrategy,
    JwtService,
  ],
})
export class SharedModule {}

import { Module } from '@nestjs/common';
import { PrismaService } from './services/prisma.service';
import { CronService } from './services/cron.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { BotService } from './services/bot.service';

@Module({
  imports: [JwtModule],
  providers: [PrismaService, BotService, CronService, JwtStrategy, JwtService],
  exports: [PrismaService, BotService, CronService, JwtStrategy, JwtService],
})
export class SharedModule {}

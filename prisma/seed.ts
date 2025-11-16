import {
  PrismaClient,
  Role,
  CommissionType,
  CommissionName,
} from '@prisma/client';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { TronService } from '../src/shared/services/tron.service';
import { ZephyrService } from '../src/shared/services/zephyr.service';
import { AuthService } from 'src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';

const prisma = new PrismaClient();

// Initialize ConfigService and TronService
const configService = new ConfigService();
const zephyrService = new ZephyrService(configService);
const tronService = new TronService(configService);
const jwtService = new JwtService();

async function main() {
  try {
    console.log('🔄 Starting seed process...');
    const account = await prisma.account.findUnique({
      where: { id: '608bca6c-a57e-43c4-b8f9-0729cfb7bdeb' },
    });
    const { cards } = await zephyrService.getActiveCards(account.childUserId);
    for (const card of cards) {
      const info = await zephyrService.getCardInfo(
        account.childUserId,
        card.id,
      );

      console.log(JSON.stringify(info));
    }
  } catch (error) {
    console.error('❌ Error in main seed function:', error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('\n✅ Seed completed successfully!');
  })
  .catch(async (e) => {
    console.error('\n❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });

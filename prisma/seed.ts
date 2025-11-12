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

const prisma = new PrismaClient();

// Initialize ConfigService and TronService
const configService = new ConfigService();
const zephyrService = new ZephyrService(configService);
const tronService = new TronService(configService);

async function main() {
  try {
    await zephyrService.getToken();
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

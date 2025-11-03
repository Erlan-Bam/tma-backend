import {
  PrismaClient,
  Role,
  CommissionType,
  CommissionName,
} from '@prisma/client';
import { TronWeb } from 'tronweb';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const tronweb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
});

async function main() {
  try {
    console.log('🌱 Starting seed...');
    const accounts = await prisma.account.findMany();

    for (const account of accounts) {
      const { telegramId, ...rest } = account;
      console.log(
        `telegramId: ${telegramId}, account: ${JSON.stringify({ ...rest })}`,
      );
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

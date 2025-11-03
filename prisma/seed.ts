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
    const account = await prisma.account.update({
      where: {
        telegramId: 6003018647,
      },
      data: {
        address: {
          hex: '41142485B6F908FA0CB4BA4528582BFF001A8B0A40',
          base58: 'TBoiGWbdUrpxVGfkcttRf7mi6ByeW5tckf',
        },
        privateKey:
          '86AFE2E8478341114887868322B7AC2C8936FEC5D4F410E8725619F85D84BD23',
        publicKey:
          '04F5087E0BA35EFC31C5728F97F6B83BD83627CCA07EDC34200B66BF56B47106A68F9CCA0CC30BB92A90496D3BE5DE23686F7C2971330F3EABB573F4C59D48E7E6',
      },
    });

    console.log(
      '✅ Seed finished:',
      (account.address as any).base58,
      account.privateKey,
      account.publicKey,
    );
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

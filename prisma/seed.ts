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
    const password = 'Mypassword';
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.account.create({
      data: {
        telegramId: 975314612,
        childUserId: 'FG041300920',
        email: 'erlanzh.gg@gmail.com',
        password: hashedPassword,
        role: Role.ADMIN,
        address: {
          hex: '417CB0E10F300B58FB2AC694E8BF6B4FB2EE7B36F2',
          base58: 'TMLWgd9AbprtieVwG9iwnapQT9kbtWiFWZ',
        },
        privateKey:
          '44D2FC873F1B238BA2117B02EDFFA6E53BFF02F2E4332D643DBB7C318714737A',
        publicKey:
          '04BF122AB467271CFB525A9669730B476D27E5800ACA02E531F327D6125255FC71C486541A1528B9AD20CDFA9B1805C4DE5C517A8CA68ED5EC2179E6CDD2B53167',
      },
    });
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

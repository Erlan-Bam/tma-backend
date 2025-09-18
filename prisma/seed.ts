import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import { ZephyrService } from '../src/shared/services/zephyr.service';

const config = new ConfigService();
const prisma = new PrismaClient();
const zephyrService = new ZephyrService(config);

async function main() {
  const tempEmail = `telegram_${6339940850}@arctic.pay`;
  const tempPassword = crypto.randomBytes(32).toString('hex');

  await prisma.account.create({
    data: {
      email: tempEmail,
      password: tempPassword,
      telegramId: 6339940850,
      childUserId: 'FG042757879',
    },
  });
  console.log('Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

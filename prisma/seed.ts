import {
  PrismaClient,
  Role,
  CommissionType,
  CommissionName,
} from '@prisma/client';
import { TronWeb } from 'tronweb';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const config = new ConfigService();
const tronweb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  headers: { 'TRON-PRO-API-KEY': config.getOrThrow('TRON_API_KEY') },
});

async function main() {
  await prisma.account.update({
    where: { telegramId: 975314612 },
    data: {
      password: bcrypt.hashSync('@ArcticPay_2025!', 10),
    },
  });
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

import { PrismaClient, Role } from '@prisma/client';
import { TronWeb } from 'tronweb';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

const prisma = new PrismaClient();
const config = new ConfigService();
const tronweb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  headers: { 'TRON-PRO-API-KEY': config.getOrThrow('TRON_API_KEY') },
});

async function main() {
  console.log('Seeding finished.');
  const accounts = await prisma.account.findMany();
  for (const account of accounts) {
    const wallet = await tronweb.createAccount();
    await prisma.account.update({
      where: { id: account.id },
      data: {
        address: wallet.address,
        privateKey: wallet.privateKey,
        publicKey: wallet.publicKey,
      },
    });
    console.log(`Updated account ${account.id} with new wallet info.`);
  }
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

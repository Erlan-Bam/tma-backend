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

const prisma = new PrismaClient();

// Initialize ConfigService and TronService
const configService = new ConfigService();
const tronService = new TronService(configService);

async function main() {
  try {
    console.log('🌱 Starting seed...');

    // Generate new Tron account using TronService
    console.log('📝 Generating Tron account using TronService...');
    const account = await tronService.createAccount();

    console.log('✅ Tron account generated:');
    console.log('  Address (base58):', account.address.base58);
    console.log('  Address (hex):', account.address.hex);
    console.log('  Private Key:', account.privateKey);
    console.log('  Public Key:', account.publicKey);

    const telegramId = BigInt(6003018647);

    console.log('📝 Updating user account in database...');

    const userAccount = await prisma.account.update({
      where: {
        telegramId: telegramId,
      },
      data: {
        address: {
          base58: account.address.base58,
          hex: account.address.hex,
        },
        privateKey: account.privateKey,
        publicKey: account.publicKey,
        isWalletValid: true,
        updatedAt: new Date(),
      },
    });

    console.log('✅ User account created/updated:');
    console.log('  ID:', userAccount.id);
    console.log('  Telegram ID:', userAccount.telegramId.toString());
    console.log('  Email:', userAccount.email);
    console.log('  Wallet Address:', (userAccount.address as any).base58);

    // Seed default commissions if they don't exist
    console.log('📝 Seeding commissions...');

    await prisma.commission.upsert({
      where: { name: CommissionName.CARD_FEE },
      update: {},
      create: {
        name: CommissionName.CARD_FEE,
        rate: 1, // 5% or $0.05 depending on type
        type: CommissionType.PERCENTAGE,
      },
    });

    await prisma.commission.upsert({
      where: { name: CommissionName.TRANSACTION_FEE },
      update: {},
      create: {
        name: CommissionName.TRANSACTION_FEE,
        rate: 0.02, // 2% or $0.02 depending on type
        type: CommissionType.PERCENTAGE,
      },
    });

    console.log('✅ Commissions seeded');

    console.log(
      '\n✅ Seed finished successfully:',
      '\n  Base58 Address:',
      account.address.base58,
      '\n  Private Key:',
      account.privateKey,
      '\n  Public Key:',
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

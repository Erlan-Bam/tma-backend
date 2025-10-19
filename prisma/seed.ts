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

// Configuration
const TOTAL_ACCOUNTS = 12000;
const BATCH_SIZE = 100; // Insert in batches to avoid memory issues
const DEFAULT_PASSWORD = bcrypt.hashSync('test123', 10);

// Generate a random Tron wallet
async function generateTronWallet() {
  const account = await tronweb.createAccount();
  return {
    address: {
      base58: account.address.base58,
      hex: account.address.hex,
    },
    privateKey: account.privateKey,
    publicKey: account.publicKey,
  };
}

// Generate test accounts
async function seedAccounts() {
  console.log(`🌱 Starting to seed ${TOTAL_ACCOUNTS} accounts...`);

  const batches = Math.ceil(TOTAL_ACCOUNTS / BATCH_SIZE);
  let totalCreated = 0;

  for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
    const batchStart = batchIndex * BATCH_SIZE;
    const batchEnd = Math.min((batchIndex + 1) * BATCH_SIZE, TOTAL_ACCOUNTS);
    const currentBatchSize = batchEnd - batchStart;

    console.log(
      `\n📦 Processing batch ${batchIndex + 1}/${batches} (${batchStart} - ${batchEnd})`,
    );

    const accounts = [];

    for (let i = 0; i < currentBatchSize; i++) {
      const accountIndex = batchStart + i;
      const wallet = await generateTronWallet();

      accounts.push({
        telegramId: BigInt(1000000000 + accountIndex), // Unique telegram IDs starting from 1000000000
        email: `test${accountIndex}@example.com`,
        password: DEFAULT_PASSWORD,
        childUserId: `child_${accountIndex}_${crypto.randomBytes(8).toString('hex')}`,
        address: wallet.address,
        privateKey: wallet.privateKey,
        publicKey: wallet.publicKey,
        role: Role.USER,
        isBanned: false,
      });
    }

    try {
      await prisma.account.createMany({
        data: accounts,
        skipDuplicates: true,
      });

      totalCreated += currentBatchSize;
      console.log(
        `✅ Created ${currentBatchSize} accounts (Total: ${totalCreated}/${TOTAL_ACCOUNTS})`,
      );
    } catch (error) {
      console.error(
        `❌ Error creating batch ${batchIndex + 1}:`,
        error.message,
      );
    }

    // Small delay between batches to avoid overwhelming the system
    if (batchIndex < batches - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  console.log(`\n✨ Completed! Total accounts created: ${totalCreated}`);
}

// Seed commissions
async function seedCommissions() {
  console.log('\n💰 Seeding commissions...');

  await prisma.commission.upsert({
    where: { name: CommissionName.CARD_FEE },
    update: {},
    create: {
      name: CommissionName.CARD_FEE,
      type: CommissionType.FIXED,
      rate: 1.5,
    },
  });

  await prisma.commission.upsert({
    where: { name: CommissionName.TRANSACTION_FEE },
    update: {},
    create: {
      name: CommissionName.TRANSACTION_FEE,
      type: CommissionType.FIXED,
      rate: 1.2,
    },
  });

  console.log('✅ Commissions seeded');
}

async function main() {
  try {
    console.log('\n🗑️  Starting to delete accounts...');

    // List of telegramIds to keep
    const telegramIdsToKeep = [
      BigInt(5466782124),
      BigInt(6272629332),
      BigInt(6339940850),
      BigInt(839885529),
      BigInt(5893148654),
      BigInt(6003018647),
      BigInt(975314612),
    ];

    // Delete all accounts where telegramId is NOT in the list
    const deleteResult = await prisma.account.deleteMany({
      where: {
        telegramId: {
          notIn: telegramIdsToKeep,
        },
      },
    });

    console.log(`✅ Deleted ${deleteResult.count} accounts`);
    console.log(
      `📋 Kept ${telegramIdsToKeep.length} accounts with specified telegramIds`,
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

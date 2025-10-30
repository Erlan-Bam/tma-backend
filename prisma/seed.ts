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
    
    // Seed accounts
    console.log('Creating accounts...');
    
    const account1 = await prisma.account.upsert({
      where: { id: '6b488c3d-d3b3-4887-a237-f9699d49a3bb' },
      update: {},
      create: {
        id: '6b488c3d-d3b3-4887-a237-f9699d49a3bb',
        role: 'USER',
        telegramId: 6003018647n,
        email: 'choo41361@gmail.com',
        password: '$2b$10$gpXG1rbl8bgNh6YF5cVnTOiSP6/07WjDNyqRgBevMPHG3E/eFlAnu',
        createdAt: new Date('2025-10-26T10:22:57.342Z'),
        updatedAt: new Date('2025-10-27T10:20:15.272Z'),
        checkedAt: new Date('2025-10-27T10:20:15.271Z'),
        childUserId: 'FG052581470',
        isBanned: false,
        address: {
          hex: '4141EECE8980F4190EE746E11558D58BCA8BFE8CE2',
          base58: 'TFyq17arvQnDP32bcZSjGSjvF4zzxJ7Wjs'
        },
        privateKey: 'B0BA5757B131747B9D6A5C441D12BF5F77FBA9843E22E1ECA02F1F49BA640419',
        publicKey: '04349FF90A5B44941DAFA1E7338794A5509AF4105FCF0BFFED825C430FF5734A0EF3F6CDE590DA8E66483F268D85620B7C5D1195E7487CBA24682581B1178977E4',
        referredBy: null,
      },
    });

    const account2 = await prisma.account.upsert({
      where: { id: '065e2f51-dad7-42e8-af0c-aae4b14adab8' },
      update: {},
      create: {
        id: '065e2f51-dad7-42e8-af0c-aae4b14adab8',
        role: 'USER',
        telegramId: 6339940850n,
        email: 'tertydert@gmail.com',
        password: '$2b$10$zZG78RXWFgmfy8EyMnd7lueLVkDLNT2TBpu30ZtMTUIiJjd2q5RbW',
        createdAt: new Date('2025-10-27T08:38:29.349Z'),
        updatedAt: new Date('2025-10-27T10:20:15.272Z'),
        checkedAt: new Date('2025-10-27T10:20:15.271Z'),
        childUserId: 'FG043555710',
        isBanned: false,
        address: {
          hex: '41CC3E1253D65FACFBD591D6E41AAF14D69B5C711A',
          base58: 'TUb9D15geaYPmpe4DtkKAsp9sP4MfHAvLi'
        },
        privateKey: '568E18484EDCF4502C81D1CC21C3B785B99BD3AA0E23B05717FB82DD5204E750',
        publicKey: '04748648C581DD8B37EA9E518A9B8345D3B2135929927EBE5C13E928F13BC6E1770C5731C777DE013461A01789215CA81390B23A9370621BEA84592EEA2C1D7EC6',
        referredBy: null,
      },
    });

    console.log('✅ Created accounts:', {
      account1: account1.email,
      account2: account2.email,
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

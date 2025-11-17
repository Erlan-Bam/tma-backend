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
import { AuthService } from 'src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';

const prisma = new PrismaClient();

// Initialize ConfigService and TronService
const configService = new ConfigService();
const zephyrService = new ZephyrService(configService);
const tronService = new TronService(configService);
const jwtService = new JwtService();

async function main() {
  try {
    const account = await prisma.account.update({
      where: { id: '608bca6c-a57e-43c4-b8f9-0729cfb7bdeb' },
      data: { checkedAt: new Date() },
    });

    if (!account) {
      console.log('❌ Account not found');
      return;
    }

    // const JWT_ACCESS_SECRET = configService.getOrThrow('JWT_ACCESS_SECRET');

    // const token = await jwtService.signAsync(
    //   {
    //     id: account.id,
    //     role: account.role,
    //     email: account.email,
    //     isBanned: account.isBanned,
    //   },
    //   {
    //     secret: JWT_ACCESS_SECRET,
    //     expiresIn: '1y',
    //   },
    // );

    // console.log('\n✅ JWT Token generated successfully!');
    // console.log('\nAccount ID:', account.id);
    // console.log('Email:', account.email);
    // console.log('Role:', account.role);
    // console.log('\n🔑 JWT Token:');
    // console.log(token);
    // console.log('\n');
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

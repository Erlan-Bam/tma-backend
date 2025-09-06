import { Controller, Logger } from '@nestjs/common';
import { PrismaService } from 'src/shared/services/prisma.service';

@Controller('account')
export class AccountController {
  private readonly logger = new Logger(AccountController.name);
  constructor(private prisma: PrismaService) {}
}

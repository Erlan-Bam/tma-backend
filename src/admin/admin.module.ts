import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { SharedModule } from 'src/shared/shared.module';
import { TransactionModule } from 'src/transaction/transaction.module';

@Module({
  imports: [SharedModule, TransactionModule],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}

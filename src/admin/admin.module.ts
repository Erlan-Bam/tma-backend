import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { SharedModule } from 'src/shared/shared.module';
import { TransactionModule } from 'src/transaction/transaction.module';
import { CardModule } from 'src/card/card.module';

@Module({
  imports: [SharedModule, TransactionModule, CardModule],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}

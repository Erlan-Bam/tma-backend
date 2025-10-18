import { Controller, Post } from '@nestjs/common';
import { TransactionTronService } from './services/tron.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@Controller('transaction')
@ApiTags('Transaction')
@ApiBearerAuth('JWT')
export class TransactionController {
  constructor(private transactionTronService: TransactionTronService) {}

  // @Post('test')
  // async test() {
  //   return await this.transactionTronService.getWalletUSDTTransactions(
  //     'TBoiGWbdUrpxVGfkcttRf7mi6ByeW5tckf',
  //   );
  // }
}

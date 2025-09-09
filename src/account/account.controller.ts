import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { AccountService } from './account.service';
import { TopupWalletDto } from './dto/topup-wallet.dto';
import { GetTopupApplications } from './dto/get-topup-applications.dto';

@Controller('account')
export class AccountController {
  constructor(private accountService: AccountService) {}

  @Post('topup/wallet')
  async topupWallet(@Body() data: TopupWalletDto) {
    return await this.accountService.topupWallet(data);
  }

  @Get('topup/applications/:id')
  async getTopupApplications(
    @Param('id', ParseIntPipe) id: number,
    @Query() data: GetTopupApplications,
  ) {
    return await this.accountService.getTopupApplications(id, data);
  }

  @Get('topup/transactions/:id')
  async getTopupTransactions(@Param('id', ParseIntPipe) id: number) {
    return await this.accountService.getTopupTransactions(id);
  }

  @Get('telegram/:id')
  async getAccountByTelegramId(@Param('id', ParseIntPipe) id: number) {
    return await this.accountService.getAccountByTelegramId(id);
  }
}

import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AccountService } from './account.service';
import { TopupWalletDto } from './dto/topup-wallet.dto';
import { GetTopupApplications } from './dto/get-topup-applications.dto';
import { AuthGuard } from '@nestjs/passport';
import { User } from 'src/shared/decorator/user.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';
import { GetUserTransactionsDto } from 'src/admin/dto/get-user-transactions.dto';
import { GetAccountTransactionsDto } from './dto/get-account-transactions';

@Controller('account')
@ApiBearerAuth('JWT')
@UseGuards(AuthGuard('jwt'))
export class AccountController {
  constructor(private accountService: AccountService) {}

  @Post('topup')
  async topupWallet(@User('id') userId: string) {
    return await this.accountService.topupWallet(userId);
  }

  @Get('')
  async getAccountById(@User('id') userId: string) {
    return await this.accountService.getAccountById(userId);
  }

  @Get('balance')
  async getAccountBalance(@User('id') userId: string) {
    return await this.accountService.getAccountBalance(userId);
  }

  @Get('transactions')
  async getCardTransactions(
    @User('id') userId: string,
    @Query() query: GetAccountTransactionsDto,
  ) {
    return await this.accountService.getAccountTransactions(userId, query);
  }

  @Get('topup/applications')
  async getTopupApplications(
    @User('id') userId: string,
    @Query() data: GetTopupApplications,
  ) {
    return await this.accountService.getTopupApplications(userId, data);
  }

  @Get('topup/transactions')
  async getTopupTransactions(@User('id') userId: string) {
    return await this.accountService.getTopupTransactions(userId);
  }

  @Get('referral/link')
  async getReferralLink(@User('id') userId: string) {
    return await this.accountService.getReferralLink(userId);
  }

  @Get('referral/stats')
  async getReferralStats(@User('id') userId: string) {
    return await this.accountService.getReferralStats(userId);
  }
}

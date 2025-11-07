import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from 'src/shared/guards/admin.guard';
import { UpdateCommissionDto } from './dto/update-commision.dto';
import { GetStatsDto } from './dto/get-stats.dto';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { GetUserTransactionsDto } from './dto/get-user-transactions.dto';
import { TopupUserAccountDto } from './dto/topup-user-account.dto';
import { TransferTrxToSubWalletDto } from './dto/transfer-trx-to-sub-wallet.dto';

@Controller('admin')
@ApiTags('Admin')
@ApiBearerAuth('JWT')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('cards')
  async getAllCards() {
    return await this.adminService.getAllCards();
  }

  @Get('user/transactions')
  async getUserTransactions(@Query() query: GetUserTransactionsDto) {
    return await this.adminService.getUserTransactions(query);
  }

  @Get('accounts')
  async getAllAccounts(@Query() query: PaginationDto) {
    return await this.adminService.getAllAccounts(query);
  }

  @Get('user/:childUserId/cards')
  async getUserCards(@Param('childUserId') childUserId: string) {
    return await this.adminService.getUserCards(childUserId);
  }

  @Get('user/:childUserId/account')
  async getUserAccount(@Param('childUserId') childUserId: string) {
    return await this.adminService.getUserAccount(childUserId);
  }

  @Post('user/disable/:userId')
  async disableUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return await this.adminService.disableUser(userId);
  }

  @Post('user/enable/:userId')
  async enableUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return await this.adminService.enableUser(userId);
  }

  @Post('transfer/:userId')
  async transferUSDT(@Param('userId', ParseUUIDPipe) userId: string) {
    return await this.adminService.transferUSDT(userId);
  }

  @Post('transfer/trx/:userId')
  async transferTRX(@Param('userId', ParseUUIDPipe) userId: string) {
    return await this.adminService.transferTRX(userId);
  }

  @Post('transfer-to/trx/:userId')
  @ApiOperation({
    summary: 'Transfer TRX to sub-wallet',
    description: 'Transfers a specified amount of TRX from main wallet to a user\'s sub-wallet',
  })
  @ApiParam({
    name: 'userId',
    description: 'The UUID of the user',
    type: String,
  })
  async transferTRXToSubWallet(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() data: TransferTrxToSubWalletDto,
  ) {
    return await this.adminService.transferTRXToSubWallet(userId, data.amount);
  }

  @Get('general/stats')
  async getGeneralStats(@Query() query: GetStatsDto) {
    return await this.adminService.getGeneralStats(query);
  }

  @Get('balance/:userId')
  async getUserBalance(@Param('userId', ParseUUIDPipe) userId: string) {
    return await this.adminService.getUserBalance(userId);
  }

  @Get('balance/zephyr/:userId')
  async getZephyrBalance(@Param('userId', ParseUUIDPipe) userId: string) {
    return await this.adminService.getZephyrBalance(userId);
  }

  @Get('balance/tron/:userId')
  async getTronBalance(@Param('userId', ParseUUIDPipe) userId: string) {
    return await this.adminService.getTronBalance(userId);
  }

  @Patch('card-fee')
  async updateCardFee(@Body() data: UpdateCommissionDto) {
    return await this.adminService.updateCardFee(data);
  }

  @Patch('transaction-fee')
  async updateTransactionFee(@Body() data: UpdateCommissionDto) {
    return await this.adminService.updateTransactionFee(data);
  }

  @Get('maintenance/status')
  async getMaintenanceStatus() {
    return await this.adminService.getMaintenanceStatus();
  }

  @Post('maintenance/enable')
  async enableMaintenance() {
    return await this.adminService.enableMaintenance();
  }

  @Post('maintenance/disable')
  async disableMaintenance() {
    return await this.adminService.disableMaintenance();
  }

  @Patch('maintenance')
  async setMaintenance(@Body() data: { isTechWork: boolean }) {
    return await this.adminService.setMaintenance(data.isTechWork);
  }

  @Get('website-tech-work/status')
  async getWebsiteTechWorkStatus() {
    return await this.adminService.getWebsiteTechWorkStatus();
  }

  @Post('website-tech-work/enable')
  async enableWebsiteTechWork() {
    return await this.adminService.enableWebsiteTechWork();
  }

  @Post('website-tech-work/disable')
  async disableWebsiteTechWork() {
    return await this.adminService.disableWebsiteTechWork();
  }

  @Patch('website-tech-work')
  async setWebsiteTechWork(@Body() data: { isWebsiteTechWork: boolean }) {
    return await this.adminService.setWebsiteTechWork(data.isWebsiteTechWork);
  }

  @Get('queue/status')
  async getQueueStatus() {
    return await this.adminService.getQueueStatus();
  }

  @Get('queue/failed')
  async getFailedJobs(@Query() query: PaginationDto) {
    return await this.adminService.getFailedJobs(query.limit);
  }

  @Post('queue/retry/:jobId')
  async retryFailedJob(@Param('jobId') jobId: string) {
    return await this.adminService.retryFailedJob(jobId);
  }

  @Post('queue/retry-all')
  async retryAllFailedJobs() {
    return await this.adminService.retryAllFailedJobs();
  }

  @Delete('queue/failed/clear')
  async clearFailedJobs() {
    return await this.adminService.clearFailedJobs();
  }

  @Delete('queue/failed/:jobId')
  async removeFailedJob(@Param('jobId') jobId: string) {
    return await this.adminService.removeFailedJob(jobId);
  }

  @Post('user/topup')
  async topupUserAccount(@Body() data: TopupUserAccountDto) {
    return await this.adminService.topupUserAccount(data);
  }
}

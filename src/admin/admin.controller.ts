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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiResponse,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { AdminGuard } from 'src/shared/guards/admin.guard';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { Public } from 'src/shared/decorator/public.decorator';
import { UpdateCommissionDto } from './dto/update-commision.dto';
import { GetStatsDto } from './dto/get-stats.dto';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { GetUserTransactionsDto } from './dto/get-user-transactions.dto';
import { TopupUserAccountDto } from './dto/topup-user-account.dto';
import { TransferTrxToSubWalletDto } from './dto/transfer-trx-to-sub-wallet.dto';
import { SetMaintenanceDto } from './dto/maintenance.dto';
import { SetWebsiteTechWorkDto } from './dto/set-website-tech-work.dto';

@Controller('admin')
@ApiTags('Admin')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('cards')
  @ApiOperation({
    summary: 'Get all cards',
    description: 'Retrieves all cards from Zephyr system',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved all cards',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getAllCards() {
    return await this.adminService.getAllCards();
  }

  @Get('user/transactions')
  @ApiOperation({
    summary: 'Get user transactions',
    description:
      'Retrieves transaction history for a specific user with optional filtering',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved user transactions',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getUserTransactions(@Query() query: GetUserTransactionsDto) {
    return await this.adminService.getUserTransactions(query);
  }

  @Get('accounts')
  @ApiOperation({
    summary: 'Get all accounts',
    description: 'Retrieves all user accounts with pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved all accounts',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getAllAccounts(@Query() query: PaginationDto) {
    return await this.adminService.getAllAccounts(query);
  }

  @Get('user/:childUserId/cards')
  @ApiOperation({
    summary: 'Get user cards',
    description: 'Retrieves all active cards for a specific user',
  })
  @ApiParam({
    name: 'childUserId',
    description: 'The Zephyr child user ID',
    type: String,
    example: 'child_123456',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved user cards',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getUserCards(@Param('childUserId') childUserId: string) {
    return await this.adminService.getUserCards(childUserId);
  }

  @Get('user/:childUserId/account')
  @ApiOperation({
    summary: 'Get user account',
    description: 'Retrieves detailed account information for a specific user',
  })
  @ApiParam({
    name: 'childUserId',
    description: 'The Zephyr child user ID',
    type: String,
    example: 'child_123456',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved user account',
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getUserAccount(@Param('childUserId') childUserId: string) {
    return await this.adminService.getUserAccount(childUserId);
  }

  @Post('user/disable/:userId')
  @ApiOperation({
    summary: 'Disable user',
    description: 'Disables a user account in both database and Zephyr',
  })
  @ApiParam({
    name: 'userId',
    description: 'The UUID of the user to disable',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'User disabled successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async disableUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return await this.adminService.disableUser(userId);
  }

  @Post('user/enable/:userId')
  @ApiOperation({
    summary: 'Enable user',
    description: 'Enables a user account in both database and Zephyr',
  })
  @ApiParam({
    name: 'userId',
    description: 'The UUID of the user to enable',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'User enabled successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async enableUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return await this.adminService.enableUser(userId);
  }

  @Post('transfer/:userId')
  @ApiOperation({
    summary: 'Transfer USDT to main wallet',
    description: 'Transfers USDT from user sub-wallet to main wallet',
  })
  @ApiParam({
    name: 'userId',
    description: 'The UUID of the user',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'USDT transferred successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async transferUSDT(@Param('userId', ParseUUIDPipe) userId: string) {
    return await this.adminService.transferUSDT(userId);
  }

  @Post('transfer/trx/:userId')
  @ApiOperation({
    summary: 'Transfer TRX to main wallet',
    description: 'Transfers TRX from user sub-wallet to main wallet',
  })
  @ApiParam({
    name: 'userId',
    description: 'The UUID of the user',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'TRX transferred successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async transferTRX(@Param('userId', ParseUUIDPipe) userId: string) {
    return await this.adminService.transferTRX(userId);
  }

  @Post('transfer-to/trx/:userId')
  @ApiOperation({
    summary: 'Transfer TRX to sub-wallet',
    description:
      "Transfers a specified amount of TRX from main wallet to a user's sub-wallet",
  })
  @ApiParam({
    name: 'userId',
    description: 'The UUID of the user',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'TRX transferred to sub-wallet successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async transferTRXToSubWallet(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() data: TransferTrxToSubWalletDto,
  ) {
    return await this.adminService.transferTRXToSubWallet(userId, data.amount);
  }

  @Get('general/stats')
  @ApiOperation({
    summary: 'Get general statistics',
    description:
      'Retrieves general platform statistics with optional date filtering',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved statistics',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getGeneralStats(@Query() query: GetStatsDto) {
    return await this.adminService.getGeneralStats(query);
  }

  @Get('balance/:userId')
  @ApiOperation({
    summary: 'Get user balance',
    description:
      'Retrieves the total balance for a user from successful transactions',
  })
  @ApiParam({
    name: 'userId',
    description: 'The UUID of the user',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved user balance',
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getUserBalance(@Param('userId', ParseUUIDPipe) userId: string) {
    return await this.adminService.getUserBalance(userId);
  }

  @Get('balance/zephyr/:userId')
  @ApiOperation({
    summary: 'Get Zephyr balance',
    description: "Retrieves the user's balance from Zephyr platform",
  })
  @ApiParam({
    name: 'userId',
    description: 'The UUID of the user',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved Zephyr balance',
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getZephyrBalance(@Param('userId', ParseUUIDPipe) userId: string) {
    return await this.adminService.getZephyrBalance(userId);
  }

  @Get('balance/tron/:userId')
  @ApiOperation({
    summary: 'Get Tron balance',
    description: "Retrieves the user's TRX and USDT balance on Tron network",
  })
  @ApiParam({
    name: 'userId',
    description: 'The UUID of the user',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved Tron balance',
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getTronBalance(@Param('userId', ParseUUIDPipe) userId: string) {
    return await this.adminService.getTronBalance(userId);
  }

  @Get('card-fee')
  @ApiOperation({
    summary: 'Get card fee',
    description: 'Retrieves the current card creation fee configuration',
  })
  @ApiResponse({
    status: 200,
    description: 'Card fee retrieved successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getCardFee() {
    return await this.adminService.getCardFee();
  }

  @Patch('card-fee')
  @ApiOperation({
    summary: 'Update card fee',
    description: 'Updates the card creation fee configuration',
  })
  @ApiResponse({
    status: 200,
    description: 'Card fee updated successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async updateCardFee(@Body() data: UpdateCommissionDto) {
    return await this.adminService.updateCardFee(data);
  }

  @Get('transaction-fee')
  @ApiOperation({
    summary: 'Get transaction fee',
    description: 'Retrieves the current transaction fee configuration',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction fee retrieved successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getTransactionFee() {
    return await this.adminService.getTransactionFee();
  }

  @Patch('transaction-fee')
  @ApiOperation({
    summary: 'Update transaction fee',
    description: 'Updates the transaction fee configuration',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction fee updated successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async updateTransactionFee(@Body() data: UpdateCommissionDto) {
    return await this.adminService.updateTransactionFee(data);
  }

  @Get('maintenance/status')
  @Public()
  @ApiOperation({
    summary: 'Get maintenance status',
    description: 'Retrieves the current maintenance mode status',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved maintenance status',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getMaintenanceStatus() {
    return await this.adminService.getMaintenanceStatus();
  }

  @Post('maintenance/enable')
  @ApiOperation({
    summary: 'Enable maintenance mode',
    description: 'Enables maintenance mode for the platform',
  })
  @ApiResponse({
    status: 200,
    description: 'Maintenance mode enabled successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async enableMaintenance() {
    return await this.adminService.enableMaintenance();
  }

  @Post('maintenance/disable')
  @ApiOperation({
    summary: 'Disable maintenance mode',
    description: 'Disables maintenance mode for the platform',
  })
  @ApiResponse({
    status: 200,
    description: 'Maintenance mode disabled successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async disableMaintenance() {
    return await this.adminService.disableMaintenance();
  }

  @Patch('maintenance')
  @ApiOperation({
    summary: 'Set maintenance mode',
    description: 'Sets the maintenance mode status',
  })
  @ApiResponse({
    status: 200,
    description: 'Maintenance mode updated successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async setMaintenance(@Body() data: SetMaintenanceDto) {
    return await this.adminService.setMaintenance(data.isTechWork);
  }

  @Get('website-tech-work/status')
  @Public()
  @ApiOperation({
    summary: 'Get website tech work status',
    description: 'Retrieves the current website technical work status',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved website tech work status',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getWebsiteTechWorkStatus() {
    return await this.adminService.getWebsiteTechWorkStatus();
  }

  @Post('website-tech-work/enable')
  @ApiOperation({
    summary: 'Enable website tech work',
    description: 'Enables technical work mode for the website',
  })
  @ApiResponse({
    status: 200,
    description: 'Website tech work mode enabled successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async enableWebsiteTechWork() {
    return await this.adminService.enableWebsiteTechWork();
  }

  @Post('website-tech-work/disable')
  @ApiOperation({
    summary: 'Disable website tech work',
    description: 'Disables technical work mode for the website',
  })
  @ApiResponse({
    status: 200,
    description: 'Website tech work mode disabled successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async disableWebsiteTechWork() {
    return await this.adminService.disableWebsiteTechWork();
  }

  @Patch('website-tech-work')
  @ApiOperation({
    summary: 'Set website tech work mode',
    description: 'Sets the website technical work mode status',
  })
  @ApiResponse({
    status: 200,
    description: 'Website tech work mode updated successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async setWebsiteTechWork(@Body() data: SetWebsiteTechWorkDto) {
    return await this.adminService.setWebsiteTechWork(data.isWebsiteTechWork);
  }

  @Get('queue/status')
  @ApiOperation({
    summary: 'Get queue status',
    description: 'Retrieves the current status of the transaction queue',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved queue status',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getQueueStatus() {
    return await this.adminService.getQueueStatus();
  }

  @Get('queue/failed')
  @ApiOperation({
    summary: 'Get failed jobs',
    description: 'Retrieves failed jobs from the transaction queue',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved failed jobs',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getFailedJobs(@Query() query: PaginationDto) {
    return await this.adminService.getFailedJobs(query.limit);
  }

  @Post('queue/retry/:jobId')
  @ApiOperation({
    summary: 'Retry failed job',
    description: 'Retries a specific failed job by ID',
  })
  @ApiParam({
    name: 'jobId',
    description: 'The ID of the job to retry',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Job queued for retry successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async retryFailedJob(@Param('jobId') jobId: string) {
    return await this.adminService.retryFailedJob(jobId);
  }

  @Post('queue/retry-all')
  @ApiOperation({
    summary: 'Retry all failed jobs',
    description: 'Retries all failed jobs in the transaction queue',
  })
  @ApiResponse({
    status: 200,
    description: 'All failed jobs queued for retry successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async retryAllFailedJobs() {
    return await this.adminService.retryAllFailedJobs();
  }

  @Delete('queue/failed/clear')
  @ApiOperation({
    summary: 'Clear all failed jobs',
    description: 'Removes all failed jobs from the transaction queue',
  })
  @ApiResponse({
    status: 200,
    description: 'Failed jobs cleared successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async clearFailedJobs() {
    return await this.adminService.clearFailedJobs();
  }

  @Delete('queue/failed/:jobId')
  @ApiOperation({
    summary: 'Remove failed job',
    description:
      'Removes a specific failed job by ID from the transaction queue',
  })
  @ApiParam({
    name: 'jobId',
    description: 'The ID of the job to remove',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Job removed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async removeFailedJob(@Param('jobId') jobId: string) {
    return await this.adminService.removeFailedJob(jobId);
  }

  @Post('user/topup')
  @ApiOperation({
    summary: 'Topup user account',
    description: "Adds funds to a user's Zephyr account",
  })
  @ApiResponse({
    status: 200,
    description: 'User account topped up successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request or topup failed',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async topupUserAccount(@Body() data: TopupUserAccountDto) {
    return await this.adminService.topupUserAccount(data);
  }
}

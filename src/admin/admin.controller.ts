import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from 'src/shared/guards/admin.guard';
import { UpdateCommissionDto } from './dto/update-commision.dto';
import { GetStatsDto } from './dto/get-stats.dto';

@Controller('admin')
@ApiBearerAuth('JWT')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('cards')
  async getAllCards() {
    return await this.adminService.getAllCards();
  }

  @Get('accounts')
  async getAllAccounts() {
    return await this.adminService.getAllAccounts();
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
}

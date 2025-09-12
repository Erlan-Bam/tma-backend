import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from 'src/shared/guards/admin.guard';

@Controller('admin')
@ApiBearerAuth('JWT')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('cards')
  async getAllCards() {
    return await this.adminService.getAllCards();
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
}

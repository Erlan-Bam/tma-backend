import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { AccountService } from './account.service';

@Controller('account')
export class AccountController {
  constructor(private accountService: AccountService) {}

  @Get('telegram/:id')
  async getAccountByTelegramId(@Param('id', ParseIntPipe) id: number) {
    return await this.accountService.getAccountByTelegramId(id);
  }
}

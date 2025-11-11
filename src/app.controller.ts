import { Body, Controller, Logger, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('App')
@Controller('')
export class AppController {
  private readonly logger = new Logger(AppController.name);
  constructor(private readonly appService: AppService) {}

  @Post('webhook')
  @ApiOperation({
    summary: 'Telegram bot webhook endpoint',
    description: 'Handles incoming updates from Telegram Bot API',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid webhook data',
  })
  async handleWebhook(@Body() data: any) {
    this.logger.log('🔔 Received webhook data:', data);
    return await this.appService.handleWebhook(data);
  }
}

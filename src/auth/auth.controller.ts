import {
  Body,
  Controller,
  Logger,
  Post,
  Get,
  UseGuards,
  HttpException,
} from '@nestjs/common';
import { TmaAuthDto } from './dto/tma-auth.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ApiTags, ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(private authService: AuthService) {}

  @Post('tma')
  @ApiOperation({ summary: 'Authenticate via Telegram Mini App' })
  @ApiBody({ type: TmaAuthDto })
  @ApiResponse({ status: 201, description: 'User authenticated via TMA' })
  async tmaAuth(@Body() data: TmaAuthDto) {
    return await this.authService.tmaAuth(data);
  }

  @Get('test')
  async test() {
    return await this.authService.test();
  }
}

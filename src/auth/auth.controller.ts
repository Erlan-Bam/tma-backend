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
import { ApiTags, ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { User } from 'src/shared/decorator/user.decorator';
import { AuthGuard } from '@nestjs/passport';
import { UserGuard } from 'src/shared/guards/user.guard';

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

  @Get('validate')
  @UseGuards(AuthGuard('jwt'), UserGuard)
  @ApiOperation({ summary: 'Validate current token and get user info' })
  @ApiResponse({
    status: 200,
    description: 'Token is valid, user info returned',
  })
  @ApiResponse({
    status: 401,
    description: 'Token is invalid or user not found',
  })
  async validateToken(@User() user: any) {
    const validUser = await this.authService.validateTokenAndUser(user.id);
    if (!validUser) {
      throw new HttpException('User not found or banned', 401);
    }

    return {
      valid: true,
      user: {
        id: validUser.id,
        telegramId: validUser.telegramId.toString(),
        email: validUser.email,
        role: validUser.role,
        createdAt: validUser.createdAt,
      },
    };
  }

  @Get('tokens')
  async tokens() {
    return await this.authService.genTokens();
  }
}

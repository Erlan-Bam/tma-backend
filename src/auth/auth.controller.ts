import {
  Body,
  Controller,
  Logger,
  Post,
  Get,
  UseGuards,
  HttpException,
} from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TmaAuthDto } from './dto/tma-auth.dto';
import { ApiTags, ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { User } from 'src/shared/decorator/user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login user with email or phone and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 201, description: 'Tokens issued' })
  async login(@Body() data: LoginDto) {
    const tokens = await this.authService.login(data);
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    };
  }

  @Post('register')
  @ApiOperation({ summary: 'Register user with email or phone and password' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Tokens issued after registration' })
  async register(@Body() data: RegisterDto) {
    this.logger.debug(JSON.stringify(data));
    const tokens = await this.authService.register(data);
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'New access token' })
  async refresh(@Body() body: { token: string }) {
    const newAccessToken = await this.authService.refreshAccessToken(
      body.token,
    );
    return { access_token: newAccessToken };
  }

  @Post('tma')
  @ApiOperation({ summary: 'Authenticate via Telegram Mini App' })
  @ApiBody({ type: TmaAuthDto })
  @ApiResponse({ status: 201, description: 'User authenticated via TMA' })
  async tmaAuth(@Body() data: TmaAuthDto) {
    return await this.authService.tmaAuth(data);
  }

  @Get('validate')
  @UseGuards(JwtAuthGuard)
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
    // Дополнительная проверка пользователя в базе данных
    const validUser = await this.authService.validateTokenAndUser(user.id);
    if (!validUser) {
      throw new HttpException('User not found or banned', 401);
    }

    return {
      valid: true,
      user: {
        id: validUser.id,
        telegramId: validUser.telegramId.toString(), // Конвертируем BigInt в строку
        email: validUser.email,
        role: validUser.role,
        createdAt: validUser.createdAt,
      },
    };
  }

  @Post('refresh-v2')
  @ApiOperation({ summary: 'Refresh both access and refresh tokens' })
  @ApiBody({ schema: { properties: { refresh_token: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
  async refreshV2(@Body() body: { refresh_token: string }) {
    return await this.authService.refreshAccessTokenV2(body.refresh_token);
  }

  @Post('link-zephyr')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Link existing Zephyr account to user' })
  @ApiBody({
    schema: {
      properties: {
        email: { type: 'string' },
        password: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Zephyr account linked successfully',
  })
  async linkZephyrAccount(
    @Body() data: { email: string; password: string },
    @User('id') userId: string,
  ) {
    return await this.authService.linkZephyrAccount(
      userId,
      data.email,
      data.password,
    );
  }

  @Post('retry-zephyr-linking')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Retry Zephyr account linking with TMA registration data',
  })
  @ApiResponse({ status: 200, description: 'Zephyr linking attempted' })
  async retryZephyrLinking(@User('id') userId: string) {
    return await this.authService.retryZephyrLinking(userId);
  }

  @Post('set-child-user-id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Manually set childUserId for user (admin only)' })
  @ApiBody({
    schema: {
      properties: {
        childUserId: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'ChildUserId set successfully' })
  async setChildUserId(
    @Body() data: { childUserId: string },
    @User('id') userId: string,
  ) {
    return await this.authService.setChildUserId(userId, data.childUserId);
  }
}

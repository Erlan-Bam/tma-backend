import { Body, Controller, Logger, Post } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TmaAuthDto } from './dto/tma-auth.dto';
import { ApiTags, ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';

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
}

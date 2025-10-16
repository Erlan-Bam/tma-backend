import { Body, Controller, Logger, Post } from '@nestjs/common';
import { TmaDto } from './dto/tma-auth.dto';
import { ApiTags, ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(private authService: AuthService) {}

  @Post('tma')
  @ApiOperation({
    summary: 'Register/Login a new user with email and password',
  })
  @ApiBody({ type: TmaDto })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered/logged in',
  })
  @ApiResponse({ status: 400, description: 'Email already exists' })
  async tma(@Body() data: TmaDto) {
    return await this.authService.tma(data);
  }
}

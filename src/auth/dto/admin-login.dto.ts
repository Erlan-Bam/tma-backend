import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
export class AdminLoginDto {
  @ApiPropertyOptional({
    description: 'User email address. Not required if user already exists.',
    example: 'user@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    description:
      'User password (minimum 6 characters). Not required if user already exists.',
    example: 'SecurePassword123!',
  })
  @IsString()
  @MinLength(6)
  password!: string;
}

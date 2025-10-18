import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
export class TmaDto {
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

  @ApiProperty({
    description: 'Telegram user ID',
    example: 123456789,
  })
  @IsNumber()
  telegramId!: number;

  @ApiProperty({
    description: 'Referral code from the user who referred this user',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    required: false,
  })
  @IsOptional()
  @IsString()
  referralCode?: string;
}

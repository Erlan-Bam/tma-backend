import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class BindCardEmailDto {
  @ApiProperty({
    description: 'The ID of the card to bind email to',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  cardId: string;

  @ApiProperty({
    description: 'Email address to bind to the card',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

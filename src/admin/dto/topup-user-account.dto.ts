import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class TopupUserAccountDto {
  @ApiProperty({
    description: 'The child user ID in Zephyr',
    example: 'child_123456',
  })
  @IsString()
  @IsNotEmpty()
  childUserId: string;

  @ApiProperty({
    description: 'The amount to topup in USD',
    example: 100,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  amount: number;
}

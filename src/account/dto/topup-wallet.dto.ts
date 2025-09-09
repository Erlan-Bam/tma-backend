import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class TopupWalletDto {
  @ApiProperty({
    description: 'Amount to topup wallet',
    example: 123456789,
  })
  @IsInt()
  @Transform(({ value }) => parseInt(value))
  amount: number;
}

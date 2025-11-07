import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class TransferTrxToSubWalletDto {
  @ApiProperty({
    description: 'The amount of TRX to transfer to sub-wallet',
    example: 10,
    minimum: 0.1,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0.1)
  amount: number;
}

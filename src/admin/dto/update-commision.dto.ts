import { CommissionType } from '@prisma/client';
import { IsEnum, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCommissionDto {
  @ApiProperty({
    description: 'Type of commission',
    enum: CommissionType,
    example: CommissionType.PERCENTAGE,
  })
  @IsEnum(CommissionType)
  type: CommissionType;

  @ApiProperty({
    description: 'Commission rate (percentage or fixed amount)',
    example: 2.5,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  rate: number;
}

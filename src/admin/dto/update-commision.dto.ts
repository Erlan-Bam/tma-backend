import { CommissionType } from '@prisma/client';
import { IsEnum, IsNumber, Min } from 'class-validator';

export class UpdateCommissionDto {
  @IsEnum(CommissionType)
  type: CommissionType;

  @IsNumber()
  @Min(0)
  rate: number;
}

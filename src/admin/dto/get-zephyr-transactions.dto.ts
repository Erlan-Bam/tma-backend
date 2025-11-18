import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetZephyrTransactionsDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by transaction type',
    enum: ['DECREASE', 'INCREASE'],
    example: 'DECREASE',
  })
  @IsOptional()
  @IsEnum(['DECREASE', 'INCREASE'])
  type?: 'DECREASE' | 'INCREASE';

  @ApiPropertyOptional({
    description: 'Filter by transaction status',
    enum: ['SUCCESS', 'FAILED'],
    example: 'SUCCESS',
  })
  @IsOptional()
  @IsEnum(['SUCCESS', 'FAILED'])
  txnStatus?: 'SUCCESS' | 'FAILED';
}

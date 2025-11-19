import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetAccountTransactionsDto extends PaginationDto {
  childUserId: string;

  @ApiPropertyOptional({
    description: 'Filter by transaction status',
    enum: ['SUCCESS', 'FAILURE'],
    example: 'SUCCESS',
  })
  @IsOptional()
  @IsEnum(['SUCCESS', 'FAILURE'])
  txnStatus?: 'SUCCESS' | 'FAILURE';
}

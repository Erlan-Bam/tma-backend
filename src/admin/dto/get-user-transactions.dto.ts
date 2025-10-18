import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/shared/dto/pagination.dto';

export class GetUserTransactionsDto extends PaginationDto {
  @IsString()
  childUserId: string;

  @IsString()
  @IsOptional()
  cardId?: string;

  @IsOptional()
  @IsEnum(['SUCCESS', 'FAILURE'])
  txnStatus?: 'SUCCESS' | 'FAILURE';
}

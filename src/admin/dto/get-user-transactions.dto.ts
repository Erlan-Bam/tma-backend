import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetUserTransactionsDto extends PaginationDto {
  @ApiProperty({
    description: 'The child user ID in Zephyr',
    example: 'child_123456',
  })
  @IsString()
  childUserId: string;

  @ApiPropertyOptional({
    description: 'Filter by specific card ID',
    example: 'card_789012',
  })
  @IsString()
  @IsOptional()
  cardId?: string;

  @ApiPropertyOptional({
    description: 'Filter by transaction status',
    enum: ['SUCCESS', 'FAILURE'],
    example: 'SUCCESS',
  })
  @IsOptional()
  @IsEnum(['SUCCESS', 'FAILURE'])
  txnStatus?: 'SUCCESS' | 'FAILURE';
}

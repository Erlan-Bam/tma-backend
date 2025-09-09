import { IsInt, IsOptional } from 'class-validator';
import { PaginationDto } from 'src/shared/dto/pagination.dto';

export class GetTopupApplications extends PaginationDto {
  @IsOptional()
  @IsInt()
  status?: number;
}

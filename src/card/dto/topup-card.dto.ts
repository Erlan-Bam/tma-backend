import { Type } from 'class-transformer';
import { IsInt, IsString, Min } from 'class-validator';

export class TopupCardDto {
  @IsString()
  cardId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  topupAmount: number;
}

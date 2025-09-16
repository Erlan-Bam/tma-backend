import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCardDto {
  @ApiProperty({
    description: 'The unique identifier of the card bin',
    example: '64',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  cardBinId: string;

  @ApiProperty({
    description: 'The scenes where the card can be used ("100,101,102", etc)',
    example: '100,101,102',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  usedScenes: string;

  @Type(() => Number)
  @ApiProperty({
    description: 'The initial top-up amount for the card (minimum is 20)',
    example: 50,
    required: true,
    minimum: 20,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(20)
  topupAmount: number;
}

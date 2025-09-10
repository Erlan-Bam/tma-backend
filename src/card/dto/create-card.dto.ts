import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
}

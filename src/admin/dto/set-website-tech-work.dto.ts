import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetWebsiteTechWorkDto {
  @ApiProperty({
    description: 'Enable or disable website tech work mode',
    example: true,
  })
  @IsBoolean()
  isWebsiteTechWork: boolean;
}

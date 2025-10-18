import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetMaintenanceDto {
  @ApiProperty({
    description: 'Enable or disable maintenance mode',
    example: true,
  })
  @IsBoolean()
  isTechWork: boolean;
}

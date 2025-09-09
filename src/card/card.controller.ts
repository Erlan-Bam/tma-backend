import { Controller, Get, UseGuards } from '@nestjs/common';
import { CardService } from './card.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { User } from 'src/shared/decorator/user.decorator';

@Controller('card')
@ApiBearerAuth('JWT')
@UseGuards(AuthGuard('jwt'))
export class CardController {
  constructor(private cardService: CardService) {}

  @Get('')
  async getProductList(@User('id') userId: string) {
    return await this.cardService.getProductList(userId);
  }
}

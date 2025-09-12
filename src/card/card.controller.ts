import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CardService } from './card.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { User } from 'src/shared/decorator/user.decorator';
import { CreateCardDto } from './dto/create-card.dto';
import { UserGuard } from 'src/shared/guards/user.guard';

@Controller('card')
@ApiBearerAuth('JWT')
@UseGuards(AuthGuard('jwt'), UserGuard)
export class CardController {
  constructor(private cardService: CardService) {}

  @Post('application')
  async createCard(@Body() data: CreateCardDto, @User('id') userId: string) {
    return await this.cardService.createCard(userId, data);
  }

  @Get('list')
  async getProductList(@User('id') userId: string) {
    return await this.cardService.getProductList(userId);
  }
}

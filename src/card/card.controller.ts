import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CardService } from './card.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { User } from 'src/shared/decorator/user.decorator';
import { CreateCardDto } from './dto/create-card.dto';
import { UserGuard } from 'src/shared/guards/user.guard';
import { TopupCardDto } from './dto/topup-card.dto';

@Controller('card')
@ApiBearerAuth('JWT')
@UseGuards(AuthGuard('jwt'), UserGuard)
export class CardController {
  constructor(private cardService: CardService) {}

  @Post('application')
  async createCard(@Body() data: CreateCardDto, @User('id') userId: string) {
    return await this.cardService.createCard(userId, data);
  }

  @Post('topup/:id')
  async topupCard(@User('id') userId: string, @Body() data: TopupCardDto) {
    return await this.cardService.topupCard(userId, data);
  }

  @Get('list')
  async getProductList(@User('id') userId: string) {
    return await this.cardService.getProductList(userId);
  }

  @Get('active')
  async getActiveCards(@User('id') userId: string) {
    return await this.cardService.getActiveCards(userId);
  }

  @Get('info/:id')
  async getCardInfo(@Param('id') cardId: string, @User('id') userId: string) {
    return await this.cardService.getCardInfo(userId, cardId);
  }

  @Delete('destroy/:id')
  async destroyCard(@Param('id') cardId: string, @User('id') userId: string) {
    return await this.cardService.destroyCard(userId, cardId);
  }
}

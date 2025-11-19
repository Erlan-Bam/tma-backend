import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CardService } from './card.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { User } from 'src/shared/decorator/user.decorator';
import { CreateCardDto } from './dto/create-card.dto';
import { UserGuard } from 'src/shared/guards/user.guard';
import { TopupCardDto } from './dto/topup-card.dto';
import { BindCardEmailDto } from './dto/bind-card-email.dto';
import { GetUserTransactionsDto } from 'src/admin/dto/get-user-transactions.dto';

@ApiTags('Card')
@Controller('card')
@ApiBearerAuth('JWT')
@UseGuards(AuthGuard('jwt'), UserGuard)
export class CardController {
  constructor(private cardService: CardService) {}

  @Post('application')
  async createCard(@Body() data: CreateCardDto, @User('id') userId: string) {
    return await this.cardService.createCard(userId, data);
  }

  @Post('bind/email')
  async bindCardEmail(
    @User('id') userId: string,
    @Body() data: BindCardEmailDto,
  ) {
    return await this.cardService.bindCardEmail(
      userId,
      data.cardId,
      data.email,
    );
  }

  @Get('validate/email/:email')
  async validateCardEmail(
    @User('id') userId: string,
    @Param('email') email: string,
  ) {
    return await this.cardService.validateCardEmail(userId, email);
  }

  @Post('topup')
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

  @Get('cvv/:id')
  async getCardCvv(@Param('id') cardId: string, @User('id') userId: string) {
    return await this.cardService.getCardCvv(userId, cardId);
  }

  @Get('expiry/:id')
  async getCardExpiry(@Param('id') cardId: string, @User('id') userId: string) {
    return await this.cardService.getCardExpiry(userId, cardId);
  }

  @Get('number/:id')
  async getCardNumber(@Param('id') cardId: string, @User('id') userId: string) {
    return await this.cardService.getCardNumber(userId, cardId);
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

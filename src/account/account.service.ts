import { Injectable } from '@nestjs/common';
import { ZephyrService } from 'src/shared/services/zephyr.service';

@Injectable()
export class AccountService {
  constructor(private zephyr: ZephyrService) {}
}

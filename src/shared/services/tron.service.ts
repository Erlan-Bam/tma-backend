import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { TokenTransfer } from '../types/tron.types';

@Injectable()
export class TronService {
  private readonly logger = new Logger(TronService.name);
  private readonly tron: AxiosInstance;
  private readonly TRON_API_KEY: string;
  private readonly WALLET: string;

  constructor(private configService: ConfigService) {
    this.TRON_API_KEY = this.configService.getOrThrow('TRON_API_KEY');
    this.WALLET = this.configService.getOrThrow('TRON_WALLET_ADDRESS');

    this.tron = axios.create({
      baseURL: 'https://apilist.tronscanapi.com',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'TRON-PRO-API-KEY': this.TRON_API_KEY,
      },
    });
  }

  async getUSDTTransactions() {
    try {
      const response = await this.tron.get('/api/token_trc20/transfers', {
        params: {
          start: 0,
          limit: 100,
          relatedAddress: this.WALLET,
          contract_address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
          start_timestamp: `${Date.now() - 2 * 60 * 60 * 1000}`,
          end_timestamp: `${Date.now()}`,
          confirm: true,
        },
      });

      const transfers: TokenTransfer[] = response.data.token_transfers;

      return transfers.map((transfer: TokenTransfer) => ({
        amount: this.convertTronAmountToReadable(
          transfer.quant,
          transfer.tokenInfo.tokenDecimal,
        ),
        tronId: transfer.transaction_id,
        status: transfer.finalResult,
        fromAddress: transfer.from_address,
        toAddress: transfer.to_address,
        timestamp: new Date(transfer.block_ts),
        confirmed: transfer.confirmed,
        revert: transfer.revert,
      }));
    } catch (error) {
      this.logger.error('Error fetching Tron transactions:', error);
      throw error;
    }
  }

  private convertTronAmountToReadable(
    rawAmount: string,
    decimals: number = 6,
  ): string {
    const bigIntAmount = BigInt(rawAmount);
    const scale = BigInt(10) ** BigInt(decimals);

    const whole = bigIntAmount / scale;
    const fraction = bigIntAmount % scale;

    const fractionStr = fraction.toString().padStart(decimals, '0');

    const result = `${whole}.${fractionStr}`;

    return Number(result).toFixed(2);
  }

  isValidTronAddress(address: string): boolean {
    return /^T[A-Za-z1-9]{33}$/.test(address);
  }
}

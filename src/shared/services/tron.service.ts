import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { TokenTransfer, TronAccount } from '../../transaction/types/tron.types';
import { TronWeb } from 'tronweb';

@Injectable()
export class TronService {
  private readonly USDT_CONTRACT_ADDRESS = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
  private readonly logger = new Logger(TronService.name);
  private readonly tron: AxiosInstance;
  private readonly TRON_API_KEY: string;
  private readonly MAIN_WALLET: string;
  private tronweb: TronWeb;

  constructor(private configService: ConfigService) {
    this.TRON_API_KEY = this.configService.getOrThrow('TRON_API_KEY');
    this.MAIN_WALLET = this.configService.getOrThrow('TRON_WALLET_ADDRESS');

    this.tron = axios.create({
      baseURL: 'https://apilist.tronscanapi.com',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'TRON-PRO-API-KEY': this.TRON_API_KEY,
      },
    });
    this.tronweb = new TronWeb({
      fullHost: 'https://api.trongrid.io',
      headers: { 'TRON-PRO-API-KEY': this.TRON_API_KEY },
    });
  }

  async createAccount() {
    try {
      const account: TronAccount = await this.tronweb.createAccount();
      return account;
    } catch (error) {
      this.logger.error('Error creating Tron account:', error);
      throw error;
    }
  }

  async convertTronAmountToReadable(
    rawAmount: string,
    decimals: number = 6,
  ): Promise<string> {
    const bigIntAmount = BigInt(rawAmount);
    const scale = BigInt(10) ** BigInt(decimals);

    const whole = bigIntAmount / scale;
    const fraction = bigIntAmount % scale;

    const fractionStr = fraction.toString().padStart(decimals, '0');

    const result = `${whole}.${fractionStr}`;

    return Number(result).toFixed(2);
  }

  async getUSDTBalance(address: string) {
    try {
      const contract = await this.tronweb
        .contract()
        .at(this.USDT_CONTRACT_ADDRESS);
      const balance = await contract.balanceOf(address).call();
      return { balance: balance / 1000000, contract: contract };
    } catch (error) {
      this.logger.error(`Error getting USDT balance for ${address}:`, error);
      throw new Error(`Failed to get USDT balance: ${error.message}`);
    }
  }

  async transferUSDTToMainWallet(data: {
    address: string;
    privateKey: string;
  }) {
    try {
      const { address, privateKey } = data;

      this.tronweb.setPrivateKey(privateKey);

      const contract = await this.tronweb
        .contract()
        .at(this.USDT_CONTRACT_ADDRESS);
      const balance = await contract.balanceOf(address).call();

      if (balance <= 10000) {
        return {
          success: false,
          message: 'No USDT balance to transfer',
          balance: 0,
        };
      }

      const transaction = await contract
        .transfer(this.MAIN_WALLET, balance)
        .send({
          from: address,
          callValue: 0,
        });

      this.logger.log(
        `USDT transfer successful: ${transaction} - Amount: ${balance / 1000000} USDT`,
      );

      return {
        success: true,
        transaction: transaction,
        balance: balance / 1000000,
        fromAddress: address,
        toAddress: this.MAIN_WALLET,
        message: 'USDT transferred successfully to main wallet',
      };
    } catch (error) {
      this.logger.error('Error transferring USDT:', error);
      throw new Error(`Failed to transfer USDT: ${error.message}`);
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { readFile } from 'fs/promises';
import { join } from 'path';
import {
  constants,
  createPrivateKey,
  privateEncrypt,
  randomUUID,
} from 'crypto';
import { GetTopupApplications } from 'src/account/dto/get-topup-applications.dto';

@Injectable()
export class ZephyrService {
  private readonly logger = new Logger(ZephyrService.name);
  private readonly secretKey: string;
  private readonly licenseKey: string;
  private zephyr: AxiosInstance;

  constructor(private configService: ConfigService) {
    const baseURL = this.configService.getOrThrow('ZEPHYR_BASE_URL');

    this.secretKey = this.configService.getOrThrow('ZEPHYR_SECRET_KEY');
    this.licenseKey =
      this.configService.getOrThrow<string>('ZEPHYR_LICENSE_KEY');
    this.zephyr = axios.create({
      baseURL: baseURL,
      timeout: 5000,
      headers: {
        'X-LICENSE': this.licenseKey,
      },
    });
  }

  async getChildAccount(childUserId: string) {
    try {
      const response = await this.sendRequest({
        method: 'GET',
        endpoint: `/open-api/user/child/${childUserId}`,
      });

      const data = response.data;

      if (response.code === 200) {
        return {
          childUserId: data.userId,
          topupMin: data.topupMin,
          topupMax: data.topupMax,
          balance: data.balance,
        };
      } else {
        this.logger.debug(
          `Getting child account resulted in operation not successful, response: ${JSON.stringify(response.data)}`,
        );
        throw new Error('Operation not successful');
      }
    } catch (error) {
      this.logger.error('Error from zephyr when getting child account' + error);
      throw error;
    }
  }

  async getTopupTransactions(childUserId: string) {
    try {
      const response = await this.sendRequest({
        childUserId: childUserId,
        method: 'GET',
        endpoint: `/open-api/child/wallet/transactions`,
      });

      this.logger.debug(JSON.stringify(response));

      const data = response.rows;

      if (response.code === 200) {
        return {
          transactions: data.map((t: any) => ({
            ...t,
          })),
        };
      } else {
        this.logger.debug(
          `Getting child account resulted in operation not successful, response: ${JSON.stringify(response.data)}`,
        );
        throw new Error('Operation not successful');
      }
    } catch (error) {
      this.logger.error('Error from zephyr when getting child account' + error);
      throw error;
    }
  }

  async getTopupApplications(childUserId: string, query: GetTopupApplications) {
    try {
      const response = await this.sendRequest({
        childUserId: childUserId,
        method: 'GET',
        endpoint: `/open-api/child/wallet/topup/application`,
        params: query,
      });

      this.logger.debug(JSON.stringify(response));

      const data = response.rows;

      if (response.code === 200) {
        return {
          applications: data.map((a: any) => ({
            ...a,
          })),
        };
      } else {
        this.logger.debug(
          `Getting child account resulted in operation not successful, response: ${JSON.stringify(response.data)}`,
        );
        throw new Error('Operation not successful');
      }
    } catch (error) {
      this.logger.error('Error from zephyr when getting child account' + error);
      throw error;
    }
  }

  async topupWallet(childUserId: string, amount: number) {
    try {
      const response = await this.sendRequest({
        childUserId: childUserId,
        method: 'POST',
        endpoint: '/open-api/child/wallet/topup/application',
        body: {
          amount: amount,
        },
      });

      if (response.code === 200) {
        return {
          status: 'success',
          message: 'Successfully created topup application',
        };
      } else {
        return { status: 'error', message: response.msg };
      }
    } catch (error) {
      this.logger.error(
        'Error from zephyr when topup wallet application: ' + error,
      );
    }
  }

  async verification() {
    try {
      const token = await this.getToken();
      const response = await this.zephyr.get(
        '/open-api/authorization/verification',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      this.logger.debug(
        `Bearer starts: ${token.slice(0, 20)}... ends: ${token.slice(-5)}`,
      );

      this.logger.debug(
        `Zephyr verification response: ${JSON.stringify(response.data)}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Zephyr verification error: ${error}`);
      if (error.response) {
        this.logger.error(`Response status: ${error.response.status}`);
        this.logger.error(
          `Response data: ${JSON.stringify(error.response.data)}`,
        );
      }
    }
  }

  async createChildAccount(email: string, password: string) {
    try {
      const response = await this.sendRequest({
        method: 'POST',
        endpoint: '/open-api/register/childUser',
        body: { email: email, password: password },
      });

      const data = response.data;

      if (response.code === 200) {
        return {
          childUserId: data.userId,
        };
      } else {
        this.logger.debug(
          `Creating child account resulted in operation not successful, response: ${JSON.stringify(response.data)}`,
        );
        throw new Error('Operation not successful');
      }
    } catch (error) {
      this.logger.error(
        'Error from zephyr when creating child account: ' + error,
      );
      throw error;
    }
  }

  private async sendRequest({
    childUserId,
    method,
    endpoint,
    body,
    params,
    headers,
  }: {
    childUserId?: string;
    method: 'POST' | 'GET' | 'DELETE' | 'PUT';
    endpoint: string;
    body?: Record<string, any>;
    params?: Record<string, any>;
    headers?: Record<string, string>;
  }) {
    const [token, requestId] = await Promise.all([
      this.getToken(childUserId),
      this.getRequestId(),
    ]);

    this.logger.debug(`TOKEN: ${token}, REQUEST-ID: ${requestId}`);
    const config: AxiosRequestConfig = {
      headers: {
        ...headers,
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'X-REQUEST-ID': requestId,
      },
      params: params,
    };
    switch (method) {
      case 'GET': {
        const response = await this.zephyr.get(endpoint, config);
        return response.data;
      }
      case 'POST': {
        const response = await this.zephyr.post(endpoint, body, config);
        return response.data;
      }
      case 'PUT': {
        const response = await this.zephyr.put(endpoint, body, config);
        return response.data;
      }
      case 'DELETE': {
        const response = await this.zephyr.delete(endpoint, config);
        return response.data;
      }
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }

  private async getToken(childUserId?: string | undefined): Promise<string> {
    const payload: Record<string, any> = {
      secret: this.secretKey,
      timestamp: Date.now(),
    };
    if (childUserId) payload.childUserId = childUserId;

    this.logger.debug('Payload: ' + JSON.stringify(payload));

    const signStr = JSON.stringify(payload);
    const pem = await readFile(join(process.cwd(), 'zephyr.pem'), 'utf-8');
    const key = createPrivateKey({ key: pem });
    const encrypted = privateEncrypt(
      {
        key: key,
        padding: constants.RSA_PKCS1_PADDING,
      },
      Buffer.from(signStr, 'utf-8'),
    );

    return encrypted.toString('base64');
  }

  async getRequestId() {
    const randomId = randomUUID();
    return `${Date.now()}-${randomId}`;
  }
}

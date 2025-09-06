import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { readFile } from 'fs/promises';
import { join } from 'path';
import {
  constants,
  createPrivateKey,
  privateEncrypt,
  randomUUID,
} from 'crypto';

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

  async createAccount() {}

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
      const [token, requestId] = await Promise.all([
        this.getToken(),
        this.getRequestId(),
      ]);

      const response = await this.zephyr.post(
        '/open-api/register/childUser',
        { email: email, password: password },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-REQUEST-ID': requestId,
          },
        },
      );

      const data = response.data.data;

      if (response.data.code === 200) {
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
        'Error from zephyr when creating child account' + error,
      );
      throw error;
    }
  }

  private async getToken(childUserId?: string | undefined): Promise<string> {
    const now = Date.now();

    const payload: any = {};
    payload.secret = this.secretKey;
    if (childUserId) {
      payload.childUserId = childUserId;
    }
    payload.timestamp = now;

    const signStr = JSON.stringify(payload);
    const pem = await readFile(join(process.cwd(), 'zephyr.pem'), 'utf-8');
    const apiClientKey = createPrivateKey({ key: pem });

    const encrypted = privateEncrypt(
      {
        key: apiClientKey,
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

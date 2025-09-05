import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class ZephyrService implements OnModuleInit {
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

  async onModuleInit() {
    await this.verification();
  }

  async verification() {
    try {
      const token = await this.getToken();
      const response = await this.zephyr.get(
        '/open-api/authorization/verification',
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-LICENSE': this.licenseKey,
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
    }
  }

  private async getToken(childUserId?: string | undefined): Promise<string> {
    const now = Date.now();
    const payload = {
      secret: this.secretKey,
      timestamp: now,
    };
    if (childUserId) {
      Object.assign(payload, { childUserId: childUserId });
    }
    this.logger.debug(`Payload for signing: ${JSON.stringify(payload)}`);

    const signStr = JSON.stringify(payload);
    const filePath = path.join(process.cwd(), 'zephyr.pem');
    const privateKeyPem = fs.readFileSync(filePath);

    const encrypted = crypto.privateEncrypt(
      {
        key: privateKeyPem,
        padding: crypto.constants.RSA_PKCS1_PADDING,
      },
      Buffer.from(signStr, 'utf8'),
    );

    // 4) Token is plain Base64 of the ciphertext (NOT base64url)
    const token = encrypted.toString('base64');

    return token;
  }
}

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
      // Try without childUserId first
      const token = await this.getToken();
      const response = await this.zephyr.get(
        '/open-api/authorization/verification',
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-LICENSE': this.licenseKey,
            'Content-Type': 'application/json',
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

  private async getToken(childUserId?: string | undefined): Promise<string> {
    const now = Date.now();

    // Create payload object with same order as Java example
    const payload: any = {};
    payload.secret = this.secretKey;
    if (childUserId) {
      payload.childUserId = childUserId;
    }
    payload.timestamp = now;

    this.logger.debug(`Payload for signing: ${JSON.stringify(payload)}`);

    // Use compact JSON format without spaces (like in Java example)
    const signStr = JSON.stringify(payload);
    this.logger.debug(`String to encrypt: ${signStr}`);
    this.logger.debug(`String length: ${signStr.length}`);

    const filePath = path.join(process.cwd(), 'zephyr.pem');
    const privateKeyPem = fs.readFileSync(filePath, 'utf8');

    try {
      // Approach 1: Try OAEP padding instead of PKCS1
      this.logger.debug('Trying OAEP padding...');
      const encrypted = crypto.privateEncrypt(
        {
          key: privateKeyPem,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        Buffer.from(signStr, 'utf8'),
      );

      const token = encrypted.toString('base64');
      this.logger.debug(`OAEP encrypted token length: ${token.length}`);
      return token;
    } catch (error) {
      this.logger.error(`OAEP encryption error: ${error.message}`);

      // Approach 2: Try signature with RSA-SHA256
      try {
        this.logger.debug('Trying RSA-SHA256 signature...');
        const signature = crypto.sign('sha256', Buffer.from(signStr, 'utf8'), {
          key: privateKeyPem,
          padding: crypto.constants.RSA_PKCS1_PADDING,
        });

        const token = signature.toString('base64');
        this.logger.debug(`SHA256 signature token length: ${token.length}`);
        return token;
      } catch (signError) {
        this.logger.error(`Signature error: ${signError.message}`);

        // Approach 3: Try to split data and encrypt in chunks
        try {
          this.logger.debug('Trying chunked encryption...');
          const maxChunkSize = 190; // Safe size for RSA-2048 with PKCS1 padding
          const chunks = [];

          for (let i = 0; i < signStr.length; i += maxChunkSize) {
            const chunk = signStr.slice(i, i + maxChunkSize);
            const encryptedChunk = crypto.privateEncrypt(
              {
                key: privateKeyPem,
                padding: crypto.constants.RSA_PKCS1_PADDING,
              },
              Buffer.from(chunk, 'utf8'),
            );
            chunks.push(encryptedChunk);
          }

          const concatenated = Buffer.concat(chunks);
          const token = concatenated.toString('base64');
          this.logger.debug(`Chunked token length: ${token.length}`);
          return token;
        } catch (chunkError) {
          this.logger.error(`Chunked encryption error: ${chunkError.message}`);
          throw chunkError;
        }
      }
    }
  }
}

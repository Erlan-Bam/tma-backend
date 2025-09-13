import * as crypto from 'crypto';

export interface ParsedInitData {
  query_id?: string;
  user?: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
  };
  auth_date: number;
  hash: string;
  [key: string]: any;
}

export class TelegramAuthUtils {
  static validateInitData(
    initData: string,
    botToken: string,
  ): ParsedInitData | null {
    try {
      const urlParams = new URLSearchParams(initData);
      const data: any = {};

      for (const [key, value] of urlParams.entries()) {
        if (key === 'user') {
          try {
            data[key] = JSON.parse(value);
          } catch {
            data[key] = value;
          }
        } else if (key === 'auth_date') {
          data[key] = parseInt(value);
        } else {
          data[key] = value;
        }
      }

      const hash = data.hash;
      delete data.hash;

      const dataCheckString = Object.keys(data)
        .sort()
        .map(
          (key) =>
            `${key}=${typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key]}`,
        )
        .join('\n');

      const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(botToken)
        .digest();

      const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      if (calculatedHash !== hash) {
        return null;
      }

      const authDate = data.auth_date * 1000;
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000;

      if (now - authDate > maxAge) {
        return null;
      }

      return { ...data, hash } as ParsedInitData;
    } catch (error) {
      console.error('Error validating Telegram init data:', error);
      return null;
    }
  }

  static extractUser(parsedData: ParsedInitData) {
    return parsedData.user || null;
  }
}

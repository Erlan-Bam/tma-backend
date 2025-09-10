import * as crypto from 'crypto';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface ParsedInitData {
  user?: TelegramUser;
  auth_date?: number;
  hash?: string;
  query_id?: string;
  [key: string]: any;
}

export class TelegramAuthUtils {
  /**
   * Валидирует Telegram init data используя bot token
   */
  static validateInitData(initData: string, botToken: string): boolean {
    try {
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get('hash');

      if (!hash) {
        return false;
      }

      // Удаляем hash из параметров
      urlParams.delete('hash');

      // Сортируем параметры по ключу
      const sortedParams = Array.from(urlParams.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      // Создаем secret key из bot token
      const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(botToken)
        .digest();

      // Создаем hash для проверки
      const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(sortedParams)
        .digest('hex');

      return calculatedHash === hash;
    } catch (error) {
      console.error('Error validating Telegram init data:', error);
      return false;
    }
  }

  /**
   * Парсит init data и возвращает объект с данными
   */
  static parseInitData(initData: string): ParsedInitData {
    const urlParams = new URLSearchParams(initData);
    const result: ParsedInitData = {};

    for (const [key, value] of urlParams.entries()) {
      if (key === 'user') {
        try {
          result.user = JSON.parse(decodeURIComponent(value));
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      } else if (key === 'auth_date') {
        result.auth_date = parseInt(value, 10);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Проверяет, не истекли ли данные (по умолчанию 1 день)
   */
  static isDataFresh(authDate: number, maxAgeSeconds: number = 86400): boolean {
    const now = Math.floor(Date.now() / 1000);
    return now - authDate <= maxAgeSeconds;
  }
}

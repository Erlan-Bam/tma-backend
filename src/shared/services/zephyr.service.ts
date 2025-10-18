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
import {
  APPLICATION_STATUS,
  TopupApplications,
  USED_SCENES,
  ZephyrTopupApplications,
} from '../types/zephyr.types';
import { CreateCardDto } from 'src/card/dto/create-card.dto';
import { TopupCardDto } from 'src/card/dto/topup-card.dto';
import { GetUserTransactionsDto } from 'src/admin/dto/get-user-transactions.dto';

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
          `Getting child account resulted in operation not successful, response: ${response}`,
        );
        throw new Error('Operation not successful');
      }
    } catch (error) {
      this.logger.error('Error from zephyr when getting child account' + error);
      throw error;
    }
  }
  async getAccountBalance(childUserId: string) {
    try {
      const response = await this.sendRequest({
        method: 'GET',
        endpoint: `/open-api/child/wallet/balance`,
        childUserId: childUserId,
      });

      if (response.code === 200) {
        return {
          balance: response.data.balance,
        };
      } else {
        this.logger.debug(
          `Getting child account resulted in operation not successful, response: ${response}`,
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

      const data = response.rows;

      if (response.code === 200) {
        return {
          transactions: data.map((t: any) => ({
            ...t,
          })),
        };
      } else {
        this.logger.debug(
          `Getting topup transactions resulted in operation not successful for childUserId=${childUserId}, response: ${JSON.stringify(response)}`,
        );
        throw new Error('Operation not successful');
      }
    } catch (error) {
      this.logger.error('Error from zephyr when getting child account' + error);
      throw error;
    }
  }

  async getTopupApplications(
    childUserId: string,
    query?: GetTopupApplications,
  ): Promise<TopupApplications> {
    try {
      const response = await this.sendRequest({
        childUserId: childUserId,
        method: 'GET',
        endpoint: `/open-api/child/wallet/topup/application`,
        params: {
          pageNum: query.page,
          pageSize: query.limit,
          status: query.status,
        },
      });

      const data = response.rows;

      if (response.code === 200) {
        return {
          applications: data.map((a: any) => ({
            id: a.id,
            amount: a.applyAmount,
            currency: a.applyCurrency,
            status: APPLICATION_STATUS[a.status],
            reason:
              a.status !== 0
                ? a.status === 1
                  ? a.payVoucher
                  : a.remark
                : null,
            createdAt: a.createTime,
            payedAt: a.payTime,
          })),
        };
      } else {
        this.logger.debug(
          `Getting topup applications resulted in operation not successful for childUserId=${childUserId}, response: ${JSON.stringify(response)}`,
        );
        throw new Error('Operation not successful');
      }
    } catch (error) {
      this.logger.error('Error from zephyr when getting child account' + error);
      throw error;
    }
  }

  async getProductList(childUserId: string) {
    try {
      const response = await this.sendRequest({
        childUserId: childUserId,
        method: 'GET',
        endpoint: `/open-api/card/products`,
      });

      const data = response.data;

      if (response.code === 200) {
        return {
          cards: data.map((c: any) => ({
            organization: c.organization,
            cardArea: c.cardArea,
            cardBinId: c.cardBinId,
            currency: c.currency,
            price: c.price,
            minOpenAmount: c.minOpenAmount,
            maxOpenAmount: c.maxOpenAmount,
            usedScenes: c.usedScenes,
          })),
          usedSceneDescription: USED_SCENES,
        };
      } else {
        this.logger.debug(
          `Getting card product list resulted in operation not successful, response: ${JSON.stringify(response)}`,
        );
        throw new Error('Operation not successful');
      }
    } catch (error) {
      this.logger.error(
        'Error from zephyr when getting card product list' + error,
      );
      throw error;
    }
  }

  async getAllTopupApplications(
    status?: number,
    pageNum: number = 1,
    pageSize: number = 100,
  ) {
    try {
      const response = await this.sendRequest({
        method: 'GET',
        endpoint: '/open-api/wallet/child/topup/application',
        params: {
          status: status,
          pageNum: pageNum,
          pageSize: pageSize,
        },
      });

      if (response.code === 200) {
        const data: ZephyrTopupApplications[] = response.rows;
        return {
          applications: data,
        };
      }
    } catch (error) {
      this.logger.error(
        'Error from zephyr when getting all topup applications' + error,
      );
      throw error;
    }
  }

  async getCardCvv(childUserId: string, cardId: string) {
    try {
      const response = await this.sendRequest({
        method: 'GET',
        endpoint: `/open-api/child/card/look/cvv/${cardId}`,
        childUserId: childUserId,
      });

      if (response.code === 200) {
        return { cvv: response.data };
      } else {
        this.logger.debug(
          `Getting card cvv resulted in operation not successful, response: ${JSON.stringify(response)}`,
        );
        throw new Error('Operation not successful');
      }
    } catch (error) {
      this.logger.error('Error from zephyr when getting card cvv: ' + error);
      throw error;
    }
  }

  async getCardExpiry(childUserId: string, cardId: string) {
    try {
      const response = await this.sendRequest({
        method: 'GET',
        endpoint: `/open-api/child/card/look/expiry/${cardId}`,
        childUserId: childUserId,
      });

      if (response.code === 200) {
        return { expiry: response.data };
      } else {
        this.logger.debug(
          `Getting card expiry resulted in operation not successful, response: ${JSON.stringify(response)}`,
        );
        throw new Error('Operation not successful');
      }
    } catch (error) {
      this.logger.error('Error from zephyr when getting card expiry: ' + error);
      throw error;
    }
  }

  async getCardNumber(childUserId: string, cardId: string) {
    try {
      const response = await this.sendRequest({
        method: 'GET',
        endpoint: `/open-api/child/card/look/cardNo/${cardId}`,
        childUserId: childUserId,
      });

      if (response.code === 200) {
        return { number: response.data };
      } else {
        this.logger.debug(
          `Getting card number resulted in operation not successful, response: ${JSON.stringify(response)}`,
        );
        throw new Error('Operation not successful');
      }
    } catch (error) {
      this.logger.error('Error from zephyr when getting card number: ' + error);
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

  async topupCard(childUserId: string, body: TopupCardDto) {
    try {
      const response = await this.sendRequest({
        childUserId: childUserId,
        method: 'POST',
        endpoint: '/open-api/child/card/topup/application',
        body: body,
      });

      if (response.code === 200) {
        const data = response.data;
        return {
          status: 'success',
          message: 'Successfully created topup application for card',
          data: {
            id: data.id,
            amount: data.amount,
            cardId: data.cardId,
            cardNo: data.cardNo,
            createTime: data.createTime,
            status: data.status,
          },
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

  async createCard(childUserId: string, body: CreateCardDto) {
    try {
      const response = await this.sendRequest({
        childUserId: childUserId,
        method: 'POST',
        endpoint: '/open-api/child/card/order/application',
        body: body,
      });

      if (response.code === 200) {
        const data = response.data;
        return {
          status: 'success',
          message: 'Successfully created card order application',
          data: {
            id: data.id,
            status: data.status,
            cardCurrency: data.cardCurrency,
            cardFee: data.cardFee,
            cardQuantity: data.cardQuantity,
            totalAmount: data.totalAmount,
            rechargeAmount: data.rechargeAmount,
            createTime: data.createTime,
            finishTime: data.finishTime,
            usedScenes: data.usedScenes,
          },
        };
      } else {
        this.logger.debug(
          `Creating card order application resulted in operation not successful, response: ${JSON.stringify(response)}`,
        );
        return { status: 'error', message: response.msg };
      }
    } catch (error) {
      this.logger.error(
        'Error from zephyr when creating card order application: ' + error,
      );
      throw error;
    }
  }

  async getCardInfo(childUserId: string, cardId: string) {
    try {
      const response = await this.sendRequest({
        childUserId: childUserId,
        method: 'GET',
        endpoint: `/open-api/child/card/info/${cardId}`,
      });

      console.log(response);

      if (response.code === 200) {
        const data = response.data;
        return {
          id: data.id,
          cardNo: data.cardNo,
          label: data.label,
          balance: data.balance,
          currency: data.currency,
          status: data.status,
          activateDate: data.activateDate,
          minTopupAmount: data.minTopupAmount,
          maxTopupAmount: data.maxTopupAmount,
          usedScenes: data.usedScenes,
          organize: data.organize,
        };
      } else {
        return {
          status: 'error',
          msg: response.msg,
        };
      }
    } catch (error) {
      this.logger.error('Error from zephyr when getting card info: ' + error);
      throw error;
    }
  }

  async destroyCard(childUserId: string, cardId: string) {
    try {
      const response = await this.sendRequest({
        childUserId: childUserId,
        method: 'POST',
        endpoint: `/open-api/child/card/destroy/${cardId}`,
      });

      if (response.code === 200) {
        return {
          status: 'success',
          message: 'Card destroyed successfully',
        };
      } else {
        this.logger.debug(
          `Destroying card resulted in operation not successful, response: ${JSON.stringify(response)}`,
        );
        return { status: 'error', message: response.msg };
      }
    } catch (error) {
      this.logger.error('Error from zephyr when destroying card: ' + error);
      throw error;
    }
  }

  async rejectTopupApplication(applicationId: string) {
    try {
      const response = await this.sendRequest({
        method: 'PUT',
        endpoint: '/open-api/wallet/child/topup/application/audit',
        body: {
          id: applicationId,
          status: 2,
          remark: 'Expired',
        },
      });

      if (response.code === 200) {
        return {
          status: 'success',
          message: 'Successfully rejected topup application',
        };
      } else {
        return { status: 'error', message: response.msg };
      }
    } catch (error) {
      this.logger.error(
        'Error from zephyr when rejecting topup application: ' + error,
      );
      throw error;
    }
  }

  async acceptTopupApplication(applicationId: string) {
    try {
      const response = await this.sendRequest({
        method: 'PUT',
        endpoint: '/open-api/wallet/child/topup/application/audit',
        body: {
          id: applicationId,
          status: 1,
          remark: 'Approved',
        },
      });

      if (response.code === 200) {
        return {
          status: 'success',
          message: 'Successfully rejected topup application',
        };
      } else {
        return { status: 'error', message: response.msg };
      }
    } catch (error) {
      this.logger.error(
        'Error from zephyr when rejecting topup application: ' + error,
      );
      throw error;
    }
  }

  async getActiveCards(childUserId: string) {
    try {
      const response = await this.sendRequest({
        childUserId: childUserId,
        method: 'GET',
        endpoint: '/open-api/child/card',
      });

      if (response.code === 200) {
        return {
          cards: response.rows.map((card: any) => ({
            id: card.id,
            cardNo: card.cardNo,
            label: card.label,
            balance: card.balance,
            currency: card.currency,
            status: card.status,
            activateDate: card.activateDate,
            minTopupAmount: card.minTopupAmount,
            maxTopupAmount: card.maxTopupAmount,
            usedScenes: card.usedScenes,
            organize: card.organize,
          })),
          total: response.total,
        };
      } else {
        this.logger.debug(
          `Getting active cards resulted in operation not successful, response: ${JSON.stringify(response)}`,
        );
        throw new Error('Operation not successful');
      }
    } catch (error) {
      this.logger.error(
        'Error from zephyr when getting active cards: ' + error,
      );
      throw error;
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
          `Creating child account resulted in operation not successful, response: ${JSON.stringify(response)}`,
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
    const token = await this.getToken(childUserId);
    this.logger.debug('Token:' + token);

    const config: AxiosRequestConfig = {
      headers: {
        ...headers,
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      params: params,
    };
    if (method !== 'GET') {
      const requestId = await this.getRequestId();
      config.headers = {
        ...config.headers,
        'X-REQUEST-ID': requestId,
      };
    }
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

  async getAllCards() {
    try {
      const response = await this.sendRequest({
        method: 'GET',
        endpoint: '/open-api/card',
      });

      if (response.code === 200) {
        return {
          cards: response.rows.map((card: any) => ({
            id: card.id,
            orderId: card.orderId,
            userId: card.userId,
            userName: card.userName,
            cardNo: card.cardNo,
            currency: card.currency,
            balance: card.balance,
            activateDate: card.activateDate,
            status: card.status,
            usedScenes: card.usedScenes,
            cardArea: card.cardArea,
            label: card.label,
          })),
          total: response.total,
        };
      } else {
        this.logger.debug(
          `Getting all cards resulted in operation not successful, response: ${JSON.stringify(response)}`,
        );
        throw new Error('Operation not successful');
      }
    } catch (error) {
      this.logger.error('Error from zephyr when getting all cards: ' + error);
      throw error;
    }
  }

  async disableUser(userId: string) {
    try {
      const response = await this.sendRequest({
        method: 'POST',
        endpoint: `/open-api/user/child/disable/${userId}`,
      });

      if (response.code === 200) {
        return {
          status: 'success',
          message: 'User disabled successfully',
        };
      } else {
        this.logger.debug(
          `Disabling user resulted in operation not successful, response: ${JSON.stringify(response)}`,
        );
        return { status: 'error', message: response.msg };
      }
    } catch (error) {
      this.logger.error('Error from zephyr when disabling user: ' + error);
      throw error;
    }
  }

  async enableUser(userId: string) {
    try {
      const response = await this.sendRequest({
        method: 'POST',
        endpoint: `/open-api/user/child/enable/${userId}`,
      });

      if (response.code === 200) {
        return {
          status: 'success',
          message: 'User enabled successfully',
        };
      } else {
        this.logger.debug(
          `Enabling user resulted in operation not successful, response: ${JSON.stringify(response)}`,
        );
        return { status: 'error', message: response.msg };
      }
    } catch (error) {
      this.logger.error('Error from zephyr when enabling user: ' + error);
      throw error;
    }
  }

  async getUserTransactions(query: GetUserTransactionsDto) {
    try {
      const response = await this.sendRequest({
        childUserId: query.childUserId,
        method: 'GET',
        endpoint: `/open-api/child/card/transaction`,
        params: {
          cardId: query.cardId,
          pageNum: query.page,
          pageSize: query.limit,
          txnStatus: query.txnStatus,
        },
      });
      if (response.code === 200) {
        return {
          transactions: response.rows,
        };
      } else {
        this.logger.debug(
          `Getting user transactions resulted in operation not successful for childUserId=${query.childUserId}, response: ${JSON.stringify(response)}`,
        );
        throw new Error('Operation not successful');
      }
    } catch (error) {
      this.logger.error(
        'Error from zephyr when getting user transactions' + error,
      );
      throw error;
    }
  }
}

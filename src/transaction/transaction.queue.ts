import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Logger, HttpException, HttpStatus } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { PrismaService } from 'src/shared/services/prisma.service';
import { TransactionTronService } from './services/tron.service';
import { MonitorBatchJob, SuccessfulTransactionJob } from './types/queue.types';
import {
  Account,
  TransactionStatus,
  CommissionName,
  Commission,
  CommissionType,
} from '@prisma/client';
import { TronAddress } from './types/tron.types';
import { ZephyrService } from 'src/shared/services/zephyr.service';
import { BotService } from 'src/shared/services/bot.service';
import { AccountService } from 'src/account/account.service';
import { timestamp } from 'rxjs';

@Processor('transaction-queue')
export class TransactionQueue {
  private isWaiting = false;
  private commission: Commission | null = null;
  private readonly logger = new Logger(TransactionQueue.name);

  constructor(
    private prisma: PrismaService,
    private tron: TransactionTronService,
    private zephyr: ZephyrService,
    private bot: BotService,
    private account: AccountService,
    @InjectQueue('transaction-queue') private queue: Queue,
  ) {
    this.loadTransactionFee();
  }

  async loadTransactionFee() {
    try {
      const commission = await this.prisma.commission.findUnique({
        where: { name: CommissionName.TRANSACTION_FEE },
      });

      if (commission) {
        this.commission = commission;
        this.logger.log(
          `✅ Transaction fee loaded: ${this.commission.rate} ${commission.type === 'FIXED' ? 'USDT' : '%'}`,
        );
      } else {
        this.logger.warn(
          '⚠️ Transaction fee not found in database, using default value of 1',
        );
        this.commission = await this.prisma.commission.create({
          data: {
            name: CommissionName.TRANSACTION_FEE,
            type: CommissionType.PERCENTAGE,
            rate: 1.2,
          },
        });
      }
    } catch (error) {
      this.logger.error('❌ Error loading card fee:', error);
      this.commission = null;
    }
  }

  private async getTransactionFee(): Promise<Commission | null> {
    if (this.commission === null) {
      await this.loadTransactionFee();
    }
    return this.commission;
  }

  private isRateLimitError(error: any): boolean {
    return (
      error?.response?.status === 429 ||
      error?.status === 429 ||
      error?.code === 'ERR_TOO_MANY_REQUESTS'
    );
  }

  @Process({ name: 'monitor-wallet-batch', concurrency: 1 }) // Sequential processing for 5 req/s
  async handleWalletBatch(job: Job<MonitorBatchJob>) {
    const { batchIndex, batchSize, offset, time } = job.data;

    try {
      if (this.isWaiting) {
        this.logger.warn(
          `⏸️ Batch ${batchIndex} skipped - waiting for rate limit cooldown`,
        );
        return { processed: 0, errors: 0, skipped: true };
      }

      this.logger.log(
        `🔄 Processing batch ${batchIndex} (${offset}-${offset + batchSize})`,
      );

      const accounts = await this.prisma.account.findMany({
        where: {
          checkedAt: {
            gte: new Date(time),
          },
        },
        select: {
          id: true,
          telegramId: true,
          address: true,
          childUserId: true,
          referredBy: true,
        },
        skip: offset,
        take: batchSize,
      });

      if (accounts.length === 0) {
        this.logger.debug(`No accounts in batch ${batchIndex}`);
        return;
      }

      const results = await this.processAccounts(accounts);

      this.logger.log(
        `✅ Batch ${batchIndex} completed: ${results.processed} processed, ${results.errors} errors`,
      );

      return results;
    } catch (error) {
      this.logger.error(`❌ Error processing batch ${batchIndex}:`, error);
      throw error;
    }
  }

  @Process('successful-transaction')
  async handleSuccessfulTransaction(job: Job<SuccessfulTransactionJob>) {
    const { account, amount, tronId, originalAmount } = job.data;
    const accountId = account.id;

    try {
      this.logger.log(
        `💰 Processing successful transaction for account ${accountId}: ${amount} USDT`,
      );

      const result = await this.prisma.$transaction(
        async (tx) => {
          this.logger.debug(`📤 Calling Zephyr topup for account ${accountId}`);
          const topup = await this.zephyr.topupWallet(
            account.childUserId,
            amount,
          );

          if (topup.status !== 'success') {
            throw new Error(`Zephyr topup failed: ${topup.message}`);
          }

          this.logger.debug(
            `📥 Fetching topup applications from Zephyr for account ${accountId}`,
          );

          const { applications } = await this.zephyr.getTopupApplications(
            account.childUserId,
            {
              page: 1,
              limit: 5,
              status: 0,
            },
          );

          if (!applications || applications.length === 0) {
            throw new Error('No topup applications found after wallet topup');
          }

          this.logger.debug(
            `Found ${applications.length} topup applications for account ${accountId}`,
          );

          for (const app of applications) {
            if (app.amount === amount) {
              this.logger.debug(
                `Matched application ${app.id} with amount ${app.amount}`,
              );
              try {
                const transaction = await tx.transaction.upsert({
                  where: { tronId: tronId },
                  update: {},
                  create: {
                    accountId: accountId,
                    tronId: tronId,
                    status: TransactionStatus.SUCCESS,
                    zephyrId: app.id,
                    amount: originalAmount,
                  },
                });
                await this.zephyr.acceptTopupApplication(app.id);
                return {
                  status: 'success',
                  message: `Topup application ${app.id} matched successfully`,
                  transation: transaction,
                  applications: applications,
                };
              } catch (error) {
                this.logger.error(
                  `Error creating transaction or accepting application ${app.id}:`,
                  error?.message || error,
                );
                throw error;
              }
            }
          }

          this.logger.warn(
            `No matching topup application found for account ${accountId}`,
          );
          return {
            status: 'error',
            message: `No matching topup application found for account ${accountId}`,
            transation: null,
            applications: applications,
          };
        },
        {
          timeout: 15000,
          isolationLevel: 'Serializable',
        },
      );

      this.logger.log(
        `✅ Successfully processed transaction for account ${accountId} - Created: ${JSON.stringify(result.transation)}, Applications: ${JSON.stringify(result.applications)}`,
      );

      //REFERRAL LOGIC HERE
      try {
        if (account.referredBy) {
          this.logger.log(
            `User has referrer ${account.referredBy}, processing referral bonus.`,
          );
          await this.account.addReferralBonus({
            accountId: account.referredBy,
            amount: amount,
          });
        }
      } catch (error) {
        this.logger.error(
          `❌ Error processing referral in successful transaction for accountId: ${accountId} and referrerId: ${account.referredBy}`,
          error?.message || error,
        );
      }

      try {
        await this.bot.sendSuccessfulTransactionMessage(
          account.telegramId,
          amount,
          tronId,
        );
      } catch (error) {
        this.logger.error(
          `❌ Error sending message to user ${account.telegramId} for transaction ${tronId}`,
          error?.message || error,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(
        `❌ Error processing successful transaction for account ${accountId}:`,
        error,
      );

      const isFinalAttempt = job.attemptsMade >= job.opts.attempts;
      if (isFinalAttempt) {
        try {
          await this.bot.sendUnsuccessfulTransactionMessage(
            account.telegramId,
            amount,
            tronId,
            'Transaction processing failed',
          );
        } catch (notificationError) {
          this.logger.error(
            `❌ Error sending failure notification to user ${account.telegramId} for transaction ${tronId}`,
            notificationError?.message || notificationError,
          );
        }
      } else {
        this.logger.warn(
          `⚠️ Transaction failed (attempt ${job.attemptsMade}/${job.opts.attempts}) - will retry`,
        );
      }

      throw error;
    }
  }

  private async processAccounts(accounts: Partial<Account>[]) {
    let processed = 0;
    let errors = 0;

    this.logger.log(
      `🚀 Processing ${accounts.length} accounts simultaneously in this batch`,
    );

    await Promise.allSettled(
      accounts.map(async (account) => {
        try {
          await this.processAccountTransactions(account);
          processed++;
        } catch (error) {
          if (this.isRateLimitError(error)) {
            this.logger.warn(
              `⏸️ Rate limit (429) detected for account ${account.id} - stopping all requests`,
            );
            this.isWaiting = true;

            setTimeout(() => {
              this.isWaiting = false;
              this.logger.log(
                '▶️ Rate limit cooldown complete - resuming requests',
              );
            }, 60000);
          }
          this.logger.error(
            `Error processing account ${account.id}:`,
            error?.message || error,
          );
          errors++;
          throw error;
        }
      }),
    );

    this.logger.log(
      `✅ Batch processing complete: ${processed} successful, ${errors} errors`,
    );

    return { processed, errors };
  }

  private processFee(amount: number, commission: Commission): number {
    if (commission.type === 'FIXED') {
      return amount - commission.rate;
    } else {
      return amount * (1 - commission.rate / 100);
    }
  }

  private reverseProcessFee(netAmount: number, commission: Commission): number {
    if (commission.type === 'FIXED') {
      return netAmount + commission.rate;
    } else {
      return netAmount / (1 - commission.rate / 100);
    }
  }

  private async processAccountTransactions(account: Partial<Account>) {
    if (!account.address) {
      this.logger.warn(`Account ${account.id} has no address, skipping.`);
      return;
    }

    const address = account.address as TronAddress;

    try {
      const transactions = await this.tron.getWalletUSDTTransactions(
        address.base58,
      );

      for (const tx of transactions) {
        try {
          const exist = await this.prisma.transaction.findUnique({
            where: { tronId: tx.tronId },
          });

          if (!exist) {
            this.logger.log(
              `💰 New transaction found: ${tx.tronId} - ${tx.amount} USDT for account ${account.id}`,
            );

            const commission = await this.getTransactionFee();
            if (commission.type === 'FIXED' && tx.amount <= commission.rate) {
              this.logger.warn(
                `Transaction is less than or equal to card fee (${commission.rate} USDT), skipping: ${tx.tronId} - ${tx.amount} USDT for account ${account.id}`,
              );
              continue;
            }

            const netAmount = this.processFee(tx.amount, commission);

            await this.queue.add(
              'successful-transaction',
              {
                account: {
                  id: account.id,
                  telegramId: Number(account.telegramId),
                  childUserId: account.childUserId,
                  referredBy: account.referredBy,
                },
                amount: netAmount,
                tronId: tx.tronId,
                originalAmount: tx.amount,
                timestamp: new Date(),
              },
              {
                attempts: 5,
                backoff: {
                  type: 'exponential',
                  delay: 3000,
                },
                removeOnComplete: 100,
                removeOnFail: 100,
                delay: 2000,
                jobId: `tx-${tx.tronId}`,
              },
            );
          }
        } catch (error) {
          this.logger.error(
            `Error checking/queuing transaction ${tx.tronId}:`,
            error,
          );
        }
      }
    } catch (error) {
      if (this.isRateLimitError(error)) {
        this.logger.warn(
          `⏸️ Rate limit (429) detected when fetching transactions for account ${account.id} - stopping all requests`,
        );
        this.isWaiting = true;

        setTimeout(() => {
          this.isWaiting = false;
          this.logger.log(
            '▶️ Rate limit cooldown complete - resuming requests',
          );
        }, 60000);
      }
      throw error;
    }
  }
}

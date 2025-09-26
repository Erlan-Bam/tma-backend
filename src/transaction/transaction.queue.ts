import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Logger, HttpException, HttpStatus } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { PrismaService } from 'src/shared/services/prisma.service';
import { TronService } from './services/tron.service';
import { MonitorBatchJob, SuccessfulTransactionJob } from './types/queue.types';
import { Account, TransactionStatus } from '@prisma/client';
import { TronAddress } from './types/tron.types';
import { ZephyrService } from 'src/shared/services/zephyr.service';

@Processor('transaction-queue')
export class TransactionQueue {
  private readonly logger = new Logger(TransactionQueue.name);

  constructor(
    private prisma: PrismaService,
    private tron: TronService,
    private zephyr: ZephyrService,
    @InjectQueue('transaction-queue') private queue: Queue,
  ) {}

  @Process('monitor-wallet-batch')
  async handleWalletBatch(job: Job<MonitorBatchJob>) {
    const { batchIndex, batchSize, offset } = job.data;

    try {
      this.logger.log(
        `🔄 Processing batch ${batchIndex} (${offset}-${offset + batchSize})`,
      );

      const accounts = await this.prisma.account.findMany({
        where: {
          address: { not: null },
          childUserId: { not: null },
        },
        select: {
          id: true,
          address: true,
          childUserId: true,
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
    const { account, amount, tronId, timestamp } = job.data;
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
              const transaction = await tx.transaction.create({
                data: {
                  accountId: accountId,
                  tronId: tronId,
                  status: TransactionStatus.SUCCESS,
                  zephyrId: app.id,
                },
              });
              return {
                status: 'success',
                message: `Topup application ${app.id} matched successfully`,
                transation: transaction,
                applications: applications,
              };
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

      return result;
    } catch (error) {
      this.logger.error(
        `❌ Error processing successful transaction for account ${accountId}:`,
        error?.message || error,
      );

      // Re-throw the error to trigger job retry
      throw new HttpException(
        `Failed to process transaction for account ${accountId}: ${error?.message || 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async processAccounts(accounts: Partial<Account>[]) {
    let processed = 0;
    let errors = 0;

    const CHUNK_SIZE = 5;
    const RATE_LIMIT_DELAY = 2000;

    for (let i = 0; i < accounts.length; i += CHUNK_SIZE) {
      const chunk = accounts.slice(i, i + CHUNK_SIZE);

      await Promise.allSettled(
        chunk.map(async (account) => {
          try {
            await this.processAccountTransactions(account);
            processed++;
          } catch (error) {
            this.logger.error(`Error processing account ${account.id}:`, error);
            errors++;
          }
        }),
      );

      if (i + CHUNK_SIZE < accounts.length) {
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
      }
    }

    return { processed, errors };
  }

  private async processAccountTransactions(account: Partial<Account>) {
    if (!account.address) {
      this.logger.warn(`Account ${account.id} has no address, skipping.`);
      return;
    }

    const address = account.address as TronAddress;

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

          await this.queue.add(
            'successful-transaction',
            {
              account: account,
              amount: tx.amount,
              tronId: tx.tronId,
              timestamp: tx.timestamp,
            },
            {
              attempts: 5,
              backoff: {
                type: 'exponential',
                delay: 2000,
              },
              removeOnComplete: 100,
              removeOnFail: 50,
              delay: 1000,
            },
          );
        }
      } catch (error) {
        this.logger.error(
          `Error checking/queuing transaction ${tx.tronId}:`,
          error?.message,
        );
        // Continue with other transactions even if one fails
      }
    }
  }
}

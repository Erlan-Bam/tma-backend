export const APPLICATION_STATUS = {
  0: 'Pending',
  1: 'Approved',
  2: 'Rejected',
} as const;

export type ApplicationStatus =
  (typeof APPLICATION_STATUS)[keyof typeof APPLICATION_STATUS];

export const CARD_STATUS = {
  0: 'Active',
  1: 'Frozen',
  2: 'Closing',
  3: 'Closed',
  4: 'Blocked',
  5: 'Producing',
} as const;

export type CardStatus = (typeof CARD_STATUS)[keyof typeof CARD_STATUS];

export const TXN_TYPES = {
  CREATE_CARD: '💳 Card Application',
  TOPUP: '💰 Card Recharge',
  AUTH: '🔒 Transaction Authorization',
  REVERSAL: '↩️ Authorization Reversal',
  RETURN: '💸 Transaction Refund',
  REFUND: '💸 Transaction Refund',
  CARD_CANCEL: '🚫 Card Closure',
  CHBACK: '🔄 Card Refund',
  CLEARING: '✅ Trade Clearing',
  SETTLED: '✅ Trade Clearing',
  CARD_DESTROY: '🗑️ Card Closure',
  RETURNC: '💱 Exchange Rate Difference Refund',
  AUTHC: '💱 Exchange Rate Difference Deduction',
  AUTHG: '💼 Transaction Fee',
  AUTHD: '💼 Transaction Settlement Fee',
  AUTHE: '💼 Micro-transaction Fee',
  AUTHF: '💼 Cross-region/currency Transaction Fee',
  AUTHH: '↩️ Refund Reversal',
  UNKNOWN: '❓ Unknown Transaction',
} as const;

export type TxnType = keyof typeof TXN_TYPES;

export const USED_SCENES = {
  100: 'Supports ad account funding & payments for cross-border platforms (Facebook, Google, TikTok, etc.)',
  101: 'Cross-border e-commerce payments, flight bookings, hotel reservations, and more',
  102: 'Membership renewals, API services, cloud platforms, and automated billing',
  104: 'Apple Pay Dedicated Cards',
};

export interface TopupApplications {
  applications: {
    id: string;
    amount: number;
    currency: string;
    status: ApplicationStatus;
    reason: string | null;
    createdAt: string;
    payedAt: string;
  }[];
}
export interface ZephyrTopupApplications {
  applyAmount: number;
  applyCurrency: string;
  balance: number;
  createTime: string;
  id: string;
  payTime: string;
  payVoucher: string;
  remark: string;
  status: 0 | 1 | 2;
  userId: string;
  userName: string;
}

export interface ZephyrWebhook {
  userId: string;
  cardId: string;
  billNo: string;
  currency: string;
  amount: number;
  fee: number;
  orderCurrency: string;
  orderAmount: number;
  merchant: string;
  result: string;
  transactionTime: string;
  txnStatus: 'SUCCESS' | 'FAILED';
  txnType: TxnType;
  type: 'DECREASE' | 'INCREASE';
  relatedId: string;
  cardStatus?: 0 | 1 | 2 | 3 | 4 | 5;
}

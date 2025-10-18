export const APPLICATION_STATUS = {
  0: 'Pending',
  1: 'Approved',
  2: 'Rejected',
} as const;

export type ApplicationStatus =
  (typeof APPLICATION_STATUS)[keyof typeof APPLICATION_STATUS];

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

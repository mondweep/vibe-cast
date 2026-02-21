import type Decimal from 'decimal.js';
import type { AccountingMethod } from './tax-lot.js';

/**
 * Capital gain term for tax classification
 */
export enum CapitalGainTerm {
  SHORT = 'SHORT',  // < 1 year holding period
  LONG = 'LONG',    // >= 1 year holding period
}

/**
 * Disposal model representing sale or trade records
 */
export interface Disposal {
  /** Unique identifier (UUID v4) */
  id: string;

  /** Source tax lot ID */
  lotId: string;

  /** Sale transaction ID */
  transactionId: string;

  /** Sale timestamp */
  disposalDate: Date;

  /** Quantity sold from lot */
  quantity: Decimal;

  /** Sale proceeds received */
  proceeds: Decimal;

  /** Cost basis of sold quantity */
  costBasis: Decimal;

  /** Realized gain or loss (proceeds - costBasis) */
  gain: Decimal;

  /** Short-term or long-term capital gain */
  term: CapitalGainTerm;

  /** Tax year for reporting */
  taxYear: number;

  /** Accounting method used for this disposal */
  method: AccountingMethod;
}

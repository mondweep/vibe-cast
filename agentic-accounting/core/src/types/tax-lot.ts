import type Decimal from 'decimal.js';
import type { Disposal } from './disposal.js';

/**
 * Accounting methods for tax lot tracking
 */
export enum AccountingMethod {
  FIFO = 'FIFO',                 // First-In, First-Out
  LIFO = 'LIFO',                 // Last-In, First-Out
  HIFO = 'HIFO',                 // Highest-In, First-Out
  SPECIFIC_ID = 'SPECIFIC_ID',   // Manual selection
  AVERAGE_COST = 'AVERAGE_COST', // Average cost basis
}

/**
 * Status of a tax lot
 */
export enum LotStatus {
  OPEN = 'OPEN',       // Fully available
  PARTIAL = 'PARTIAL', // Partially sold
  CLOSED = 'CLOSED',   // Fully disposed
}

/**
 * Tax lot model for tracking individual acquisitions
 */
export interface TaxLot {
  /** Unique identifier (UUID v4) */
  id: string;

  /** Source transaction ID */
  transactionId: string;

  /** Asset symbol/ticker */
  asset: string;

  /** Acquisition timestamp */
  acquiredDate: Date;

  /** Remaining quantity available */
  quantity: Decimal;

  /** Original quantity at acquisition */
  originalQuantity: Decimal;

  /** Total cost basis for remaining quantity */
  costBasis: Decimal;

  /** Cost per unit */
  unitCostBasis: Decimal;

  /** Currency */
  currency: string;

  /** Origin exchange/wallet */
  source: string;

  /** Accounting method used */
  method: AccountingMethod;

  /** History of disposals from this lot */
  disposals: Disposal[];

  /** Current status */
  status: LotStatus;
}

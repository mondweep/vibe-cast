import type Decimal from 'decimal.js';

/**
 * Transaction types representing different trading activities
 */
export enum TransactionType {
  BUY = 'BUY',           // Purchase/acquisition
  SELL = 'SELL',         // Sale/disposal
  TRADE = 'TRADE',       // Exchange one asset for another
  INCOME = 'INCOME',     // Interest, dividends, rewards
  EXPENSE = 'EXPENSE',   // Fees, payments
  TRANSFER = 'TRANSFER', // Non-taxable movement
}

/**
 * Core transaction model representing all financial activities
 */
export interface Transaction {
  /** Unique identifier (UUID v4) */
  id: string;

  /** Transaction timestamp (ISO 8601) */
  timestamp: Date;

  /** Type of transaction */
  type: TransactionType;

  /** Asset symbol/ticker (e.g., BTC, ETH, TSLA) */
  asset: string;

  /** Quantity of asset (precise decimal, not float) */
  quantity: Decimal;

  /** Price per unit in base currency */
  price: Decimal;

  /** Transaction fees */
  fees: Decimal;

  /** Base currency (USD, EUR, etc.) */
  currency: string;

  /** Exchange/wallet/platform source */
  source: string;

  /** External transaction ID from source */
  sourceId: string;

  /** Whether this transaction is a taxable event */
  taxable: boolean;

  /** Flexible additional metadata */
  metadata: Record<string, unknown>;

  /** Optional vector embedding for semantic search */
  embedding?: Float32Array;
}

/**
 * Income types for tax reporting
 */
export enum IncomeType {
  INTEREST = 'INTEREST',
  DIVIDEND = 'DIVIDEND',
  STAKING = 'STAKING',
  MINING = 'MINING',
  AIRDROP = 'AIRDROP',
}

/**
 * Income record for tax reporting
 */
export interface Income {
  /** Unique identifier */
  id: string;

  /** Type of income */
  type: IncomeType;

  /** Amount received */
  amount: Decimal;

  /** Asset symbol */
  asset: string;

  /** Date received */
  date: Date;

  /** Source of income */
  source: string;
}

import type Decimal from 'decimal.js';
import type { Disposal } from './disposal.js';
import type { Income } from './transaction.js';

/**
 * Tax form types
 */
export enum TaxFormType {
  SCHEDULE_D = 'SCHEDULE_D',
  FORM_8949 = 'FORM_8949',
  FORM_1099_B = 'FORM_1099_B',
  CUSTOM = 'CUSTOM',
}

/**
 * Generated tax form
 */
export interface TaxForm {
  /** Form type */
  type: TaxFormType;

  /** Form data */
  data: Record<string, unknown>;

  /** Generated PDF/document path */
  documentPath?: string;

  /** Generation timestamp */
  generatedAt: Date;
}

/**
 * Tax summary model for annual reporting
 */
export interface TaxSummary {
  /** Tax year */
  taxYear: number;

  /** Total short-term capital gains */
  shortTermGains: Decimal;

  /** Total long-term capital gains */
  longTermGains: Decimal;

  /** Total realized gains (short + long) */
  totalGains: Decimal;

  /** Total realized losses */
  totalLosses: Decimal;

  /** Net gains/losses after offsetting */
  netGains: Decimal;

  /** Losses harvested for tax purposes */
  harvestedLosses: Decimal;

  /** Disallowed losses due to wash sales */
  washSaleAdjustments: Decimal;

  /** All disposals for the year */
  disposals: Disposal[];

  /** Income records (interest, dividends, etc.) */
  income: Income[];

  /** Generated tax forms */
  forms: TaxForm[];
}

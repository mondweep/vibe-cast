import type Decimal from 'decimal.js';
import type { TaxLot } from './tax-lot.js';

/**
 * Position model representing current holdings for an asset
 */
export interface Position {
  /** Asset symbol/ticker */
  asset: string;

  /** Total quantity held across all lots */
  totalQuantity: Decimal;

  /** Sum of all lot cost bases */
  totalCostBasis: Decimal;

  /** Average cost per unit across all lots */
  averageCostBasis: Decimal;

  /** Current market price */
  currentPrice: Decimal;

  /** Current market value (totalQuantity * currentPrice) */
  marketValue: Decimal;

  /** Unrealized gain/loss (marketValue - totalCostBasis) */
  unrealizedGain: Decimal;

  /** Percentage unrealized gain/loss */
  unrealizedGainPercent: number;

  /** Individual tax lots comprising this position */
  lots: TaxLot[];

  /** Last price update timestamp */
  lastUpdated: Date;
}

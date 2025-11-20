import Decimal from 'decimal.js';

/**
 * Configure Decimal.js for financial calculations
 * - High precision (78 digits)
 * - Rounding mode: ROUND_HALF_UP (standard financial rounding)
 */
Decimal.set({
  precision: 78,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -9e15,
  toExpPos: 9e15,
  minE: -9e15,
  maxE: 9e15,
});

/**
 * Utility functions for precise decimal arithmetic
 */
export class DecimalMath {
  /**
   * Create a new Decimal from a number, string, or Decimal
   */
  static from(value: number | string | Decimal): Decimal {
    return new Decimal(value);
  }

  /**
   * Add two decimals
   */
  static add(a: Decimal, b: Decimal): Decimal {
    return a.plus(b);
  }

  /**
   * Subtract b from a
   */
  static subtract(a: Decimal, b: Decimal): Decimal {
    return a.minus(b);
  }

  /**
   * Multiply two decimals
   */
  static multiply(a: Decimal, b: Decimal): Decimal {
    return a.times(b);
  }

  /**
   * Divide a by b
   */
  static divide(a: Decimal, b: Decimal): Decimal {
    if (b.isZero()) {
      throw new Error('Division by zero');
    }
    return a.dividedBy(b);
  }

  /**
   * Calculate percentage: (value / total) * 100
   */
  static percentage(value: Decimal, total: Decimal): Decimal {
    if (total.isZero()) {
      return new Decimal(0);
    }
    return value.dividedBy(total).times(100);
  }

  /**
   * Round to specified decimal places
   */
  static round(value: Decimal, decimalPlaces: number = 2): Decimal {
    return value.toDecimalPlaces(decimalPlaces);
  }

  /**
   * Check if value is zero
   */
  static isZero(value: Decimal): boolean {
    return value.isZero();
  }

  /**
   * Check if value is positive
   */
  static isPositive(value: Decimal): boolean {
    return value.greaterThan(0);
  }

  /**
   * Check if value is negative
   */
  static isNegative(value: Decimal): boolean {
    return value.lessThan(0);
  }

  /**
   * Get the absolute value
   */
  static abs(value: Decimal): Decimal {
    return value.abs();
  }

  /**
   * Get the minimum of two values
   */
  static min(a: Decimal, b: Decimal): Decimal {
    return Decimal.min(a, b);
  }

  /**
   * Get the maximum of two values
   */
  static max(a: Decimal, b: Decimal): Decimal {
    return Decimal.max(a, b);
  }

  /**
   * Sum an array of decimals
   */
  static sum(values: Decimal[]): Decimal {
    return values.reduce((acc, val) => acc.plus(val), new Decimal(0));
  }

  /**
   * Calculate average of decimals
   */
  static average(values: Decimal[]): Decimal {
    if (values.length === 0) {
      return new Decimal(0);
    }
    const sum = this.sum(values);
    return sum.dividedBy(values.length);
  }

  /**
   * Convert to fixed-point string representation
   */
  static toFixed(value: Decimal, decimalPlaces: number = 2): string {
    return value.toFixed(decimalPlaces);
  }

  /**
   * Convert to number (use with caution - may lose precision)
   */
  static toNumber(value: Decimal): number {
    return value.toNumber();
  }

  /**
   * Check if two decimals are equal
   */
  static equals(a: Decimal, b: Decimal): boolean {
    return a.equals(b);
  }

  /**
   * Compare two decimals: returns -1 if a < b, 0 if a === b, 1 if a > b
   */
  static compare(a: Decimal, b: Decimal): number {
    return a.comparedTo(b);
  }

  /**
   * Calculate weighted average
   * @param values Array of [value, weight] tuples
   */
  static weightedAverage(values: Array<[Decimal, Decimal]>): Decimal {
    if (values.length === 0) {
      return new Decimal(0);
    }

    let sumWeightedValues = new Decimal(0);
    let sumWeights = new Decimal(0);

    for (const [value, weight] of values) {
      sumWeightedValues = sumWeightedValues.plus(value.times(weight));
      sumWeights = sumWeights.plus(weight);
    }

    if (sumWeights.isZero()) {
      return new Decimal(0);
    }

    return sumWeightedValues.dividedBy(sumWeights);
  }
}

// Export Decimal class for direct use
export { Decimal };

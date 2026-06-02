/**
 * ReputationScore Value Object
 * Immutable representation of reputation on 0-1000 scale
 * Domain: Community
 */

export class ReputationScore {
  private readonly value: number;

  private constructor(value: number) {
    this.value = Math.round(value);
  }

  static create(value: number): ReputationScore {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      throw new Error('Reputation score must be an integer');
    }
    if (value < 0 || value > 1000) {
      throw new Error('Reputation score must be between 0 and 1000');
    }
    return new ReputationScore(value);
  }

  static zero(): ReputationScore {
    return new ReputationScore(0);
  }

  static maximum(): ReputationScore {
    return new ReputationScore(1000);
  }

  /**
   * Add points to reputation (immutable - returns new instance)
   */
  add(points: number): ReputationScore {
    const newValue = Math.min(this.value + points, 1000);
    return ReputationScore.create(newValue);
  }

  /**
   * Subtract points from reputation (immutable - returns new instance)
   */
  subtract(points: number): ReputationScore {
    const newValue = Math.max(this.value - points, 0);
    return ReputationScore.create(newValue);
  }

  /**
   * Get numeric value
   */
  getValue(): number {
    return this.value;
  }

  /**
   * Check if at maximum capacity
   */
  isMaxed(): boolean {
    return this.value === 1000;
  }

  /**
   * Check if zero
   */
  isZero(): boolean {
    return this.value === 0;
  }

  /**
   * Get reputation tier (for badges, leaderboards)
   * Tier 1: 0-100, Tier 2: 101-300, Tier 3: 301-600, Tier 4: 601-1000
   */
  getTier(): 1 | 2 | 3 | 4 {
    if (this.value <= 100) return 1;
    if (this.value <= 300) return 2;
    if (this.value <= 600) return 3;
    return 4;
  }

  /**
   * Get percentage of maximum
   */
  getPercentage(): number {
    return (this.value / 1000) * 100;
  }

  equals(other: ReputationScore): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return `ReputationScore(${this.value})`;
  }
}

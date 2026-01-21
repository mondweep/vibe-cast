import { v4 as uuid } from 'uuid';
import { InvariantViolationError, EntityCreationError } from '@/shared/errors/DomainError';
import { InterestThreshold } from '@/domains/config/UserPreferences';

/**
 * Fact: value object representing a historical fact
 */
export class Fact {
  constructor(
    readonly text: string,
    readonly sourceLocation: string
  ) {
    if (!text || text.trim().length === 0) {
      throw new InvariantViolationError('Fact text cannot be empty');
    }
    if (text.length > 1000) {
      throw new InvariantViolationError('Fact text must be under 1000 characters');
    }
    if (!sourceLocation || sourceLocation.trim().length === 0) {
      throw new InvariantViolationError('Source location cannot be empty');
    }
  }
}

/**
 * QualityAssessment: value object for fact quality evaluation
 */
export class QualityAssessment {
  constructor(
    readonly confidence: number, // 0-100
    readonly isGeneric: boolean,
    readonly hasSpecificity: boolean, // Contains dates, numbers, named people
    readonly reasoning: string
  ) {
    if (confidence < 0 || confidence > 100) {
      throw new InvariantViolationError('Confidence must be between 0 and 100');
    }
    if (!reasoning || reasoning.trim().length === 0) {
      throw new InvariantViolationError('Reasoning cannot be empty');
    }
  }

  /**
   * Check if fact meets threshold
   */
  meetsThreshold(threshold: InterestThreshold): boolean {
    return this.confidence >= threshold && !this.isGeneric;
  }

  /**
   * Get quality rating
   */
  getQualityRating(): 'excellent' | 'good' | 'fair' | 'poor' {
    if (this.confidence >= 80 && this.hasSpecificity && !this.isGeneric) {
      return 'excellent';
    }
    if (this.confidence >= 60 && this.hasSpecificity) {
      return 'good';
    }
    if (this.confidence >= 40) {
      return 'fair';
    }
    return 'poor';
  }
}

/**
 * FactDelivery: aggregate root representing a fact delivery event
 */
export class FactDelivery {
  constructor(
    readonly id: string,
    readonly fact: Fact,
    readonly assessment: QualityAssessment,
    readonly location: string,
    readonly deliveredAt: Date,
    readonly userFeedback?: 'liked' | 'disliked' | 'neutral'
  ) {
    if (!id || id.trim().length === 0) {
      throw new InvariantViolationError('FactDelivery id cannot be empty');
    }
  }

  /**
   * Create a new fact delivery
   */
  static create(
    fact: Fact,
    assessment: QualityAssessment,
    location: string,
    deliveredAt: Date = new Date()
  ): FactDelivery {
    try {
      const id = uuid();
      return new FactDelivery(id, fact, assessment, location, deliveredAt);
    } catch (error) {
      throw new EntityCreationError('Failed to create FactDelivery', { error });
    }
  }

  /**
   * Record user feedback
   */
  recordFeedback(feedback: 'liked' | 'disliked' | 'neutral'): FactDelivery {
    return new FactDelivery(
      this.id,
      this.fact,
      this.assessment,
      this.location,
      this.deliveredAt,
      feedback
    );
  }

  /**
   * Get time since delivery (milliseconds)
   */
  ageMs(): number {
    return new Date().getTime() - this.deliveredAt.getTime();
  }

  /**
   * Create hash for deduplication
   */
  getHash(): string {
    const sha256 = require('js-sha256').sha256;
    return sha256(`${this.fact.text}|${this.location}`);
  }
}

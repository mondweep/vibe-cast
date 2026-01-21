import { Fact, QualityAssessment } from './Fact';
import { InterestThreshold } from '@/domains/config/UserPreferences';

/**
 * QualityFilterService: Domain service for assessing fact quality
 */
export class QualityFilterService {
  // Generic phrases that reduce confidence
  private readonly genericPhrases = [
    'was home to',
    'is located in',
    'was founded',
    'is known for',
    'became famous',
    'has a rich history',
    'is an important',
    'played a role',
    'was significant',
    'was established',
    'is famous for',
    'once was',
    'is said to',
    'is believed to',
  ];

  // Specificity markers
  private readonly specificityMarkers = {
    dates: /\b(1[0-9]{3}|20[0-2][0-9]|BC|AD|BCE|CE|January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i,
    numbers: /\b\d{1,4}\b/,
    namedPeople: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/,
    places: /\b(city|town|village|region|state|country|county|district|province|kingdom|empire)\b/i,
  };

  /**
   * Assess the quality of a fact
   */
  assessQuality(fact: Fact): QualityAssessment {
    const isGeneric = this.isGenericFact(fact.text);
    const hasSpecificity = this.detectSpecificity(fact.text);
    const confidence = this.calculateConfidence(fact.text, isGeneric, hasSpecificity);
    const reasoning = this.generateReasoning(isGeneric, hasSpecificity, confidence);

    return new QualityAssessment(confidence, isGeneric, hasSpecificity, reasoning);
  }

  /**
   * Detect if fact is generic (using heuristics)
   */
  private isGenericFact(text: string): boolean {
    const lowerText = text.toLowerCase();

    // Check for generic phrases
    const hasGenericPhrase = this.genericPhrases.some((phrase) =>
      lowerText.includes(phrase)
    );

    // Check if text is too short and vague
    const isTooShort = text.length < 50;

    // Check for vague qualifiers
    const hasVagueQualifiers = /\b(may|might|could|probably|apparently|possibly|reportedly)\b/i.test(
      text
    );

    return hasGenericPhrase || (isTooShort && !this.detectSpecificity(text)) || hasVagueQualifiers;
  }

  /**
   * Detect specificity markers in fact
   */
  private detectSpecificity(text: string): boolean {
    const markerScores = {
      dates: (text.match(this.specificityMarkers.dates) || []).length,
      numbers: (text.match(this.specificityMarkers.numbers) || []).length,
      namedPeople: (text.match(this.specificityMarkers.namedPeople) || []).length,
      places: (text.match(this.specificityMarkers.places) || []).length,
    };

    // Has at least one specific marker
    return Object.values(markerScores).some((count) => count > 0);
  }

  /**
   * Calculate confidence score (0-100)
   */
  private calculateConfidence(
    text: string,
    isGeneric: boolean,
    hasSpecificity: boolean
  ): number {
    let score = 50; // Base score

    // Adjust for generic phrases
    if (isGeneric) {
      score -= 30;
    }

    // Boost for specificity
    if (hasSpecificity) {
      score += 20;
    }

    // Adjust based on length (longer = more detailed)
    if (text.length > 150) {
      score += 10;
    } else if (text.length < 80) {
      score -= 10;
    }

    // Check for quoted sources (increases confidence)
    if (/["'][^"']+["']/.test(text)) {
      score += 15;
    }

    // Check for attribution (person/source mentioned)
    if (/\b(according to|said|reported|claimed|wrote|stated|noted)\b/i.test(text)) {
      score += 10;
    }

    // Clamp to 0-100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    isGeneric: boolean,
    hasSpecificity: boolean,
    confidence: number
  ): string {
    const reasons: string[] = [];

    if (isGeneric) {
      reasons.push('Contains generic phrases');
    }

    if (hasSpecificity) {
      reasons.push('Includes specific details (dates, names, numbers)');
    } else {
      reasons.push('Lacks specific details');
    }

    if (confidence >= 70) {
      reasons.push('High confidence fact');
    } else if (confidence >= 50) {
      reasons.push('Moderate confidence');
    } else {
      reasons.push('Low confidence - may be too vague');
    }

    return reasons.join('; ');
  }

  /**
   * Filter facts by interest threshold
   */
  filterByThreshold(facts: QualityAssessment[], threshold: InterestThreshold): QualityAssessment[] {
    return facts.filter((f) => f.meetsThreshold(threshold));
  }
}

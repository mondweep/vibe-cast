// Historical Discovery Context - Domain Models
// Fact generation, quality filtering, and research

import type { PlaceNames } from '../location';

/**
 * Seasonal context for fact generation
 */
export interface SeasonalContext {
	readonly season: 'spring' | 'summer' | 'autumn' | 'winter';
	readonly weather?: string;
	readonly timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
}

/**
 * Quality assessment for filtering generic facts
 */
export interface QualityAssessment {
	readonly score: number; // 0-100
	readonly isGeneric: boolean;
	readonly containsSpecifics: boolean;
	readonly containsExclusions: boolean;
	readonly verdict: 'acceptable' | 'generic' | 'invalid';
}

/**
 * Fact metadata
 */
export interface FactMetadata {
	readonly sourceLocation: PlaceNames;
	readonly seasonalContext: SeasonalContext;
	readonly generatedAt: number;
	readonly researchDurationMs: number;
}

/**
 * Historical fact entity
 */
export interface HistoricalFact {
	readonly id: string;
	readonly text: string; // 2-3 sentences, ready for speech
	readonly metadata: FactMetadata;
	readonly quality: QualityAssessment;
}

// Domain events
export interface FactGeneratedEvent {
	readonly type: 'FactGenerated';
	readonly payload: {
		readonly fact: HistoricalFact;
	};
	readonly timestamp: number;
}

export interface NoSuitableFactEvent {
	readonly type: 'NoSuitableFact';
	readonly payload: {
		readonly location: PlaceNames;
		readonly reason: string;
	};
	readonly timestamp: number;
}

export type DiscoveryEvent = FactGeneratedEvent | NoSuitableFactEvent;

// Quality filtering patterns
export const EXCLUSION_PATTERNS = [
	/known for/i,
	/famous for/i,
	/renowned for/i,
	/picturesque/i,
	/charming/i,
	/quaint/i,
	/scenic/i,
	/traditional/i,
	/historic town/i,
	/beautiful/i
];

export const INCLUSION_PATTERNS = [
	/in \d{4}/i, // Specific years
	/\d+ (meters?|feet|miles?|km|kilometres?)/i, // Measurements
	/[A-Z][a-z]+ [A-Z][a-z]+/, // Named individuals (basic)
	/first|only|largest|smallest|oldest|youngest/i // Records
];

/**
 * Assess the quality of a fact text
 */
export function assessFactQuality(text: string): QualityAssessment {
	const containsExclusions = EXCLUSION_PATTERNS.some((pattern) => pattern.test(text));
	const containsSpecifics = INCLUSION_PATTERNS.some((pattern) => pattern.test(text));

	let score = 50; // Base score

	if (containsExclusions) {
		score -= 30;
	}

	if (containsSpecifics) {
		score += 30;
	}

	// Length check (should be 50-500 chars)
	if (text.length < 50) {
		score -= 20;
	} else if (text.length > 500) {
		score -= 10;
	}

	const isGeneric = containsExclusions && !containsSpecifics;
	const verdict: QualityAssessment['verdict'] =
		score >= 50 && !isGeneric ? 'acceptable' : isGeneric ? 'generic' : 'invalid';

	return {
		score: Math.max(0, Math.min(100, score)),
		isGeneric,
		containsSpecifics,
		containsExclusions,
		verdict
	};
}

/**
 * Get current seasonal context
 */
export function getCurrentSeasonalContext(): SeasonalContext {
	const now = new Date();
	const month = now.getMonth();
	const hour = now.getHours();

	// Determine season (Northern Hemisphere)
	let season: SeasonalContext['season'];
	if (month >= 2 && month <= 4) {
		season = 'spring';
	} else if (month >= 5 && month <= 7) {
		season = 'summer';
	} else if (month >= 8 && month <= 10) {
		season = 'autumn';
	} else {
		season = 'winter';
	}

	// Determine time of day
	let timeOfDay: SeasonalContext['timeOfDay'];
	if (hour >= 5 && hour < 12) {
		timeOfDay = 'morning';
	} else if (hour >= 12 && hour < 17) {
		timeOfDay = 'afternoon';
	} else if (hour >= 17 && hour < 21) {
		timeOfDay = 'evening';
	} else {
		timeOfDay = 'night';
	}

	return { season, timeOfDay };
}

// Discovery Context Unit Tests

import { describe, it, expect } from 'vitest';
import { assessFactQuality, getCurrentSeasonalContext } from '@domain/discovery';

describe('Discovery Context', () => {
	describe('assessFactQuality', () => {
		it('should accept specific historical facts', () => {
			const fact =
				'In 1847, Isambard Kingdom Brunel built the first iron-hulled ship here, measuring 98 meters in length.';
			const assessment = assessFactQuality(fact);

			expect(assessment.verdict).toBe('acceptable');
			expect(assessment.containsSpecifics).toBe(true);
			expect(assessment.isGeneric).toBe(false);
		});

		it('should reject generic tourism descriptions', () => {
			const fact =
				'This charming village is known for its picturesque scenery and traditional cottages.';
			const assessment = assessFactQuality(fact);

			expect(assessment.verdict).toBe('generic');
			expect(assessment.containsExclusions).toBe(true);
			expect(assessment.isGeneric).toBe(true);
		});

		it('should detect specific dates', () => {
			const fact = 'In 1923, the first radio broadcast was made from this location.';
			const assessment = assessFactQuality(fact);

			expect(assessment.containsSpecifics).toBe(true);
		});

		it('should detect measurements', () => {
			const facts = [
				'The tower stands 120 meters tall.',
				'The bridge spans 500 feet across the river.',
				'Located 5 miles from the city center.',
				'The tunnel is 2 kilometres long.'
			];

			for (const fact of facts) {
				const assessment = assessFactQuality(fact);
				expect(assessment.containsSpecifics).toBe(true);
			}
		});

		it('should detect named individuals', () => {
			const fact = 'Engineer John Smith designed this aqueduct in 1850.';
			const assessment = assessFactQuality(fact);

			expect(assessment.containsSpecifics).toBe(true);
		});

		it('should detect superlatives and records', () => {
			const facts = [
				'This was the first powered flight in Europe.',
				'The only surviving example of its kind.',
				'The largest clock face in England.',
				'The smallest church in Wales.'
			];

			for (const fact of facts) {
				const assessment = assessFactQuality(fact);
				expect(assessment.containsSpecifics).toBe(true);
			}
		});

		it('should penalize very short facts', () => {
			const shortFact = 'Old building here.';
			const assessment = assessFactQuality(shortFact);

			expect(assessment.score).toBeLessThan(50);
		});

		it('should handle mixed quality facts', () => {
			// Has both specific date AND generic phrase
			const mixedFact =
				'In 1845, this charming village became famous for its annual fair.';
			const assessment = assessFactQuality(mixedFact);

			expect(assessment.containsSpecifics).toBe(true);
			expect(assessment.containsExclusions).toBe(true);
			// Should not be marked as generic because it has specifics
			expect(assessment.isGeneric).toBe(false);
		});

		it('should score high for excellent facts', () => {
			const excellentFact =
				'On March 15, 1890, engineer Isambard Smith completed the first underwater tunnel here, measuring exactly 2.3 kilometres in length.';
			const assessment = assessFactQuality(excellentFact);

			expect(assessment.score).toBeGreaterThan(70);
			expect(assessment.verdict).toBe('acceptable');
		});

		it('should score low for poor facts', () => {
			const poorFact = 'Nice.';
			const assessment = assessFactQuality(poorFact);

			expect(assessment.score).toBeLessThan(40);
		});
	});

	describe('getCurrentSeasonalContext', () => {
		it('should return valid seasonal context', () => {
			const context = getCurrentSeasonalContext();

			expect(['spring', 'summer', 'autumn', 'winter']).toContain(context.season);
			expect(['morning', 'afternoon', 'evening', 'night']).toContain(context.timeOfDay);
		});

		it('should not include weather by default', () => {
			const context = getCurrentSeasonalContext();

			expect(context.weather).toBeUndefined();
		});
	});
});

// FactGenerationService Unit Tests - TDD Suite
// Tests for historical fact generation with quality filtering

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FactGenerationService } from '@services/FactGenerationService';
import type { PlaceNames } from '@domain/location';
import type { SeasonalContext, HistoricalFact } from '@domain/discovery';

// Mock the GeminiTextAdapter
vi.mock('@adapters/GeminiTextAdapter', () => ({
	GeminiTextAdapter: vi.fn().mockImplementation(() => ({
		generateContent: vi.fn()
	}))
}));

import { GeminiTextAdapter } from '@adapters/GeminiTextAdapter';

describe('FactGenerationService', () => {
	let service: FactGenerationService;
	let mockAdapter: { generateContent: ReturnType<typeof vi.fn> };

	const testPlaces: PlaceNames = {
		village: 'Little Snoring',
		town: 'Fakenham',
		county: 'Norfolk',
		state: 'England',
		country: 'United Kingdom',
		displayName: 'Little Snoring, Norfolk, UK'
	};

	const testContext: SeasonalContext = {
		season: 'summer',
		timeOfDay: 'afternoon'
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockAdapter = {
			generateContent: vi.fn()
		};
		(GeminiTextAdapter as unknown as ReturnType<typeof vi.fn>).mockImplementation(
			() => mockAdapter
		);
		service = new FactGenerationService('test-api-key');
	});

	describe('generateFact', () => {
		it('should generate a valid historical fact', async () => {
			mockAdapter.generateContent.mockResolvedValueOnce(
				'In 1834, engineer George Stephenson built the first railway station in this village, measuring 45 meters in length.'
			);

			const fact = await service.generateFact(testPlaces, testContext);

			expect(fact).not.toBeNull();
			expect(fact?.text).toContain('1834');
			expect(fact?.quality.verdict).toBe('acceptable');
		});

		it('should include location in fact metadata', async () => {
			mockAdapter.generateContent.mockResolvedValueOnce(
				'In 1923, the first telephone exchange was established here.'
			);

			const fact = await service.generateFact(testPlaces, testContext);

			expect(fact?.metadata.sourceLocation).toEqual(testPlaces);
		});

		it('should include seasonal context in metadata', async () => {
			mockAdapter.generateContent.mockResolvedValueOnce(
				'In 1890, the village had the largest summer fair in Norfolk.'
			);

			const fact = await service.generateFact(testPlaces, testContext);

			expect(fact?.metadata.seasonalContext).toEqual(testContext);
		});

		it('should pass correct system prompt to adapter', async () => {
			mockAdapter.generateContent.mockResolvedValueOnce(
				'In 1845, engineer John Smith built a bridge here.'
			);

			await service.generateFact(testPlaces, testContext);

			expect(mockAdapter.generateContent).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					systemInstruction: expect.stringContaining('PRIORITIZE')
				})
			);
		});

		it('should include places in prompt', async () => {
			mockAdapter.generateContent.mockResolvedValueOnce(
				'In 1900, a historic event occurred here.'
			);

			await service.generateFact(testPlaces, testContext);

			const promptArg = mockAdapter.generateContent.mock.calls[0][0];
			expect(promptArg).toContain('Little Snoring');
			expect(promptArg).toContain('Norfolk');
		});

		it('should include seasonal context in prompt', async () => {
			mockAdapter.generateContent.mockResolvedValueOnce('Historic fact here.');

			await service.generateFact(testPlaces, testContext);

			const prompt = mockAdapter.generateContent.mock.calls[0][0];
			expect(prompt.toLowerCase()).toContain('summer');
			expect(prompt.toLowerCase()).toContain('afternoon');
		});

		it('should enable Google Search for grounding', async () => {
			mockAdapter.generateContent.mockResolvedValueOnce(
				'In 1834, something happened.'
			);

			await service.generateFact(testPlaces, testContext);

			expect(mockAdapter.generateContent).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ enableSearch: true })
			);
		});

		it('should return null when adapter returns null', async () => {
			mockAdapter.generateContent.mockResolvedValueOnce(null);

			const fact = await service.generateFact(testPlaces, testContext);

			expect(fact).toBeNull();
		});

		it('should return null for generic facts', async () => {
			mockAdapter.generateContent.mockResolvedValueOnce(
				'This charming village is known for its picturesque scenery and traditional cottages.'
			);

			const fact = await service.generateFact(testPlaces, testContext);

			// Should be filtered out due to generic content
			expect(fact).toBeNull();
		});

		it('should reject facts with "known for" phrase', async () => {
			mockAdapter.generateContent.mockResolvedValueOnce(
				'The village is known for its ancient church.'
			);

			const fact = await service.generateFact(testPlaces, testContext);

			expect(fact).toBeNull();
		});

		it('should reject facts with "famous for" phrase', async () => {
			mockAdapter.generateContent.mockResolvedValueOnce(
				'This area is famous for its natural beauty.'
			);

			const fact = await service.generateFact(testPlaces, testContext);

			expect(fact).toBeNull();
		});

		it('should accept facts with specific dates', async () => {
			mockAdapter.generateContent.mockResolvedValueOnce(
				'On March 15, 1923, the first radio broadcast was made from this location.'
			);

			const fact = await service.generateFact(testPlaces, testContext);

			expect(fact).not.toBeNull();
			expect(fact?.quality.containsSpecifics).toBe(true);
		});

		it('should accept facts with measurements', async () => {
			mockAdapter.generateContent.mockResolvedValueOnce(
				'The tower stands exactly 98 meters tall, making it the largest structure in the county when built.'
			);

			const fact = await service.generateFact(testPlaces, testContext);

			expect(fact).not.toBeNull();
			expect(fact?.quality.containsSpecifics).toBe(true);
		});

		it('should accept facts with named individuals', async () => {
			mockAdapter.generateContent.mockResolvedValueOnce(
				'Engineer Isambard Brunel designed this bridge in 1850, which was the first of its kind.'
			);

			const fact = await service.generateFact(testPlaces, testContext);

			expect(fact).not.toBeNull();
		});

		it('should generate unique IDs for each fact', async () => {
			mockAdapter.generateContent
				.mockResolvedValueOnce('In 1900, a first event occurred.')
				.mockResolvedValueOnce('In 1901, a second event occurred.');

			const fact1 = await service.generateFact(testPlaces, testContext);
			const fact2 = await service.generateFact(testPlaces, testContext);

			expect(fact1?.id).not.toBe(fact2?.id);
		});

		it('should track research duration', async () => {
			mockAdapter.generateContent.mockResolvedValueOnce('In 1850, history happened.');

			const fact = await service.generateFact(testPlaces, testContext);

			expect(fact?.metadata.researchDurationMs).toBeGreaterThanOrEqual(0);
		});
	});

	describe('buildPrompt', () => {
		it('should handle missing optional place fields', async () => {
			const minimalPlaces: PlaceNames = {
				country: 'United Kingdom',
				displayName: 'UK'
			};

			mockAdapter.generateContent.mockResolvedValueOnce(
				'In 1066, a major historical event occurred.'
			);

			const fact = await service.generateFact(minimalPlaces, testContext);

			expect(mockAdapter.generateContent).toHaveBeenCalled();
			expect(fact).not.toBeNull();
		});

		it('should use display name when specific places missing', async () => {
			const displayOnlyPlaces: PlaceNames = {
				displayName: 'Somewhere in the world'
			};

			mockAdapter.generateContent.mockResolvedValueOnce('Historic fact in 1800.');

			await service.generateFact(displayOnlyPlaces, testContext);

			const prompt = mockAdapter.generateContent.mock.calls[0][0];
			expect(prompt).toContain('Somewhere in the world');
		});
	});

	describe('fact history', () => {
		it('should prevent duplicate facts within session', async () => {
			const factText = 'In 1834, engineer George Stephenson built something here.';
			mockAdapter.generateContent.mockResolvedValue(factText);

			const fact1 = await service.generateFact(testPlaces, testContext);
			const fact2 = await service.generateFact(testPlaces, testContext);

			// Second call should return null (duplicate)
			expect(fact1).not.toBeNull();
			expect(fact2).toBeNull();
		});

		it('should allow clearing fact history', async () => {
			const factText = 'In 1834, something historical happened.';
			mockAdapter.generateContent.mockResolvedValue(factText);

			await service.generateFact(testPlaces, testContext);
			service.clearHistory();

			const fact2 = await service.generateFact(testPlaces, testContext);

			// Should not be null after clearing history
			expect(fact2).not.toBeNull();
		});
	});
});

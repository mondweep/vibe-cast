// FactGenerationService - Historical fact generation with quality filtering
// Generates serendipitous facts using Gemini API with web search grounding

import { GeminiTextAdapter } from '@adapters/GeminiTextAdapter';
import type { PlaceNames } from '@domain/location';
import {
	assessFactQuality,
	type SeasonalContext,
	type HistoricalFact,
	type FactMetadata
} from '@domain/discovery';

const SYSTEM_PROMPT = `You are a local history researcher finding fascinating, unusual facts.

CRITICAL: You MUST complete your response with full sentences. Never stop mid-sentence.

PRIORITIZE (include specific details):
- Exact years, dates, and time periods (e.g., "In 1847...")
- Precise measurements and quantities (e.g., "23 meters tall")
- Named individuals with their roles (e.g., "Engineer Isambard Kingdom Brunel")
- Unusual events, firsts, and records
- Industrial, engineering, scientific, or technological history
- Connections to major historical events

EXCLUDE (these make facts generic):
- Phrases: "known for", "famous for", "renowned for"
- Descriptions: "picturesque", "charming", "quaint", "scenic"
- Clichés: "traditional cottages", "rolling hills", "historic market town"
- Vague claims without specifics

Return ONE fascinating fact in 2-3 COMPLETE sentences, ready to be spoken aloud.
Each sentence MUST end with a period, exclamation mark, or question mark.
If no specific, interesting fact exists for this location, return exactly: NO_SUITABLE_FACT`;

export class FactGenerationService {
	private adapter: GeminiTextAdapter;
	private factHistory: Set<string> = new Set();

	constructor() {
		// No API key needed - handled server-side by Netlify Function
		this.adapter = new GeminiTextAdapter();
	}

	/**
	 * Generate a historical fact for the given location and context
	 */
	async generateFact(
		places: PlaceNames,
		context: SeasonalContext
	): Promise<HistoricalFact | null> {
		const startTime = Date.now();
		const prompt = this.buildPrompt(places, context);

		const text = await this.adapter.generateContent(prompt, {
			systemInstruction: SYSTEM_PROMPT,
			enableSearch: false, // Disabled - search grounding may not be available for all API keys
			temperature: 0.7,
			maxTokens: 2048 // Must be large - gemini-2.5 uses ~500 tokens for "thinking"
		});

		const researchDurationMs = Date.now() - startTime;

		if (!text) {
			console.log('[FactGeneration] API returned no text');
			return null;
		}

		console.log(`[FactGeneration] Raw response: "${text}"`);

		// Check quality
		const quality = assessFactQuality(text);
		console.log(`[FactGeneration] Quality: score=${quality.score}, verdict=${quality.verdict}, specifics=${quality.containsSpecifics}, exclusions=${quality.containsExclusions}`);

		if (quality.verdict !== 'acceptable') {
			console.log(`[FactGeneration] Rejected: ${quality.verdict}`);
			return null;
		}

		// Check for duplicates
		const textHash = this.hashText(text);
		if (this.factHistory.has(textHash)) {
			return null;
		}

		// Record in history
		this.factHistory.add(textHash);

		// Build fact object
		const metadata: FactMetadata = {
			sourceLocation: places,
			seasonalContext: context,
			generatedAt: Date.now(),
			researchDurationMs
		};

		const fact: HistoricalFact = {
			id: this.generateId(),
			text,
			metadata,
			quality
		};

		return fact;
	}

	/**
	 * Clear fact history (for new sessions)
	 */
	clearHistory(): void {
		this.factHistory.clear();
	}

	// Private methods

	private buildPrompt(places: PlaceNames, context: SeasonalContext): string {
		const locationParts: string[] = [];

		if (places.hamlet) locationParts.push(places.hamlet);
		if (places.village) locationParts.push(places.village);
		if (places.town) locationParts.push(places.town);
		if (places.city) locationParts.push(places.city);
		if (places.county) locationParts.push(places.county);
		if (places.state) locationParts.push(places.state);
		if (places.country) locationParts.push(places.country);

		const locationString =
			locationParts.length > 0 ? locationParts.join(', ') : places.displayName;

		return `Current context: ${context.season}, ${context.timeOfDay}
Location: ${locationString}

Find one fascinating historical fact about this location.`;
	}

	private hashText(text: string): string {
		// Simple hash for deduplication
		let hash = 0;
		for (let i = 0; i < text.length; i++) {
			const char = text.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return hash.toString(16);
	}

	private generateId(): string {
		return `fact-${crypto.randomUUID()}`;
	}
}

// Factory function for creating service
export function createFactGenerationService(): FactGenerationService {
	// API key is handled server-side by Netlify Function
	return new FactGenerationService();
}

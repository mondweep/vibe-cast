// GeminiTextAdapter - Gemini Text API integration
// Handles fact generation with web search grounding

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL_ID = 'gemini-2.5-flash-preview';
const REQUEST_TIMEOUT_MS = 10000;
const MIN_REQUEST_GAP_MS = 15000; // 15 seconds between requests (rate limiting)

interface GenerationConfig {
	temperature?: number;
	maxTokens?: number;
	systemInstruction?: string;
	enableSearch?: boolean;
}

interface GeminiResponse {
	candidates?: Array<{
		content?: {
			parts?: Array<{ text?: string }>;
		};
	}>;
}

export class GeminiTextAdapter {
	private apiKey: string;
	private lastRequestTime: number = 0;
	private requestQueue: Array<() => void> = [];
	private isProcessingQueue: boolean = false;

	constructor(apiKey: string) {
		this.apiKey = apiKey;
	}

	/**
	 * Generate content using Gemini API
	 */
	async generateContent(
		prompt: string,
		config: GenerationConfig = {}
	): Promise<string | null> {
		return new Promise((resolve) => {
			this.requestQueue.push(async () => {
				const result = await this.executeRequest(prompt, config);
				resolve(result);
			});
			this.processQueue();
		});
	}

	// Private methods

	private async processQueue(): Promise<void> {
		if (this.isProcessingQueue) {
			return;
		}

		this.isProcessingQueue = true;

		while (this.requestQueue.length > 0) {
			const timeSinceLastRequest = Date.now() - this.lastRequestTime;
			const waitTime = Math.max(0, MIN_REQUEST_GAP_MS - timeSinceLastRequest);

			if (waitTime > 0) {
				await this.sleep(waitTime);
			}

			const request = this.requestQueue.shift();
			if (request) {
				this.lastRequestTime = Date.now();
				await request();
			}
		}

		this.isProcessingQueue = false;
	}

	private async executeRequest(
		prompt: string,
		config: GenerationConfig
	): Promise<string | null> {
		const url = `${GEMINI_BASE_URL}/${MODEL_ID}:generateContent?key=${this.apiKey}`;

		const requestBody = this.buildRequestBody(prompt, config);

		try {
			const response = await this.fetchWithTimeout(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(requestBody)
			});

			if (!response.ok) {
				return null;
			}

			const data: GeminiResponse = await response.json();
			return this.parseResponse(data);
		} catch {
			return null;
		}
	}

	private buildRequestBody(prompt: string, config: GenerationConfig): object {
		const body: Record<string, unknown> = {
			contents: [
				{
					parts: [{ text: prompt }]
				}
			],
			generationConfig: {
				temperature: config.temperature ?? 0.7,
				maxOutputTokens: config.maxTokens ?? 150
			}
		};

		if (config.systemInstruction) {
			body.systemInstruction = {
				parts: [{ text: config.systemInstruction }]
			};
		}

		if (config.enableSearch) {
			body.tools = [{ googleSearch: {} }];
		}

		return body;
	}

	private parseResponse(response: GeminiResponse): string | null {
		const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

		if (!text) {
			return null;
		}

		// Check for NO_SUITABLE_FACT marker
		if (text.trim() === 'NO_SUITABLE_FACT') {
			return null;
		}

		return text;
	}

	private async fetchWithTimeout(
		url: string,
		options: RequestInit
	): Promise<Response> {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

		try {
			const response = await fetch(url, {
				...options,
				signal: controller.signal
			});
			return response;
		} finally {
			clearTimeout(timeoutId);
		}
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

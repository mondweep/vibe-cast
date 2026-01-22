// GeminiTextAdapter - Calls Netlify Function proxy for Gemini API
// API key stays server-side, never exposed to client

const FUNCTION_URL = '/.netlify/functions/generate-fact';
const REQUEST_TIMEOUT_MS = 35000; // Slightly longer than function timeout
const MIN_REQUEST_GAP_MS = 15000; // 15 seconds between requests (rate limiting)

interface GenerationConfig {
	temperature?: number;
	maxTokens?: number;
	systemInstruction?: string;
	enableSearch?: boolean;
}

interface FunctionResponse {
	text?: string | null;
	finishReason?: string;
	error?: string;
}

export class GeminiTextAdapter {
	private lastRequestTime: number = 0;
	private requestQueue: Array<() => void> = [];
	private isProcessingQueue: boolean = false;

	constructor() {
		// No API key needed - it's handled server-side
	}

	/**
	 * Generate content using Netlify Function proxy
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
		const requestBody = {
			prompt,
			systemInstruction: config.systemInstruction,
			temperature: config.temperature ?? 0.7,
			maxTokens: config.maxTokens ?? 2048,
			enableSearch: config.enableSearch ?? false
		};

		try {
			const response = await this.fetchWithTimeout(FUNCTION_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(requestBody)
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				console.error('[GeminiAdapter] Function error:', errorData);
				return null;
			}

			const data: FunctionResponse = await response.json();

			if (data.error) {
				console.error('[GeminiAdapter] API error:', data.error);
				return null;
			}

			return this.parseResponse(data);
		} catch (error) {
			console.error('[GeminiAdapter] Request failed:', error);
			return null;
		}
	}

	private parseResponse(response: FunctionResponse): string | null {
		const text = response.text;

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

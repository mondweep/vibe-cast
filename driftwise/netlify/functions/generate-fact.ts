// Netlify Function: Gemini API Proxy
// Keeps the API key server-side, not exposed to clients

import type { Handler, HandlerEvent } from '@netlify/functions';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL_ID = 'gemini-2.5-flash';
const REQUEST_TIMEOUT_MS = 30000;

interface RequestBody {
	prompt: string;
	systemInstruction?: string;
	temperature?: number;
	maxTokens?: number;
	enableSearch?: boolean;
}

interface GeminiResponse {
	candidates?: Array<{
		content?: {
			parts?: Array<{ text?: string }>;
		};
		finishReason?: string;
	}>;
	error?: {
		message: string;
		code: number;
	};
}

const handler: Handler = async (event: HandlerEvent) => {
	// Only allow POST requests
	if (event.httpMethod !== 'POST') {
		return {
			statusCode: 405,
			body: JSON.stringify({ error: 'Method not allowed' })
		};
	}

	// Get API key from server-side environment variable (NOT exposed to client)
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) {
		console.error('GEMINI_API_KEY environment variable not set');
		return {
			statusCode: 500,
			body: JSON.stringify({ error: 'Server configuration error' })
		};
	}

	// Parse request body
	let body: RequestBody;
	try {
		body = JSON.parse(event.body || '{}');
	} catch {
		return {
			statusCode: 400,
			body: JSON.stringify({ error: 'Invalid JSON body' })
		};
	}

	if (!body.prompt) {
		return {
			statusCode: 400,
			body: JSON.stringify({ error: 'Missing prompt' })
		};
	}

	// Build Gemini API request
	const url = `${GEMINI_BASE_URL}/${MODEL_ID}:generateContent?key=${apiKey}`;

	const requestBody: Record<string, unknown> = {
		contents: [
			{
				parts: [{ text: body.prompt }]
			}
		],
		generationConfig: {
			temperature: body.temperature ?? 0.7,
			maxOutputTokens: body.maxTokens ?? 2048
		}
	};

	if (body.systemInstruction) {
		requestBody.systemInstruction = {
			parts: [{ text: body.systemInstruction }]
		};
	}

	if (body.enableSearch) {
		requestBody.tools = [{ googleSearch: {} }];
	}

	// Call Gemini API with timeout
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(requestBody),
			signal: controller.signal
		});

		clearTimeout(timeoutId);

		const data: GeminiResponse = await response.json();

		if (!response.ok) {
			console.error('Gemini API error:', data.error?.message || response.statusText);
			return {
				statusCode: response.status,
				body: JSON.stringify({
					error: data.error?.message || 'Gemini API error'
				})
			};
		}

		// Extract text from response
		const text = data.candidates?.[0]?.content?.parts?.[0]?.text || null;
		const finishReason = data.candidates?.[0]?.finishReason || 'UNKNOWN';

		return {
			statusCode: 200,
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				text,
				finishReason
			})
		};
	} catch (error) {
		clearTimeout(timeoutId);

		if (error instanceof Error && error.name === 'AbortError') {
			return {
				statusCode: 504,
				body: JSON.stringify({ error: 'Request timeout' })
			};
		}

		console.error('Unexpected error:', error);
		return {
			statusCode: 500,
			body: JSON.stringify({ error: 'Internal server error' })
		};
	}
};

export { handler };

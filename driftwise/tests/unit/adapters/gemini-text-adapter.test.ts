// GeminiTextAdapter Unit Tests - TDD Suite
// Tests for Gemini Text API integration

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiTextAdapter } from '@adapters/GeminiTextAdapter';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GeminiTextAdapter', () => {
	let adapter: GeminiTextAdapter;
	const testApiKey = 'test-api-key';

	beforeEach(() => {
		vi.useFakeTimers();
		adapter = new GeminiTextAdapter(testApiKey);
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('generateContent', () => {
		it('should generate content successfully', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						candidates: [
							{
								content: {
									parts: [{ text: 'This is a historical fact about London.' }]
								}
							}
						]
					})
			});

			const result = await adapter.generateContent('Tell me about London');

			expect(result).toBe('This is a historical fact about London.');
		});

		it('should use correct API endpoint', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						candidates: [{ content: { parts: [{ text: 'Test' }] } }]
					})
			});

			await adapter.generateContent('Test prompt');

			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('generativelanguage.googleapis.com'),
				expect.any(Object)
			);
		});

		it('should include API key in URL', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						candidates: [{ content: { parts: [{ text: 'Test' }] } }]
					})
			});

			await adapter.generateContent('Test');

			const calledUrl = mockFetch.mock.calls[0][0] as string;
			expect(calledUrl).toContain(`key=${testApiKey}`);
		});

		it('should include system instruction when provided', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						candidates: [{ content: { parts: [{ text: 'Test' }] } }]
					})
			});

			await adapter.generateContent('Test', {
				systemInstruction: 'You are a history expert'
			});

			const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
			expect(requestBody.systemInstruction.parts[0].text).toBe('You are a history expert');
		});

		it('should enable Google Search tool when requested', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						candidates: [{ content: { parts: [{ text: 'Test' }] } }]
					})
			});

			await adapter.generateContent('Test', { enableSearch: true });

			const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
			expect(requestBody.tools).toContainEqual({ googleSearch: {} });
		});

		it('should use specified temperature', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						candidates: [{ content: { parts: [{ text: 'Test' }] } }]
					})
			});

			await adapter.generateContent('Test', { temperature: 0.5 });

			const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
			expect(requestBody.generationConfig.temperature).toBe(0.5);
		});

		it('should use specified maxTokens', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						candidates: [{ content: { parts: [{ text: 'Test' }] } }]
					})
			});

			await adapter.generateContent('Test', { maxTokens: 100 });

			const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
			expect(requestBody.generationConfig.maxOutputTokens).toBe(100);
		});

		it('should return null on HTTP error', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500
			});

			const result = await adapter.generateContent('Test');

			expect(result).toBeNull();
		});

		it('should return null on network error', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			const result = await adapter.generateContent('Test');

			expect(result).toBeNull();
		});

		it('should return null on empty response', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ candidates: [] })
			});

			const result = await adapter.generateContent('Test');

			expect(result).toBeNull();
		});

		it('should return null on malformed response', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ invalid: 'response' })
			});

			const result = await adapter.generateContent('Test');

			expect(result).toBeNull();
		});

		it('should detect NO_SUITABLE_FACT marker', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						candidates: [{ content: { parts: [{ text: 'NO_SUITABLE_FACT' }] } }]
					})
			});

			const result = await adapter.generateContent('Test');

			expect(result).toBeNull();
		});
	});

	describe('rate limiting', () => {
		it('should enforce minimum gap between requests', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						candidates: [{ content: { parts: [{ text: 'Test' }] } }]
					})
			});

			// First request
			const p1 = adapter.generateContent('Test 1');
			await vi.advanceTimersByTimeAsync(0);
			await p1;
			expect(mockFetch).toHaveBeenCalledTimes(1);

			// Second request should be delayed
			const p2 = adapter.generateContent('Test 2');

			// Advance time past the rate limit
			await vi.advanceTimersByTimeAsync(15000);
			await p2;

			expect(mockFetch).toHaveBeenCalledTimes(2);
		});

		it('should queue requests and process in order', async () => {
			const responses: string[] = [];
			mockFetch.mockImplementation((url, options) => {
				const body = JSON.parse(options.body);
				const prompt = body.contents[0].parts[0].text;
				return Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							candidates: [{ content: { parts: [{ text: `Response to: ${prompt}` }] } }]
						})
				});
			});

			// Queue multiple requests
			const promises = [
				adapter.generateContent('First'),
				adapter.generateContent('Second'),
				adapter.generateContent('Third')
			];

			// Process queue
			for (let i = 0; i < 3; i++) {
				await vi.advanceTimersByTimeAsync(15000);
			}

			const results = await Promise.all(promises);

			expect(results[0]).toContain('First');
			expect(results[1]).toContain('Second');
			expect(results[2]).toContain('Third');
		});
	});

	describe('timeout', () => {
		it('should handle timeout/abort', async () => {
			mockFetch.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'));

			const result = await adapter.generateContent('Test');

			expect(result).toBeNull();
		});

		it('should use AbortController for timeout', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						candidates: [{ content: { parts: [{ text: 'Test' }] } }]
					})
			});

			await adapter.generateContent('Test');

			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					signal: expect.any(AbortSignal)
				})
			);
		});
	});
});

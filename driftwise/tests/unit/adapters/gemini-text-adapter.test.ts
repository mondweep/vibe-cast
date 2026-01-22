// GeminiTextAdapter Unit Tests - TDD Suite
// Tests for Netlify Function proxy integration

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiTextAdapter } from '@adapters/GeminiTextAdapter';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GeminiTextAdapter', () => {
	let adapter: GeminiTextAdapter;

	beforeEach(() => {
		vi.useFakeTimers();
		adapter = new GeminiTextAdapter();
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
						text: 'This is a historical fact about London.',
						finishReason: 'STOP'
					})
			});

			const result = await adapter.generateContent('Tell me about London');

			expect(result).toBe('This is a historical fact about London.');
		});

		it('should call Netlify Function endpoint', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						text: 'Test',
						finishReason: 'STOP'
					})
			});

			await adapter.generateContent('Test prompt');

			expect(mockFetch).toHaveBeenCalledWith(
				'/.netlify/functions/generate-fact',
				expect.any(Object)
			);
		});

		it('should send prompt in request body', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						text: 'Test',
						finishReason: 'STOP'
					})
			});

			await adapter.generateContent('Test prompt');

			const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
			expect(requestBody.prompt).toBe('Test prompt');
		});

		it('should include system instruction when provided', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						text: 'Test',
						finishReason: 'STOP'
					})
			});

			await adapter.generateContent('Test', {
				systemInstruction: 'You are a history expert'
			});

			const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
			expect(requestBody.systemInstruction).toBe('You are a history expert');
		});

		it('should include enableSearch when requested', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						text: 'Test',
						finishReason: 'STOP'
					})
			});

			await adapter.generateContent('Test', { enableSearch: true });

			const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
			expect(requestBody.enableSearch).toBe(true);
		});

		it('should use specified temperature', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						text: 'Test',
						finishReason: 'STOP'
					})
			});

			await adapter.generateContent('Test', { temperature: 0.5 });

			const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
			expect(requestBody.temperature).toBe(0.5);
		});

		it('should use specified maxTokens', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						text: 'Test',
						finishReason: 'STOP'
					})
			});

			await adapter.generateContent('Test', { maxTokens: 100 });

			const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
			expect(requestBody.maxTokens).toBe(100);
		});

		it('should return null on HTTP error', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
				json: () => Promise.resolve({ error: 'Server error' })
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
				json: () => Promise.resolve({ text: null })
			});

			const result = await adapter.generateContent('Test');

			expect(result).toBeNull();
		});

		it('should return null on error response', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ error: 'API error' })
			});

			const result = await adapter.generateContent('Test');

			expect(result).toBeNull();
		});

		it('should detect NO_SUITABLE_FACT marker', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						text: 'NO_SUITABLE_FACT',
						finishReason: 'STOP'
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
						text: 'Test',
						finishReason: 'STOP'
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
			mockFetch.mockImplementation((url, options) => {
				const body = JSON.parse(options.body);
				const prompt = body.prompt;
				return Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							text: `Response to: ${prompt}`,
							finishReason: 'STOP'
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
						text: 'Test',
						finishReason: 'STOP'
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

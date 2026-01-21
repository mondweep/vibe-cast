// Audio Context Unit Tests - TDD Suite
// Tests for audio focus management

import { describe, it, expect } from 'vitest';
import {
	createAudioFocusRequest,
	type FocusType,
	type FocusResult,
	type AudioFocusRequest
} from '@domain/audio';

describe('Audio Context - Domain Models', () => {
	describe('createAudioFocusRequest', () => {
		it('should create a focus request with default granted result', () => {
			const request = createAudioFocusRequest('transient_may_duck');

			expect(request.type).toBe('transient_may_duck');
			expect(request.result).toBe('granted');
			expect(request.id).toBeDefined();
			expect(request.requestedAt).toBeLessThanOrEqual(Date.now());
		});

		it('should accept custom result', () => {
			const request = createAudioFocusRequest('transient', 'failed');

			expect(request.result).toBe('failed');
		});

		it('should accept delayed result', () => {
			const request = createAudioFocusRequest('gain', 'delayed');

			expect(request.result).toBe('delayed');
		});

		it('should generate unique IDs', () => {
			const request1 = createAudioFocusRequest('transient');
			const request2 = createAudioFocusRequest('transient');

			expect(request1.id).not.toBe(request2.id);
		});

		it('should not have releasedAt initially', () => {
			const request = createAudioFocusRequest('transient');

			expect(request.releasedAt).toBeUndefined();
		});
	});

	describe('FocusType', () => {
		it('should support all focus types', () => {
			const types: FocusType[] = ['gain', 'transient', 'transient_may_duck'];

			for (const type of types) {
				const request = createAudioFocusRequest(type);
				expect(request.type).toBe(type);
			}
		});
	});

	describe('FocusResult', () => {
		it('should support all result types', () => {
			const results: FocusResult[] = ['granted', 'delayed', 'failed'];

			for (const result of results) {
				const request = createAudioFocusRequest('transient', result);
				expect(request.result).toBe(result);
			}
		});
	});
});

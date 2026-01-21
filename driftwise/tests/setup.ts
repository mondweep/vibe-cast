// Vitest Test Setup
// Global test configuration and mocks

import { vi } from 'vitest';

// Mock browser APIs not available in Node.js
global.crypto = {
	randomUUID: () =>
		'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
			const r = (Math.random() * 16) | 0;
			const v = c === 'x' ? r : (r & 0x3) | 0x8;
			return v.toString(16);
		})
} as Crypto;

// Mock Geolocation API
const mockGeolocation = {
	getCurrentPosition: vi.fn(),
	watchPosition: vi.fn(),
	clearWatch: vi.fn()
};

Object.defineProperty(global.navigator, 'geolocation', {
	value: mockGeolocation,
	writable: true
});

// Mock Permissions API
const mockPermissions = {
	query: vi.fn()
};

Object.defineProperty(global.navigator, 'permissions', {
	value: mockPermissions,
	writable: true
});

// Reset mocks between tests
beforeEach(() => {
	vi.clearAllMocks();
});

// Utility function to mock successful location
export function mockSuccessfulLocation(
	latitude: number,
	longitude: number,
	accuracy: number = 10
): void {
	mockGeolocation.getCurrentPosition.mockImplementation((success) => {
		success({
			coords: { latitude, longitude, accuracy },
			timestamp: Date.now()
		});
	});
}

// Utility function to mock location error
export function mockLocationError(code: number, message: string): void {
	mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
		error({ code, message });
	});
}

// Utility function to mock permission state
export function mockPermissionState(state: 'granted' | 'denied' | 'prompt'): void {
	mockPermissions.query.mockResolvedValue({ state });
}

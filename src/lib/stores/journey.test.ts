import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { createJourneyStore } from './journey';

// Mocks
const mockLocationService = {
    getCurrentLocation: vi.fn(),
    watchLocation: vi.fn()
};
const mockGeocodingService = {
    reverseGeocode: vi.fn()
};
const mockFactService = {
    generateFact: vi.fn()
};
const mockVoiceService = {
    connect: vi.fn(),
    speak: vi.fn(),
    disconnect: vi.fn()
};
const mockAudioService = {
    requestFocus: vi.fn(),
    abandonFocus: vi.fn()
};

describe('JourneyStore', () => {
    let store: ReturnType<typeof createJourneyStore>;

    beforeEach(() => {
        vi.clearAllMocks();
        store = createJourneyStore({
            location: mockLocationService as any,
            geocoding: mockGeocodingService as any,
            fact: mockFactService as any,
            voice: mockVoiceService as any,
            audio: mockAudioService as any
        });
    });

    it('should start in "idle" state', () => {
        const state = get(store);
        expect(state.status).toBe('idle');
    });

    it('should transition to "driving" when startDrive is called', async () => {
        await store.startDrive();
        const state = get(store);

        expect(state.status).toBe('driving');
        expect(mockAudioService.requestFocus).toHaveBeenCalled();
        expect(mockVoiceService.connect).toHaveBeenCalled();
    });

    it('should trigger fact generation workflow on location update', async () => {
        // Arrange
        mockLocationService.getCurrentLocation.mockResolvedValue({ latitude: 52, longitude: 0 });
        mockGeocodingService.reverseGeocode.mockResolvedValue({ name: 'Test Village' });
        mockFactService.generateFact.mockResolvedValue('Interesting fact');

        // Act
        await store.startDrive();
        // Simulate manual trigger for V1 (or automatic if implemented)
        await store.checkLocation();

        // Assert
        expect(mockGeocodingService.reverseGeocode).toHaveBeenCalled();
        expect(mockFactService.generateFact).toHaveBeenCalledWith('Test Village');
        expect(mockVoiceService.speak).toHaveBeenCalledWith('Interesting fact');
    });
});

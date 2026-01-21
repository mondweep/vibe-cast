import { describe, it, expect, vi } from 'vitest';
import { LocationService } from './LocationService';
import { Geolocation } from '@capacitor/geolocation';

// Mock Capacitor
vi.mock('@capacitor/geolocation', () => ({
    Geolocation: {
        getCurrentPosition: vi.fn()
    }
}));

describe('LocationService', () => {
    it('should return a valid Coordinate when permission is granted', async () => {
        // Arrange
        const mockPos = {
            coords: {
                latitude: 51.5074,
                longitude: -0.1278,
                accuracy: 10,
                heading: null,
                speed: null,
                altitude: null,
                altitudeAccuracy: null
            },
            timestamp: Date.now()
        };
        vi.mocked(Geolocation.getCurrentPosition).mockResolvedValue(mockPos as any);

        // Act
        const location = await LocationService.getCurrentLocation();

        // Assert
        expect(location.latitude).toBe(51.5074);
        expect(location.longitude).toBe(-0.1278);
    });
});

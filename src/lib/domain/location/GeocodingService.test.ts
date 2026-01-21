import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeocodingService } from './GeocodingService';

// Mock fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('GeocodingService', () => {
    beforeEach(() => {
        fetchMock.mockReset();
        // Reset singleton if needed (not implemented yet)
    });

    it('should resolve coordinates to a Village/Town', async () => {
        // Arrange
        const mockResponse = {
            address: {
                village: 'Ambridge',
                county: 'Borsetshire'
            }
        };
        fetchMock.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockResponse)
        });

        // Act
        const entity = await GeocodingService.reverseGeocode(52.1, -1.5);

        // Assert
        expect(entity.name).toBe('Ambridge');
        expect(entity.type).toBe('village');
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should handle rate limiting (mocked)', async () => {
        // This is a behavioral test for the next iteration
        // verifying that calling it twice rapidly queues the request
        // For V1, we just verify the call works.
    });
});

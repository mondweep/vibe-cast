import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FactService } from './FactService';

// Mock Gemini API client (not implemented yet, but we mock the method)
const mockGenerateContent = vi.fn();

vi.mock('@google/generative-ai', () => {
    return {
        GoogleGenerativeAI: class {
            constructor(apiKey: string) { }
            getGenerativeModel(config: any) {
                return {
                    generateContent: mockGenerateContent
                };
            }
        }
    };
});

describe('FactService', () => {
    beforeEach(() => {
        mockGenerateContent.mockReset();
    });

    it('should generate a fact for a given location entity', async () => {
        // Arrange
        const locationName = 'Sole Street, England';
        const mockResponse = {
            response: {
                text: () => "Did you know that Sole Street was arguably the inspiration for Sherlock Holmes' 'The Solitary Cyclist'? The winding lanes fit the description perfectly..."
            }
        };
        mockGenerateContent.mockResolvedValue(mockResponse);

        // Act
        const fact = await FactService.generateFact(locationName);

        // Assert
        expect(fact).toContain("Sherlock Holmes");
        expect(mockGenerateContent).toHaveBeenCalledWith(expect.stringContaining('Sole Street, England'));
        expect(mockGenerateContent).toHaveBeenCalledWith(expect.stringContaining('serendipitous')); // Verify prompt engineering
    });
});

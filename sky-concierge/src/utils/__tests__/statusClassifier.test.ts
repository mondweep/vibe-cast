import { describe, it, expect } from 'vitest';
import { classifyFlightStatus, getStatusColour } from '../statusClassifier';
import type { Flight } from '../../types';

describe('statusClassifier', () => {
  const createMockFlight = (overrides: Partial<Flight> = {}): Flight => ({
    id: 'test-1',
    flightNumber: 'BA123',
    airline: 'British Airways',
    origin: {
      code: 'LHR',
      name: 'Heathrow',
      city: 'London',
      country: 'United Kingdom',
      timezone: 'Europe/London',
    },
    destination: {
      code: 'JFK',
      name: 'John F Kennedy',
      city: 'New York',
      country: 'United States',
      timezone: 'America/New_York',
    },
    scheduledDeparture: new Date('2025-11-26T10:00:00Z'),
    actualDeparture: new Date('2025-11-26T10:00:00Z'),
    scheduledArrival: new Date('2025-11-26T18:00:00Z'),
    actualArrival: null,
    terminal: '5',
    gate: 'A10',
    aircraft: 'Boeing 777-300ER',
    status: 'scheduled',
    ...overrides,
  });

  describe('classifyFlightStatus', () => {
    it('should return GREEN status for on-time flight', () => {
      const flight = createMockFlight({
        scheduledDeparture: new Date('2025-11-26T10:00:00Z'),
        actualDeparture: new Date('2025-11-26T10:00:00Z'),
      });

      const result = classifyFlightStatus(flight);

      expect(result.status).toBe('GREEN');
      expect(result.message).toBe('On Time');
      expect(result.action).toBeUndefined();
    });

    it('should return GREEN status for early departure', () => {
      const flight = createMockFlight({
        scheduledDeparture: new Date('2025-11-26T10:00:00Z'),
        actualDeparture: new Date('2025-11-26T09:50:00Z'),
      });

      const result = classifyFlightStatus(flight);

      expect(result.status).toBe('GREEN');
      expect(result.message).toBe('On Time');
    });

    it('should return AMBER status for minor delay (1-30 minutes)', () => {
      const flight = createMockFlight({
        scheduledDeparture: new Date('2025-11-26T10:00:00Z'),
        actualDeparture: new Date('2025-11-26T10:20:00Z'),
      });

      const result = classifyFlightStatus(flight);

      expect(result.status).toBe('AMBER');
      expect(result.message).toContain('Minor Delay');
      expect(result.delayMinutes).toBe(20);
    });

    it('should return RED status for significant delay (>30 minutes)', () => {
      const flight = createMockFlight({
        scheduledDeparture: new Date('2025-11-26T10:00:00Z'),
        actualDeparture: new Date('2025-11-26T11:00:00Z'),
      });

      const result = classifyFlightStatus(flight);

      expect(result.status).toBe('RED');
      expect(result.message).toContain('Significant Delay');
      expect(result.action).toBe('REVIEW');
      expect(result.delayMinutes).toBe(60);
    });

    it('should return RED status with REBOOK action for cancelled flight', () => {
      const flight = createMockFlight({
        status: 'cancelled',
      });

      const result = classifyFlightStatus(flight);

      expect(result.status).toBe('RED');
      expect(result.message).toBe('Flight Cancelled');
      expect(result.action).toBe('REBOOK');
    });

    it('should handle null actualDeparture by using scheduled time', () => {
      const flight = createMockFlight({
        actualDeparture: null,
      });

      const result = classifyFlightStatus(flight);

      expect(result.status).toBe('GREEN');
      expect(result.message).toBe('On Time');
    });
  });

  describe('getStatusColour', () => {
    it('should return correct CSS colour for GREEN status', () => {
      expect(getStatusColour('GREEN')).toBe('#22c55e');
    });

    it('should return correct CSS colour for AMBER status', () => {
      expect(getStatusColour('AMBER')).toBe('#f59e0b');
    });

    it('should return correct CSS colour for RED status', () => {
      expect(getStatusColour('RED')).toBe('#ef4444');
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  calculateDepartureTime,
  formatTime,
  formatDuration,
  getTimeUntil,
} from '../timeCalculations';
import type { Flight } from '../../types';

describe('timeCalculations', () => {
  const createMockFlight = (departureTime: Date): Flight => ({
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
    scheduledDeparture: departureTime,
    actualDeparture: departureTime,
    scheduledArrival: new Date(departureTime.getTime() + 8 * 60 * 60 * 1000),
    actualArrival: null,
    terminal: '5',
    gate: 'A10',
    aircraft: 'Boeing 777-300ER',
    status: 'scheduled',
  });

  describe('calculateDepartureTime', () => {
    it('should calculate correct departure time with all factors', () => {
      // Flight at 14:00, with 45min travel, 30min security, 15min walking, 60min buffer
      const flight = createMockFlight(new Date('2025-11-26T14:00:00Z'));

      const result = calculateDepartureTime(flight, {
        travelTime: 45,
        securityWaitTime: 30,
        walkingTime: 15,
        bufferTime: 60,
      });

      // Total: 45 + 30 + 15 + 60 = 150 minutes = 2.5 hours
      // Leave time should be 14:00 - 2:30 = 11:30
      expect(result.totalMinutes).toBe(150);
      expect(result.leaveTime.getUTCHours()).toBe(11);
      expect(result.leaveTime.getUTCMinutes()).toBe(30);
    });

    it('should include breakdown of all time components', () => {
      const flight = createMockFlight(new Date('2025-11-26T14:00:00Z'));

      const result = calculateDepartureTime(flight, {
        travelTime: 45,
        securityWaitTime: 30,
        walkingTime: 15,
        bufferTime: 60,
      });

      expect(result.breakdown.travelTime).toBe(45);
      expect(result.breakdown.securityWaitTime).toBe(30);
      expect(result.breakdown.walkingTime).toBe(15);
      expect(result.breakdown.bufferTime).toBe(60);
    });

    it('should use default buffer time of 60 minutes if not specified', () => {
      const flight = createMockFlight(new Date('2025-11-26T14:00:00Z'));

      const result = calculateDepartureTime(flight, {
        travelTime: 30,
        securityWaitTime: 20,
        walkingTime: 10,
      });

      expect(result.breakdown.bufferTime).toBe(60);
    });
  });

  describe('formatTime', () => {
    it('should format time in 24-hour format with British locale', () => {
      const date = new Date('2025-11-26T14:30:00Z');
      const result = formatTime(date);

      expect(result).toMatch(/14:30/);
    });

    it('should handle midnight correctly', () => {
      const date = new Date('2025-11-26T00:00:00Z');
      const result = formatTime(date);

      expect(result).toMatch(/00:00/);
    });
  });

  describe('formatDuration', () => {
    it('should format minutes only when less than 60', () => {
      expect(formatDuration(45)).toBe('45 mins');
    });

    it('should format hours and minutes correctly', () => {
      expect(formatDuration(90)).toBe('1h 30m');
    });

    it('should format exact hours without minutes', () => {
      expect(formatDuration(120)).toBe('2h 0m');
    });

    it('should handle zero minutes', () => {
      expect(formatDuration(0)).toBe('0 mins');
    });
  });

  describe('getTimeUntil', () => {
    it('should calculate time remaining correctly', () => {
      const now = new Date('2025-11-26T10:00:00Z');
      const future = new Date('2025-11-26T12:30:00Z');

      const result = getTimeUntil(future, now);

      expect(result.hours).toBe(2);
      expect(result.minutes).toBe(30);
      expect(result.totalMinutes).toBe(150);
      expect(result.isInPast).toBe(false);
    });

    it('should indicate when time is in the past', () => {
      const now = new Date('2025-11-26T12:00:00Z');
      const past = new Date('2025-11-26T10:00:00Z');

      const result = getTimeUntil(past, now);

      expect(result.isInPast).toBe(true);
    });
  });
});

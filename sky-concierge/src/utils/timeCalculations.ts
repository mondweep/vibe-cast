import type { Flight, DepartureCalculation } from '../types';

interface DepartureFactors {
  travelTime: number;
  securityWaitTime: number;
  walkingTime: number;
  bufferTime?: number;
}

/**
 * Calculates the optimal time to leave home for a flight
 * Takes into account travel time, security queues, walking to gate, and buffer
 */
export function calculateDepartureTime(
  flight: Flight,
  factors: DepartureFactors
): DepartureCalculation {
  const bufferTime = factors.bufferTime ?? 60; // Default 60 minutes buffer

  const totalMinutes =
    factors.travelTime +
    factors.securityWaitTime +
    factors.walkingTime +
    bufferTime;

  const departureTime = flight.scheduledDeparture.getTime();
  const leaveTime = new Date(departureTime - totalMinutes * 60 * 1000);

  return {
    leaveTime,
    breakdown: {
      travelTime: factors.travelTime,
      securityWaitTime: factors.securityWaitTime,
      walkingTime: factors.walkingTime,
      bufferTime,
    },
    totalMinutes,
  };
}

/**
 * Formats a date to 24-hour time string (British format)
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });
}

/**
 * Formats a duration in minutes to human-readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} mins`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;

  return `${hours}h ${remainingMins}m`;
}

interface TimeUntilResult {
  hours: number;
  minutes: number;
  totalMinutes: number;
  isInPast: boolean;
}

/**
 * Calculates the time remaining until a target date
 */
export function getTimeUntil(
  target: Date,
  from: Date = new Date()
): TimeUntilResult {
  const diffMs = target.getTime() - from.getTime();
  const totalMinutes = Math.round(diffMs / (1000 * 60));
  const isInPast = diffMs < 0;

  const absTotalMinutes = Math.abs(totalMinutes);
  const hours = Math.floor(absTotalMinutes / 60);
  const minutes = absTotalMinutes % 60;

  return {
    hours,
    minutes,
    totalMinutes,
    isInPast,
  };
}

/**
 * Formats a date for display with day and time
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Gets a greeting based on time of day
 */
export function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good morning';
  } else if (hour < 17) {
    return 'Good afternoon';
  } else {
    return 'Good evening';
  }
}

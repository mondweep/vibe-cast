import type { Flight, FlightStatus, StatusClassification } from '../types';

/**
 * Classifies a flight's status based on delays and cancellation
 * Uses traffic light system: GREEN (on time), AMBER (minor delay), RED (significant delay/cancelled)
 */
export function classifyFlightStatus(flight: Flight): StatusClassification {
  // Handle cancelled flights first
  if (flight.status === 'cancelled') {
    return {
      status: 'RED',
      message: 'Flight Cancelled',
      action: 'REBOOK',
    };
  }

  // Calculate delay in minutes
  const scheduled = flight.scheduledDeparture.getTime();
  const actual = flight.actualDeparture
    ? flight.actualDeparture.getTime()
    : scheduled;

  const delayMs = actual - scheduled;
  const delayMinutes = Math.round(delayMs / (1000 * 60));

  // On time or early
  if (delayMinutes <= 0) {
    return {
      status: 'GREEN',
      message: 'On Time',
    };
  }

  // Minor delay (1-30 minutes)
  if (delayMinutes <= 30) {
    return {
      status: 'AMBER',
      message: `Minor Delay (${delayMinutes} mins)`,
      delayMinutes,
    };
  }

  // Significant delay (>30 minutes)
  return {
    status: 'RED',
    message: `Significant Delay (${delayMinutes} mins)`,
    action: 'REVIEW',
    delayMinutes,
  };
}

/**
 * Returns the CSS colour value for a flight status
 */
export function getStatusColour(status: FlightStatus): string {
  const colours: Record<FlightStatus, string> = {
    GREEN: '#22c55e',
    AMBER: '#f59e0b',
    RED: '#ef4444',
  };

  return colours[status];
}

/**
 * Returns a human-readable status label
 */
export function getStatusLabel(status: FlightStatus): string {
  const labels: Record<FlightStatus, string> = {
    GREEN: 'On Time',
    AMBER: 'Minor Delay',
    RED: 'Delayed',
  };

  return labels[status];
}

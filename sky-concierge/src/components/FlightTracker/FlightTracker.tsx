import React from 'react';
import type { Flight } from '../../types';
import { StatusBadge } from '../StatusBadge';
import { classifyFlightStatus } from '../../utils/statusClassifier';
import { formatTime, formatDuration } from '../../utils/timeCalculations';
import styles from './FlightTracker.module.css';

interface FlightTrackerProps {
  flight: Flight;
  incomingAircraft?: {
    origin: string;
    status: string;
    latitude?: number;
    longitude?: number;
  };
}

export const FlightTracker: React.FC<FlightTrackerProps> = ({
  flight,
  incomingAircraft,
}) => {
  const status = classifyFlightStatus(flight);
  const departureTime = flight.actualDeparture || flight.scheduledDeparture;

  // Calculate flight duration in minutes
  const durationMs = flight.scheduledArrival.getTime() - flight.scheduledDeparture.getTime();
  const durationMins = Math.round(durationMs / (1000 * 60));

  return (
    <section className={styles.container} data-testid="flight-tracker">
      <header className={styles.header}>
        <div className={styles.flightInfo}>
          <div className={styles.airline}>{flight.airline}</div>
          <div className={styles.flightNumber}>{flight.flightNumber}</div>
        </div>
        <StatusBadge status={status.status} label={status.message} pulse />
      </header>

      <div className={styles.route}>
        <div className={styles.airport}>
          <div className={styles.airportCode}>{flight.origin.code}</div>
          <div className={styles.airportCity}>{flight.origin.city}</div>
          <div className={styles.time}>{formatTime(departureTime)}</div>
        </div>

        <div className={styles.flightPath}>
          <div className={styles.pathLine}>
            <div className={styles.pathDot} />
            <div className={styles.pathTrail} />
            <span className={styles.planeIcon}>✈️</span>
            <div className={styles.pathTrail} />
            <div className={styles.pathDot} />
          </div>
          <div className={styles.duration}>{formatDuration(durationMins)}</div>
        </div>

        <div className={styles.airport}>
          <div className={styles.airportCode}>{flight.destination.code}</div>
          <div className={styles.airportCity}>{flight.destination.city}</div>
          <div className={styles.time}>{formatTime(flight.scheduledArrival)}</div>
        </div>
      </div>

      <div className={styles.details}>
        <div className={styles.detailItem}>
          <span className={styles.detailIcon}>🚪</span>
          <div className={styles.detailContent}>
            <span className={styles.detailLabel}>Terminal</span>
            <span className={styles.detailValue}>{flight.terminal}</span>
          </div>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailIcon}>🎫</span>
          <div className={styles.detailContent}>
            <span className={styles.detailLabel}>Gate</span>
            <span className={styles.detailValue}>{flight.gate}</span>
          </div>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailIcon}>🛫</span>
          <div className={styles.detailContent}>
            <span className={styles.detailLabel}>Aircraft</span>
            <span className={styles.detailValue}>{flight.aircraft}</span>
          </div>
        </div>
      </div>

      {incomingAircraft && (
        <div className={styles.incomingAircraft}>
          <div className={styles.incomingHeader}>
            <span className={styles.incomingIcon}>📡</span>
            <span className={styles.incomingTitle}>Incoming Aircraft</span>
          </div>
          <p className={styles.incomingStatus}>
            Your aircraft is currently {incomingAircraft.status.toLowerCase()}
          </p>
          <div className={styles.mapPlaceholder}>
            <div className={styles.mapContent}>
              <span className={styles.mapIcon}>🗺️</span>
              <span>Live tracking from {incomingAircraft.origin}</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default FlightTracker;

import React, { useState } from 'react';
import type { Flight } from '../../types';
import styles from './DisruptionAlert.module.css';

interface AlternativeFlight {
  id: string;
  flightNumber: string;
  airline: string;
  departureTime: Date;
  arrivalTime: Date;
  price?: number;
  seatsAvailable: number;
}

interface DisruptionAlertProps {
  flight: Flight;
  alternatives?: AlternativeFlight[];
  onRebook?: (alternativeId: string) => void;
}

const mockAlternatives: AlternativeFlight[] = [
  {
    id: 'alt-1',
    flightNumber: 'BA119',
    airline: 'British Airways',
    departureTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
    arrivalTime: new Date(Date.now() + 12 * 60 * 60 * 1000),
    price: 0,
    seatsAvailable: 12,
  },
  {
    id: 'alt-2',
    flightNumber: 'VS001',
    airline: 'Virgin Atlantic',
    departureTime: new Date(Date.now() + 6 * 60 * 60 * 1000),
    arrivalTime: new Date(Date.now() + 14 * 60 * 60 * 1000),
    price: 85,
    seatsAvailable: 23,
  },
  {
    id: 'alt-3',
    flightNumber: 'AA107',
    airline: 'American Airlines',
    departureTime: new Date(Date.now() + 8 * 60 * 60 * 1000),
    arrivalTime: new Date(Date.now() + 16 * 60 * 60 * 1000),
    price: 120,
    seatsAvailable: 8,
  },
];

export const DisruptionAlert: React.FC<DisruptionAlertProps> = ({
  flight,
  alternatives = mockAlternatives,
  onRebook,
}) => {
  const [selectedAlt, setSelectedAlt] = useState<string | null>(null);
  const [isRebooking, setIsRebooking] = useState(false);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const handleRebook = async (altId: string) => {
    setSelectedAlt(altId);
    setIsRebooking(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    setIsRebooking(false);
    onRebook?.(altId);
  };

  return (
    <section className={styles.container} data-testid="disruption-alert">
      <div className={styles.alertBanner}>
        <div className={styles.alertIcon}>⚠️</div>
        <div className={styles.alertContent}>
          <h2 className={styles.alertTitle}>Flight Disruption</h2>
          <p className={styles.alertMessage}>
            Your flight {flight.flightNumber} has been{' '}
            {flight.status === 'cancelled' ? 'cancelled' : 'significantly delayed'}.
            We've found {alternatives.length} alternative options for you.
          </p>
        </div>
      </div>

      <div className={styles.originalFlight}>
        <div className={styles.originalHeader}>
          <span className={styles.originalLabel}>Original Flight</span>
          <span className={styles.cancelledBadge}>
            {flight.status === 'cancelled' ? 'Cancelled' : 'Delayed'}
          </span>
        </div>
        <div className={styles.originalDetails}>
          <span className={styles.originalFlight}>{flight.flightNumber}</span>
          <span className={styles.originalRoute}>
            {flight.origin.code} → {flight.destination.code}
          </span>
          <span className={styles.originalTime}>
            {formatTime(flight.scheduledDeparture)}
          </span>
        </div>
      </div>

      <div className={styles.alternativesHeader}>
        <h3 className={styles.alternativesTitle}>One-Tap Rebooking</h3>
        <p className={styles.alternativesSubtitle}>
          Select an alternative to rebook instantly
        </p>
      </div>

      <div className={styles.alternatives}>
        {alternatives.map((alt) => (
          <div
            key={alt.id}
            className={`${styles.alternativeCard} ${
              selectedAlt === alt.id ? styles.selected : ''
            }`}
          >
            <div className={styles.altHeader}>
              <span className={styles.altAirline}>{alt.airline}</span>
              <span className={styles.altFlight}>{alt.flightNumber}</span>
            </div>

            <div className={styles.altTimes}>
              <div className={styles.altTime}>
                <span className={styles.altTimeValue}>
                  {formatTime(alt.departureTime)}
                </span>
                <span className={styles.altTimeLabel}>Depart</span>
              </div>
              <span className={styles.altArrow}>→</span>
              <div className={styles.altTime}>
                <span className={styles.altTimeValue}>
                  {formatTime(alt.arrivalTime)}
                </span>
                <span className={styles.altTimeLabel}>Arrive</span>
              </div>
            </div>

            <div className={styles.altFooter}>
              <div className={styles.altSeats}>
                <span className={styles.seatsIcon}>💺</span>
                {alt.seatsAvailable} seats left
              </div>
              <div className={styles.altPrice}>
                {alt.price === 0 ? (
                  <span className={styles.freeLabel}>No extra cost</span>
                ) : (
                  <span className={styles.priceValue}>+£{alt.price}</span>
                )}
              </div>
            </div>

            <button
              className={styles.rebookButton}
              onClick={() => handleRebook(alt.id)}
              disabled={isRebooking}
            >
              {isRebooking && selectedAlt === alt.id ? (
                <span className={styles.loading}>Rebooking...</span>
              ) : (
                'Rebook Now'
              )}
            </button>
          </div>
        ))}
      </div>

      <div className={styles.helpSection}>
        <button className={styles.helpButton}>
          <span className={styles.helpIcon}>💬</span>
          Speak to an Agent
        </button>
        <button className={styles.helpButton}>
          <span className={styles.helpIcon}>📞</span>
          Call Airline
        </button>
      </div>
    </section>
  );
};

export default DisruptionAlert;

import React from 'react';
import type { DepartureCalculation, Flight } from '../../types';
import { formatTime, formatDuration } from '../../utils/timeCalculations';
import styles from './DepartureAlarm.module.css';

interface DepartureAlarmProps {
  flight: Flight;
  calculation: DepartureCalculation;
  userAddress?: string;
}

export const DepartureAlarm: React.FC<DepartureAlarmProps> = ({
  flight,
  calculation,
  userAddress = 'Your location',
}) => {
  const { leaveTime, breakdown, totalMinutes } = calculation;

  const timelineItems = [
    {
      icon: '🏠',
      label: 'Leave Home',
      time: formatTime(leaveTime),
      duration: `${breakdown.travelTime} mins drive`,
      colour: '#3b82f6',
    },
    {
      icon: '🚗',
      label: 'Arrive at Airport',
      time: formatTime(new Date(leaveTime.getTime() + breakdown.travelTime * 60 * 1000)),
      duration: `${breakdown.securityWaitTime} mins security`,
      colour: '#8b5cf6',
    },
    {
      icon: '🔒',
      label: 'Clear Security',
      time: formatTime(
        new Date(leaveTime.getTime() + (breakdown.travelTime + breakdown.securityWaitTime) * 60 * 1000)
      ),
      duration: `${breakdown.walkingTime} mins walk`,
      colour: '#06b6d4',
    },
    {
      icon: '🚶',
      label: 'Arrive at Gate',
      time: formatTime(
        new Date(
          leaveTime.getTime() +
            (breakdown.travelTime + breakdown.securityWaitTime + breakdown.walkingTime) * 60 * 1000
        )
      ),
      duration: `${breakdown.bufferTime} mins buffer`,
      colour: '#22c55e',
    },
    {
      icon: '✈️',
      label: 'Flight Departs',
      time: formatTime(flight.scheduledDeparture),
      duration: '',
      colour: '#f59e0b',
    },
  ];

  return (
    <section className={styles.container} data-testid="departure-alarm">
      <header className={styles.header}>
        <div className={styles.headerIcon}>⏰</div>
        <div className={styles.headerText}>
          <h2 className={styles.title}>Smart Departure</h2>
          <p className={styles.subtitle}>
            Leave at <strong>{formatTime(leaveTime)}</strong> for your flight
          </p>
        </div>
      </header>

      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Total Journey</span>
          <span className={styles.summaryValue}>{formatDuration(totalMinutes)}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>From</span>
          <span className={styles.summaryValue}>{userAddress}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>To</span>
          <span className={styles.summaryValue}>
            {flight.origin.name} Terminal {flight.terminal}
          </span>
        </div>
      </div>

      <div className={styles.timeline}>
        {timelineItems.map((item, index) => (
          <div key={index} className={styles.timelineItem}>
            <div
              className={styles.timelineDot}
              style={{ backgroundColor: item.colour }}
            >
              <span className={styles.timelineIcon}>{item.icon}</span>
            </div>
            {index < timelineItems.length - 1 && (
              <div className={styles.timelineLine} />
            )}
            <div className={styles.timelineContent}>
              <div className={styles.timelineTime}>{item.time}</div>
              <div className={styles.timelineLabel}>{item.label}</div>
              {item.duration && (
                <div className={styles.timelineDuration}>{item.duration}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.breakdownGrid}>
        <div className={styles.breakdownCard}>
          <span className={styles.breakdownIcon}>🚗</span>
          <span className={styles.breakdownValue}>{breakdown.travelTime}</span>
          <span className={styles.breakdownLabel}>mins drive</span>
        </div>
        <div className={styles.breakdownCard}>
          <span className={styles.breakdownIcon}>🔒</span>
          <span className={styles.breakdownValue}>{breakdown.securityWaitTime}</span>
          <span className={styles.breakdownLabel}>mins security</span>
        </div>
        <div className={styles.breakdownCard}>
          <span className={styles.breakdownIcon}>🚶</span>
          <span className={styles.breakdownValue}>{breakdown.walkingTime}</span>
          <span className={styles.breakdownLabel}>mins walk</span>
        </div>
        <div className={styles.breakdownCard}>
          <span className={styles.breakdownIcon}>⏳</span>
          <span className={styles.breakdownValue}>{breakdown.bufferTime}</span>
          <span className={styles.breakdownLabel}>mins buffer</span>
        </div>
      </div>
    </section>
  );
};

export default DepartureAlarm;

import React from 'react';
import type { FlightStatus } from '../../types';
import { getStatusColour } from '../../utils/statusClassifier';
import styles from './StatusBadge.module.css';

interface StatusBadgeProps {
  status: FlightStatus;
  label?: string;
  size?: 'small' | 'medium' | 'large';
  pulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'medium',
  pulse = false,
}) => {
  const colour = getStatusColour(status);
  const defaultLabels: Record<FlightStatus, string> = {
    GREEN: 'On Time',
    AMBER: 'Minor Delay',
    RED: 'Delayed',
  };

  const displayLabel = label || defaultLabels[status];

  return (
    <span
      className={`${styles.badge} ${styles[size]} ${pulse ? styles.pulse : ''}`}
      style={{ backgroundColor: colour }}
      data-testid="status-badge"
      aria-label={`Status: ${displayLabel}`}
    >
      <span className={styles.dot} style={{ backgroundColor: colour }} />
      {displayLabel}
    </span>
  );
};

export default StatusBadge;

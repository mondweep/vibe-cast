import React from 'react';
import type { ConciergeMessage } from '../../types';
import { StatusBadge } from '../StatusBadge';
import styles from './ConciergeCard.module.css';

interface ConciergeCardProps {
  message: ConciergeMessage;
  onActionClick?: () => void;
}

const typeIcons: Record<ConciergeMessage['type'], string> = {
  greeting: '👋',
  update: '📢',
  alert: '⚠️',
  suggestion: '💡',
};

export const ConciergeCard: React.FC<ConciergeCardProps> = ({
  message,
  onActionClick,
}) => {
  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} mins ago`;

    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <article
      className={`${styles.card} ${styles[message.status.toLowerCase()]}`}
      data-testid="concierge-card"
    >
      <header className={styles.header}>
        <span className={styles.icon}>{typeIcons[message.type]}</span>
        <h3 className={styles.title}>{message.title}</h3>
        <StatusBadge status={message.status} size="small" />
      </header>

      <p className={styles.message}>{message.message}</p>

      <footer className={styles.footer}>
        <time className={styles.timestamp}>{formatTime(message.timestamp)}</time>
        {message.action && (
          <button
            className={styles.actionButton}
            onClick={onActionClick}
            type="button"
          >
            {message.action.label}
          </button>
        )}
      </footer>
    </article>
  );
};

export default ConciergeCard;

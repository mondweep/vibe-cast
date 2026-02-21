import type { StreakData } from '../domain/types.ts';

interface StreakBadgeProps {
  streak: StreakData;
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  return (
    <div className="streak-badge" aria-label={`Current streak: ${streak.currentStreak} days`}>
      <span className="streak-badge__fire" aria-hidden="true">
        {streak.currentStreak > 0 ? '\uD83D\uDD25' : '\u26AA'}
      </span>
      <span className="streak-badge__count">{streak.currentStreak}</span>
    </div>
  );
}

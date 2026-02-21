import { useGamification, DailyProgress } from '../contexts/gamification/index.ts';

export function StatsPage() {
  const { streak, dailySummary } = useGamification();

  return (
    <div className="page stats-page">
      <h2>Practice Stats</h2>

      <div className="stats-page__streak">
        <div className="stats-page__streak-current">
          <span className="stats-page__streak-number">{streak.currentStreak}</span>
          <span className="stats-page__streak-label">Current Streak</span>
        </div>
        <div className="stats-page__streak-best">
          <span className="stats-page__streak-number">{streak.longestStreak}</span>
          <span className="stats-page__streak-label">Best Streak</span>
        </div>
      </div>

      <DailyProgress summary={dailySummary} />
    </div>
  );
}

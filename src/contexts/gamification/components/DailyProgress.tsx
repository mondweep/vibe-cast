interface DailyProgressProps {
  summary: {
    fretboard: number;
    rhythm: number;
    flashcards: number;
    totalMinutes: number;
  };
}

export function DailyProgress({ summary }: DailyProgressProps) {
  return (
    <div className="daily-progress" role="region" aria-label="Today's practice summary">
      <h3 className="daily-progress__title">Today's Practice</h3>
      <div className="daily-progress__stats">
        <div className="daily-progress__stat">
          <span className="daily-progress__label">Fretboard Drills</span>
          <span className="daily-progress__value">{summary.fretboard}</span>
        </div>
        <div className="daily-progress__stat">
          <span className="daily-progress__label">Rhythm Drills</span>
          <span className="daily-progress__value">{summary.rhythm}</span>
        </div>
        <div className="daily-progress__stat">
          <span className="daily-progress__label">Flashcards</span>
          <span className="daily-progress__value">{summary.flashcards}</span>
        </div>
        <div className="daily-progress__stat">
          <span className="daily-progress__label">Total Minutes</span>
          <span className="daily-progress__value">{summary.totalMinutes}</span>
        </div>
      </div>
    </div>
  );
}

import { useFlashcards, FlashcardCard, ConfidenceButtons } from '../contexts/technique-flashcards/index.ts';
import { useGamification } from '../contexts/gamification/index.ts';
import { useCallback } from 'react';
import type { Confidence } from '../contexts/technique-flashcards/domain/types.ts';

export function FlashcardsPage() {
  const { currentCard, isFlipped, dueCount, totalCount, flip, rate } = useFlashcards();
  const { recordDrill } = useGamification();

  const handleRate = useCallback((confidence: Confidence) => {
    rate(confidence);
    recordDrill('flashcards');
  }, [rate, recordDrill]);

  if (!currentCard) {
    return (
      <div className="page flashcards-page">
        <h2>Technique Flashcards</h2>
        <div className="flashcards-page__empty">
          <p>All caught up! No cards due for review.</p>
          <p>Come back tomorrow for your next session.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page flashcards-page">
      <h2>Technique Flashcards</h2>
      <p className="page__subtitle">{dueCount} of {totalCount} cards due</p>

      <FlashcardCard card={currentCard} isFlipped={isFlipped} onFlip={flip} />

      {isFlipped && (
        <ConfidenceButtons onRate={handleRate} disabled={!isFlipped} />
      )}
    </div>
  );
}

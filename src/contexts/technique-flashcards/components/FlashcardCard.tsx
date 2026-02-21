import type { Flashcard } from '../domain/types.ts';

interface FlashcardCardProps {
  card: Flashcard;
  isFlipped: boolean;
  onFlip: () => void;
}

export function FlashcardCard({ card, isFlipped, onFlip }: FlashcardCardProps) {
  return (
    <button
      className={`flashcard ${isFlipped ? 'flashcard--flipped' : ''}`}
      onClick={onFlip}
      aria-label={isFlipped ? 'Showing answer, click to show question' : 'Showing question, click to reveal answer'}
    >
      <div className="flashcard__inner">
        <div className="flashcard__front">
          <span className="flashcard__category">{card.category.replace('_', ' ')}</span>
          <p className="flashcard__question">{card.question}</p>
          <span className="flashcard__hint">Tap to reveal</span>
        </div>
        <div className="flashcard__back">
          <p className="flashcard__answer">{card.answer}</p>
        </div>
      </div>
    </button>
  );
}

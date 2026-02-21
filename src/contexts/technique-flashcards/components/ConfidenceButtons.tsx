import type { Confidence } from '../domain/types.ts';

interface ConfidenceButtonsProps {
  onRate: (confidence: Confidence) => void;
  disabled: boolean;
}

const BUTTONS: { confidence: Confidence; label: string; className: string }[] = [
  { confidence: 'again', label: 'Again', className: 'confidence-btn--again' },
  { confidence: 'hard', label: 'Hard', className: 'confidence-btn--hard' },
  { confidence: 'good', label: 'Good', className: 'confidence-btn--good' },
  { confidence: 'easy', label: 'Easy', className: 'confidence-btn--easy' },
];

export function ConfidenceButtons({ onRate, disabled }: ConfidenceButtonsProps) {
  return (
    <div className="confidence-buttons" role="group" aria-label="Rate your confidence">
      {BUTTONS.map(({ confidence, label, className }) => (
        <button
          key={confidence}
          className={`confidence-btn ${className}`}
          onClick={() => onRate(confidence)}
          disabled={disabled}
          aria-label={`Rate as ${label}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

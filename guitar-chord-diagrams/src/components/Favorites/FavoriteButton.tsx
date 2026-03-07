import type { ChordVoicing } from '../../types';

interface FavoriteButtonProps {
  voicing: ChordVoicing;
  isFavorite: boolean;
  onToggle: (voicing: ChordVoicing) => void;
}

export default function FavoriteButton({ voicing, isFavorite, onToggle }: FavoriteButtonProps) {
  return (
    <button
      onClick={() => onToggle(voicing)}
      className={`p-1 rounded transition-colors ${
        isFavorite
          ? 'text-yellow-500 hover:text-yellow-600'
          : 'text-gray-300 dark:text-gray-600 hover:text-yellow-400'
      }`}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
      </svg>
    </button>
  );
}

import type { ChordVoicing } from '../../types';
import DiagramSVG from './DiagramSVG';
import PlayButton from './PlayButton';
import FavoriteButton from '../Favorites/FavoriteButton';
import { useLazyVisible } from '../../hooks/useLazyVisible';

interface LazyDiagramCardProps {
  voicing: ChordVoicing;
  isFavorite: boolean;
  onToggleFavorite: (v: ChordVoicing) => void;
}

export default function LazyDiagramCard({ voicing, isFavorite, onToggleFavorite }: LazyDiagramCardProps) {
  const [ref, isVisible] = useLazyVisible<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-3 flex flex-col items-center hover:shadow-md transition-shadow min-h-[260px]"
      role="article"
      aria-label={`${voicing.name} chord diagram, ${voicing.category} voicing`}
    >
      {isVisible ? (
        <>
          <div className="self-end">
            <FavoriteButton
              voicing={voicing}
              isFavorite={isFavorite}
              onToggle={onToggleFavorite}
            />
          </div>
          <DiagramSVG voicing={voicing} />
          <PlayButton voicing={voicing} />
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-gray-200 dark:border-gray-600 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

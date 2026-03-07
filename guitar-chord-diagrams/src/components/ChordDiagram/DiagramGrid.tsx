import type { ChordVoicing } from '../../types';
import LazyDiagramCard from './LazyDiagramCard';
import ExportBar from './ExportBar';
import { useState, useRef } from 'react';

interface DiagramGridProps {
  voicings: ChordVoicing[];
  chordName: string;
  isFavorite: (v: ChordVoicing) => boolean;
  onToggleFavorite: (v: ChordVoicing) => void;
}

const CATEGORIES = ['all', 'open', 'barre', 'partial', 'jazz'] as const;
type Category = typeof CATEGORIES[number];

export default function DiagramGrid({ voicings, chordName, isFavorite, onToggleFavorite }: DiagramGridProps) {
  const [filter, setFilter] = useState<Category>('all');
  const gridRef = useRef<HTMLDivElement>(null);

  const filtered = filter === 'all'
    ? voicings
    : voicings.filter(v => v.category === filter);

  const categoryCounts = {
    all: voicings.length,
    open: voicings.filter(v => v.category === 'open').length,
    barre: voicings.filter(v => v.category === 'barre').length,
    partial: voicings.filter(v => v.category === 'partial').length,
    jazz: voicings.filter(v => v.category === 'jazz').length,
  };

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === cat
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            } ${categoryCounts[cat] === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
            disabled={categoryCounts[cat] === 0}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
            <span className="ml-1 text-xs opacity-75">({categoryCounts[cat]})</span>
          </button>
        ))}
      </div>

      {/* Export bar */}
      <ExportBar chordName={chordName} gridRef={gridRef} />

      {/* Diagram grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          <p className="text-lg">No {filter} voicings found for {chordName}</p>
        </div>
      ) : (
        <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4" role="list" aria-label={`${chordName} chord voicings`}>
          {filtered.map((voicing, idx) => (
            <LazyDiagramCard
              key={idx}
              voicing={voicing}
              isFavorite={isFavorite(voicing)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
}

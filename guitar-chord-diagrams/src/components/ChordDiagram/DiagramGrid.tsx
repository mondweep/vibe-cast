import type { ChordVoicing } from '../../types';
import DiagramSVG from './DiagramSVG';
import PlayButton from './PlayButton';
import { useState } from 'react';

interface DiagramGridProps {
  voicings: ChordVoicing[];
  chordName: string;
}

const CATEGORIES = ['all', 'open', 'barre', 'partial', 'jazz'] as const;
type Category = typeof CATEGORIES[number];

export default function DiagramGrid({ voicings, chordName }: DiagramGridProps) {
  const [filter, setFilter] = useState<Category>('all');

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
      <div className="flex gap-2 mb-6 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === cat
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            } ${categoryCounts[cat] === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
            disabled={categoryCounts[cat] === 0}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
            <span className="ml-1 text-xs opacity-75">({categoryCounts[cat]})</span>
          </button>
        ))}
      </div>

      {/* Diagram grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">No {filter} voicings found for {chordName}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map((voicing, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex flex-col items-center hover:shadow-md transition-shadow"
            >
              <DiagramSVG voicing={voicing} />
              <PlayButton voicing={voicing} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

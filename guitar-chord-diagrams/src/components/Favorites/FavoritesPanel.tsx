import type { ChordVoicing } from '../../types';
import DiagramSVG from '../ChordDiagram/DiagramSVG';
import PlayButton from '../ChordDiagram/PlayButton';
import FavoriteButton from './FavoriteButton';
import { useRef } from 'react';

interface FavoritesPanelProps {
  favorites: ChordVoicing[];
  onToggle: (voicing: ChordVoicing) => void;
  onClear: () => void;
  onExport: () => string;
  onImport: (json: string) => void;
}

export default function FavoritesPanel({ favorites, onToggle, onClear, onExport, onImport }: FavoritesPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const json = onExport();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chordlab-favorites.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onImport(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  if (favorites.length === 0) {
    return (
      <div className="text-center py-12">
        <svg viewBox="0 0 24 24" className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" strokeWidth={1}>
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
        <p className="text-gray-400 dark:text-gray-500">No favorites yet. Star a voicing to save it here.</p>
        <button
          onClick={handleImport}
          className="mt-4 text-sm text-indigo-500 hover:text-indigo-600 underline"
        >
          Import favorites
        </button>
        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Favorites ({favorites.length})
        </h3>
        <div className="flex gap-2">
          <button onClick={handleImport} className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            Import
          </button>
          <button onClick={handleExport} className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            Export
          </button>
          <button onClick={onClear} className="text-xs px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">
            Clear All
          </button>
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {favorites.map((voicing, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-3 flex flex-col items-center hover:shadow-md transition-shadow"
          >
            <div className="self-end">
              <FavoriteButton voicing={voicing} isFavorite={true} onToggle={onToggle} />
            </div>
            <DiagramSVG voicing={voicing} />
            <PlayButton voicing={voicing} />
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState, useCallback, useEffect } from 'react';
import type { ChordVoicing } from '../types';

const STORAGE_KEY = 'chordlab-favorites';

function voicingKey(v: ChordVoicing): string {
  return `${v.name}:${v.strings.map(f => f ?? 'x').join('-')}`;
}

function loadFavorites(): ChordVoicing[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ChordVoicing[];
  } catch {
    return [];
  }
}

function saveFavorites(favs: ChordVoicing[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<ChordVoicing[]>(loadFavorites);

  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  const isFavorite = useCallback(
    (voicing: ChordVoicing) => {
      const key = voicingKey(voicing);
      return favorites.some(f => voicingKey(f) === key);
    },
    [favorites],
  );

  const toggleFavorite = useCallback(
    (voicing: ChordVoicing) => {
      const key = voicingKey(voicing);
      setFavorites(prev => {
        const exists = prev.some(f => voicingKey(f) === key);
        if (exists) {
          return prev.filter(f => voicingKey(f) !== key);
        }
        return [...prev, voicing];
      });
    },
    [],
  );

  const clearFavorites = useCallback(() => {
    setFavorites([]);
  }, []);

  const exportFavorites = useCallback((): string => {
    return JSON.stringify(favorites, null, 2);
  }, [favorites]);

  const importFavorites = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json) as ChordVoicing[];
      if (!Array.isArray(parsed)) return;
      setFavorites(parsed);
    } catch {
      // ignore invalid JSON
    }
  }, []);

  return { favorites, isFavorite, toggleFavorite, clearFavorites, exportFavorites, importFavorites };
}

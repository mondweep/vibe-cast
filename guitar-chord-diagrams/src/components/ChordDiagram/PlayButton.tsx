import { useState, useCallback } from 'react';
import type { ChordVoicing } from '../../types';
import { playVoicing } from '../../audio/synthesizer';

interface PlayButtonProps {
  voicing: ChordVoicing;
}

export default function PlayButton({ voicing }: PlayButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = useCallback(() => {
    if (isPlaying) return;
    setIsPlaying(true);
    playVoicing(voicing);
    // Reset after the strum + sustain duration
    setTimeout(() => setIsPlaying(false), 2500);
  }, [voicing, isPlaying]);

  return (
    <button
      onClick={handlePlay}
      className={`mt-1 flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
        isPlaying
          ? 'bg-indigo-100 text-indigo-600'
          : 'bg-gray-50 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'
      }`}
      disabled={isPlaying}
    >
      {isPlaying ? (
        <>
          <svg viewBox="0 0 24 24" className="w-3 h-3 animate-pulse" fill="currentColor">
            <rect x="4" y="4" width="6" height="16" rx="1" />
            <rect x="14" y="4" width="6" height="16" rx="1" />
          </svg>
          Playing
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          Play
        </>
      )}
    </button>
  );
}

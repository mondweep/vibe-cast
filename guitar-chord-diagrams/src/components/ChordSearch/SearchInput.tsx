import { useState, useRef, useEffect } from 'react';
import { parseChordName, getAllChordNames } from '../../data/chordDefinitions';
import type { ParsedChord } from '../../types';

interface SearchInputProps {
  onChordSelect: (chord: ParsedChord) => void;
}

export default function SearchInput({ onChordSelect }: SearchInputProps) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const allChords = useRef(getAllChordNames());

  useEffect(() => {
    if (input.length > 0) {
      const matches = allChords.current
        .filter(name => name.toLowerCase().startsWith(input.toLowerCase()))
        .slice(0, 8);
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
    setError('');
  }, [input]);

  function handleSubmit(value: string = input) {
    const parsed = parseChordName(value);
    if (parsed) {
      onChordSelect(parsed);
      setError('');
      setShowSuggestions(false);
    } else {
      setError(`"${value}" is not a recognized chord`);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }

  return (
    <div className="relative w-full max-w-md">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => input && setSuggestions(s => { setShowSuggestions(s.length > 0); return s; })}
          placeholder="Type a chord... (e.g., Am7, F#dim, Cmaj7)"
          className="flex-1 px-4 py-3 text-lg border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors bg-white dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
          autoComplete="off"
          spellCheck={false}
          aria-label="Search for a chord"
        />
        <button
          onClick={() => handleSubmit()}
          className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Search
        </button>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}

      {showSuggestions && (
        <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-auto">
          {suggestions.map((name, i) => (
            <li key={i}>
              <button
                className="w-full text-left px-4 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors first:rounded-t-xl last:rounded-b-xl"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setInput(name);
                  handleSubmit(name);
                }}
              >
                <span className="font-semibold text-indigo-700">{name.substring(0, input.length)}</span>
                <span className="text-gray-600 dark:text-gray-400">{name.substring(input.length)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

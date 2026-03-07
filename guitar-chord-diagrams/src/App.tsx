import { useState } from 'react';
import type { ParsedChord } from './types';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import SearchInput from './components/ChordSearch/SearchInput';
import ChordName from './components/ChordDisplay/ChordName';
import NoteList from './components/ChordDisplay/NoteList';
import DiagramGrid from './components/ChordDiagram/DiagramGrid';
import { useChordLookup } from './hooks/useChordLookup';
import { parseChordName } from './data/chordDefinitions';
import './App.css';

function App() {
  const [selectedChord, setSelectedChord] = useState<ParsedChord | null>(null);
  const { voicings, chordNotes } = useChordLookup(selectedChord);

  function handleQuickSelect(name: string) {
    const parsed = parseChordName(name);
    if (parsed) setSelectedChord(parsed);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {/* Search section */}
        <div className="flex justify-center mb-8">
          <SearchInput onChordSelect={setSelectedChord} />
        </div>

        {/* Chord info */}
        {selectedChord && (
          <div className="mb-8">
            <ChordName name={selectedChord.displayName} root={selectedChord.root} />
            <NoteList notes={chordNotes} root={selectedChord.root} />
            <p className="text-center text-sm text-gray-400 mt-2">
              {voicings.length} voicing{voicings.length !== 1 ? 's' : ''} found
            </p>
          </div>
        )}

        {/* Diagram grid */}
        {selectedChord && voicings.length > 0 && (
          <DiagramGrid voicings={voicings} chordName={selectedChord.displayName} />
        )}

        {/* Empty state */}
        {!selectedChord && (
          <div className="text-center py-20">
            <svg viewBox="0 0 24 24" className="w-20 h-20 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" strokeWidth={1}>
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            <h2 className="text-2xl font-semibold text-gray-300 mb-2">Search for a chord</h2>
            <p className="text-gray-400 max-w-md mx-auto">
              Type a chord name like <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">Am7</span>,{' '}
              <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">G</span>, or{' '}
              <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">F#dim</span> to see all possible voicings.
            </p>

            {/* Quick access chord buttons */}
            <div className="mt-8 flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
              {['C', 'D', 'E', 'G', 'A', 'Am', 'Em', 'Dm', 'F', 'B7', 'Am7', 'Cmaj7'].map(name => (
                <button
                  key={name}
                  onClick={() => handleQuickSelect(name)}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-colors"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;

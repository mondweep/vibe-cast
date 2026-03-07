import { useState } from 'react';
import type { ParsedChord } from './types';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import AudioInputPanel from './components/AudioInput/AudioInputPanel';
import SearchInput from './components/ChordSearch/SearchInput';
import ChordName from './components/ChordDisplay/ChordName';
import NoteList from './components/ChordDisplay/NoteList';
import DiagramGrid from './components/ChordDiagram/DiagramGrid';
import { useChordLookup } from './hooks/useChordLookup';
import { parseChordName } from './data/chordDefinitions';
import './App.css';

type InputSource = 'search' | 'audio';

function App() {
  const [selectedChord, setSelectedChord] = useState<ParsedChord | null>(null);
  const [inputSource, setInputSource] = useState<InputSource>('search');
  const { voicings, chordNotes } = useChordLookup(selectedChord);

  function handleSearchSelect(chord: ParsedChord) {
    setSelectedChord(chord);
    setInputSource('search');
  }

  function handleAudioDetected(chord: ParsedChord) {
    setSelectedChord(chord);
    setInputSource('audio');
  }

  function handleQuickSelect(name: string) {
    const parsed = parseChordName(name);
    if (parsed) {
      setSelectedChord(parsed);
      setInputSource('search');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {/* Audio input panel */}
        <AudioInputPanel onChordDetected={handleAudioDetected} />

        {/* Search section */}
        <div className="flex justify-center mb-8">
          <SearchInput onChordSelect={handleSearchSelect} />
        </div>

        {/* Chord info */}
        {selectedChord && (
          <div className="mb-8">
            <ChordName name={selectedChord.displayName} root={selectedChord.root} />
            <NoteList notes={chordNotes} root={selectedChord.root} />
            <p className="text-center text-sm text-gray-400 mt-2">
              {voicings.length} voicing{voicings.length !== 1 ? 's' : ''} found
              {inputSource === 'audio' && (
                <span className="ml-2 inline-flex items-center gap-1 text-indigo-500">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  </svg>
                  detected from audio
                </span>
              )}
            </p>
          </div>
        )}

        {/* Diagram grid */}
        {selectedChord && voicings.length > 0 && (
          <DiagramGrid voicings={voicings} chordName={selectedChord.displayName} />
        )}

        {/* Empty state */}
        {!selectedChord && (
          <div className="text-center py-12">
            <svg viewBox="0 0 24 24" className="w-20 h-20 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" strokeWidth={1}>
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            <h2 className="text-2xl font-semibold text-gray-300 mb-2">Search or play a chord</h2>
            <p className="text-gray-400 max-w-md mx-auto">
              Type a chord name like <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">Am7</span>,{' '}
              <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">G</span>, or{' '}
              <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">F#dim</span> — or use the microphone to detect chords from audio.
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

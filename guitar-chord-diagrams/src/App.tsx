import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { ParsedChord, Tuning } from './types';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import AudioInputPanel from './components/AudioInput/AudioInputPanel';
import SearchInput from './components/ChordSearch/SearchInput';
import TuningSelector from './components/ChordSearch/TuningSelector';
import ChordName from './components/ChordDisplay/ChordName';
import NoteList from './components/ChordDisplay/NoteList';
import DiagramGrid from './components/ChordDiagram/DiagramGrid';
import ProgressionPanel from './components/Progression/ProgressionPanel';
import type { ProgressionEntry } from './components/Progression/ProgressionPanel';
import FavoritesPanel from './components/Favorites/FavoritesPanel';
import AuthModal from './components/Auth/AuthModal';
import SessionHistoryPanel from './components/SessionHistory/SessionHistoryPanel';
import AboutPanel from './components/About/AboutPanel';
import { useChordLookup } from './hooks/useChordLookup';
import { useFavorites } from './hooks/useFavorites';
import { useDarkMode } from './hooks/useDarkMode';
import { useAuth } from './hooks/useAuth';
import { useSessionCapture } from './hooks/useSessionCapture';
import { parseChordName } from './data/chordDefinitions';
import { STANDARD_TUNING, getTuningNotes } from './data/tunings';
import './App.css';

type InputSource = 'search' | 'audio';
type Tab = 'diagrams' | 'favorites' | 'history' | 'about';

function App() {
  const [selectedChord, setSelectedChord] = useState<ParsedChord | null>(null);
  const [inputSource, setInputSource] = useState<InputSource>('search');
  const [tuning, setTuning] = useState<Tuning>(STANDARD_TUNING);
  const [tab, setTab] = useState<Tab>('diagrams');
  const [progression, setProgression] = useState<ProgressionEntry[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const progressionStart = useRef<number>(Date.now());
  const lastChordTime = useRef<number>(Date.now());

  const { theme, toggleTheme } = useDarkMode();
  const { favorites, isFavorite, toggleFavorite, clearFavorites, exportFavorites, importFavorites } = useFavorites();
  const auth = useAuth();
  const { recordChord } = useSessionCapture(
    auth.user?.id ?? null,
    tuning.name,
  );

  const tuningNotes = useMemo(() => getTuningNotes(tuning), [tuning]);
  const { voicings, chordNotes } = useChordLookup(selectedChord, tuningNotes);

  // Load chord from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const chordParam = params.get('chord');
    if (chordParam) {
      const parsed = parseChordName(chordParam);
      if (parsed) {
        setSelectedChord(parsed);
        setInputSource('search');
      }
    }
    progressionStart.current = Date.now();
    lastChordTime.current = Date.now();
  }, []);

  const addToProgression = useCallback((chord: ParsedChord) => {
    const now = Date.now();
    setProgression(prev => {
      const updated = [...prev];
      if (updated.length > 0) {
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          duration: now - lastChordTime.current,
        };
      }
      lastChordTime.current = now;
      return [...updated, {
        chord,
        timestamp: now - progressionStart.current,
        duration: 0,
      }];
    });
  }, []);

  function handleSearchSelect(chord: ParsedChord) {
    setSelectedChord(chord);
    setInputSource('search');
    setTab('diagrams');
    recordChord(chord, 'search');
  }

  function handleAudioDetected(chord: ParsedChord) {
    setSelectedChord(chord);
    setInputSource('audio');
    setTab('diagrams');
    addToProgression(chord);
    recordChord(chord, 'audio');
  }

  function handleQuickSelect(name: string) {
    const parsed = parseChordName(name);
    if (parsed) {
      setSelectedChord(parsed);
      setInputSource('search');
      setTab('diagrams');
      recordChord(parsed, 'search');
    }
  }

  function handleProgressionSelect(chord: ParsedChord) {
    setSelectedChord(chord);
    setInputSource('search');
    setTab('diagrams');
  }

  function handleClearProgression() {
    setProgression([]);
    progressionStart.current = Date.now();
    lastChordTime.current = Date.now();
  }

  function handleViewHistory() {
    setTab('history');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors">
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        user={auth.user}
        isConfigured={auth.isConfigured}
        onSignInClick={() => setShowAuthModal(true)}
        onSignOut={auth.signOut}
        onViewHistory={handleViewHistory}
        onAboutClick={() => setTab('about')}
      />

      {/* Auth modal */}
      {showAuthModal && (
        <AuthModal
          onSignIn={async (email, password) => {
            await auth.signIn(email, password);
            if (!auth.error) setShowAuthModal(false);
          }}
          onSignUp={async (email, password, displayName) => {
            await auth.signUp(email, password, displayName);
            if (!auth.error) setShowAuthModal(false);
          }}
          onClose={() => { setShowAuthModal(false); auth.clearError(); }}
          error={auth.error}
          loading={auth.loading}
        />
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {/* Audio input panel */}
        <AudioInputPanel onChordDetected={handleAudioDetected} />

        {/* Progression tracker */}
        <ProgressionPanel
          entries={progression}
          onSelect={handleProgressionSelect}
          onClear={handleClearProgression}
        />

        {/* Search section */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <SearchInput onChordSelect={handleSearchSelect} />
          <TuningSelector currentTuning={tuning} onTuningChange={setTuning} />
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 justify-center mb-6">
          <button
            onClick={() => setTab('diagrams')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'diagrams'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Diagrams
          </button>
          <button
            onClick={() => setTab('favorites')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'favorites'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Favorites
            {favorites.length > 0 && (
              <span className="ml-1.5 text-xs bg-yellow-400 text-yellow-900 rounded-full px-1.5 py-0.5">
                {favorites.length}
              </span>
            )}
          </button>
          {auth.isAuthenticated && (
            <button
              onClick={() => setTab('history')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === 'history'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              History
            </button>
          )}
          <button
            onClick={() => setTab('about')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'about'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            About
          </button>
        </div>

        {/* Diagrams tab */}
        {tab === 'diagrams' && (
          <>
            {selectedChord && (
              <div className="mb-8">
                <ChordName name={selectedChord.displayName} root={selectedChord.root} />
                <NoteList notes={chordNotes} root={selectedChord.root} />
                <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-2">
                  {voicings.length} voicing{voicings.length !== 1 ? 's' : ''} found
                  {tuning.name !== 'Standard' && (
                    <span className="ml-1">in {tuning.name} tuning</span>
                  )}
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

            {selectedChord && voicings.length > 0 && (
              <DiagramGrid
                voicings={voicings}
                chordName={selectedChord.displayName}
                isFavorite={isFavorite}
                onToggleFavorite={toggleFavorite}
              />
            )}

            {!selectedChord && (
              <div className="text-center py-12">
                <svg viewBox="0 0 24 24" className="w-20 h-20 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" strokeWidth={1}>
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
                <h2 className="text-2xl font-semibold text-gray-300 dark:text-gray-600 mb-2">Search or play a chord</h2>
                <p className="text-gray-400 dark:text-gray-500 max-w-md mx-auto">
                  Type a chord name like <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">Am7</span>,{' '}
                  <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">G</span>, or{' '}
                  <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">F#dim</span> — or use the microphone to detect chords from audio.
                </p>

                {/* Quick access chord buttons */}
                <div className="mt-8 flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
                  {['C', 'D', 'E', 'G', 'A', 'Am', 'Em', 'Dm', 'F', 'B7', 'Am7', 'Cmaj7'].map(name => (
                    <button
                      key={name}
                      onClick={() => handleQuickSelect(name)}
                      className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-200 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      {name}
                    </button>
                  ))}
                </div>

                {/* Sign in prompt for non-authenticated users */}
                {auth.isConfigured && !auth.isAuthenticated && (
                  <div className="mt-8 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl max-w-md mx-auto">
                    <p className="text-sm text-indigo-700 dark:text-indigo-300 mb-2">
                      Sign in to save your practice sessions and track progress over time.
                    </p>
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className="text-sm px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Sign In / Sign Up
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Favorites tab */}
        {tab === 'favorites' && (
          <FavoritesPanel
            favorites={favorites}
            onToggle={toggleFavorite}
            onClear={clearFavorites}
            onExport={exportFavorites}
            onImport={importFavorites}
          />
        )}

        {/* History tab */}
        {tab === 'history' && auth.user && (
          <SessionHistoryPanel userId={auth.user.id} />
        )}

        {/* About tab */}
        {tab === 'about' && <AboutPanel />}
      </main>

      <Footer />
    </div>
  );
}

export default App;

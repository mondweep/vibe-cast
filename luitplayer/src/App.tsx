import { useState, useCallback, useEffect, useRef } from 'react';
import { AudioEngine, createAudioEngine } from '@domains/audio-engine';
import {
  PianoKeyboard,
  PDFViewer,
  MixerConsole,
  TransportControls,
  type RehearsalMark,
} from '@domains/ui-presentation';

/**
 * LuitPlayer Main Application
 * Score-to-Audio WASM App with Tri-Worker Architecture
 *
 * Features:
 * - PDF score rendering
 * - AudioWorklet synthesis
 * - Mixer console with per-instrument controls
 * - Transport controls with looping
 * - Follow-along cursor
 */
function App() {
  const [audioEngine, setAudioEngine] = useState<AudioEngine | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.7);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMeasure, setCurrentMeasure] = useState(1);
  const [tempo, setTempo] = useState(113);
  const [activeTab, setActiveTab] = useState<'score' | 'piano'>('piano');
  const [pdfUrl, setPdfUrl] = useState<string | undefined>(undefined);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sample rehearsal marks for demo
  const rehearsalMarks: RehearsalMark[] = [
    { label: 'A1', measureNumber: 1 },
    { label: 'A2', measureNumber: 9 },
    { label: 'S1', measureNumber: 17 },
    { label: 'M1', measureNumber: 33 },
    { label: 'S2', measureNumber: 49 },
    { label: 'Outro', measureNumber: 65 },
  ];

  // Initialize audio engine on user interaction
  const handleInitialize = useCallback(async () => {
    if (audioEngine?.ready) return;

    setIsInitializing(true);
    setError(null);

    try {
      const engine = createAudioEngine();
      await engine.initialize();
      setAudioEngine(engine);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize audio');
    } finally {
      setIsInitializing(false);
    }
  }, [audioEngine]);

  // Handle volume changes
  const handleVolumeChange = useCallback(
    (newVolume: number) => {
      setVolume(newVolume);
      audioEngine?.setVolume(newVolume);
    },
    [audioEngine]
  );

  // Handle tempo changes
  const handleTempoChange = useCallback(
    (newTempo: number) => {
      setTempo(newTempo);
      audioEngine?.setTempo(newTempo);
    },
    [audioEngine]
  );

  // Playback controls
  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    setCurrentMeasure(1);
  }, []);

  const handleSeek = useCallback((measure: number) => {
    setCurrentMeasure(measure);
  }, []);

  const handleJumpToMark = useCallback((mark: RehearsalMark) => {
    setCurrentMeasure(mark.measureNumber);
  }, []);

  // Handle PDF file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      setActiveTab('score');
    }
  }, []);

  // Simulate playback progression
  useEffect(() => {
    if (!isPlaying) return;

    const playClick = () => {
      if (audioEngine?.ready) {
        // Play a metronome click (High Woodblock - MIDI 77)
        audioEngine.noteOn(77, 80);
        setTimeout(() => audioEngine.noteOff(77), 100);
      }
    };

    // Click on beat 1 immediately
    playClick();

    const interval = setInterval(() => {
      playClick();
      setCurrentMeasure((m) => {
        if (m >= 80) {
          setIsPlaying(false);
          return 1;
        }
        return m + 1;
      });
    }, (60 / tempo) * 4 * 1000); // 4 beats per measure

    return () => clearInterval(interval);
  }, [isPlaying, tempo, audioEngine]);

  // Cleanup audio engine
  useEffect(() => {
    return () => {
      audioEngine?.dispose();
    };
  }, [audioEngine]);

  // Cleanup PDF URL
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.title}>LuitPlayer</h1>
            <p style={styles.subtitle}>Score-to-Audio WASM App</p>
          </div>

          {audioEngine?.ready && (
            <div style={styles.headerControls}>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={styles.uploadButton}
              >
                Load PDF Score
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </div>
          )}
        </div>
      </header>

      <main style={styles.main}>
        {!audioEngine?.ready ? (
          <div style={styles.initSection}>
            <div style={styles.initCard}>
              <h2 style={styles.initTitle}>Welcome to LuitPlayer</h2>
              <p style={styles.description}>
                A high-performance web application for digitizing PDF musical scores
                with interactive, real-time playback.
              </p>

              <button
                style={styles.initButton}
                onClick={handleInitialize}
                disabled={isInitializing}
              >
                {isInitializing ? 'Initializing...' : 'Start Audio Engine'}
              </button>

              {error && <p style={styles.error}>{error}</p>}

              <div style={styles.features}>
                <h4>Features:</h4>
                <ul>
                  <li>PDF score rendering with follow-along cursor</li>
                  <li>Low-latency AudioWorklet synthesis</li>
                  <li>Per-instrument mixer controls</li>
                  <li>Tempo scaling & looping</li>
                  <li>PWA offline support</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div style={styles.playerLayout}>
            {/* Left panel: Score or Piano */}
            <div style={styles.mainPanel}>
              <div style={styles.tabs}>
                <button
                  onClick={() => setActiveTab('score')}
                  style={{
                    ...styles.tab,
                    ...(activeTab === 'score' ? styles.activeTab : {}),
                  }}
                >
                  Score Viewer
                </button>
                <button
                  onClick={() => setActiveTab('piano')}
                  style={{
                    ...styles.tab,
                    ...(activeTab === 'piano' ? styles.activeTab : {}),
                  }}
                >
                  Piano Keyboard
                </button>
              </div>

              <div style={styles.tabContent}>
                {activeTab === 'score' ? (
                  <PDFViewer
                    pdfUrl={pdfUrl}
                    currentMeasure={currentMeasure}
                    isPlaying={isPlaying}
                  />
                ) : (
                  <div style={styles.pianoContainer}>
                    <PianoKeyboard audioEngine={audioEngine} octave={4} />
                    <p style={styles.pianoHelp}>
                      Use keyboard keys A-J (white) and W-U (black) to play
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right panel: Controls */}
            <div style={styles.controlPanel}>
              <div style={styles.status}>
                <span style={styles.statusDot} />
                Audio Engine Ready
              </div>

              <TransportControls
                isPlaying={isPlaying}
                currentMeasure={currentMeasure}
                totalMeasures={80}
                tempo={tempo}
                rehearsalMarks={rehearsalMarks}
                onPlay={handlePlay}
                onPause={handlePause}
                onStop={handleStop}
                onTempoChange={handleTempoChange}
                onSeek={handleSeek}
                onJumpToMark={handleJumpToMark}
              />

              <MixerConsole
                masterVolume={volume}
                onMasterVolumeChange={handleVolumeChange}
              />
            </div>
          </div>
        )}
      </main>

      <footer style={styles.footer}>
        <p>Built with Claude Flow V3 - 7 Agent Hierarchical Mesh</p>
        <p style={styles.footerSub}>DDD | ADR | TDD | WASM</p>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#0f0f1a',
    color: '#eaeaea',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    padding: '20px',
    borderBottom: '1px solid #2a2a3e',
    backgroundColor: '#1a1a2e',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1600px',
    margin: '0 auto',
  },
  title: {
    fontSize: '2rem',
    margin: 0,
    background: 'linear-gradient(135deg, #e94560, #0f3460)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: '#666',
    marginTop: '4px',
  },
  headerControls: {
    display: 'flex',
    gap: '12px',
  },
  uploadButton: {
    padding: '10px 20px',
    backgroundColor: '#3a3a5e',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  main: {
    flex: 1,
    display: 'flex',
    padding: '20px',
    overflow: 'hidden',
  },
  initSection: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initCard: {
    backgroundColor: '#1a1a2e',
    padding: '40px',
    borderRadius: '16px',
    maxWidth: '500px',
    textAlign: 'center',
  },
  initTitle: {
    fontSize: '1.8rem',
    marginBottom: '16px',
    color: '#e94560',
  },
  description: {
    color: '#aaa',
    lineHeight: 1.6,
    marginBottom: '30px',
  },
  initButton: {
    padding: '16px 48px',
    fontSize: '1.2rem',
    backgroundColor: '#e94560',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  error: {
    color: '#e94560',
    marginTop: '20px',
  },
  features: {
    marginTop: '30px',
    textAlign: 'left',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: '20px',
    borderRadius: '8px',
  },
  playerLayout: {
    flex: 1,
    display: 'flex',
    gap: '20px',
    maxWidth: '1600px',
    margin: '0 auto',
    width: '100%',
  },
  mainPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#1a1a2e',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #2a2a3e',
  },
  tab: {
    flex: 1,
    padding: '12px',
    backgroundColor: 'transparent',
    color: '#888',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  activeTab: {
    backgroundColor: '#2a2a3e',
    color: '#e94560',
    borderBottom: '2px solid #e94560',
  },
  tabContent: {
    flex: 1,
    overflow: 'hidden',
  },
  pianoContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: '20px',
    gap: '20px',
  },
  pianoHelp: {
    color: '#666',
    fontSize: '14px',
  },
  controlPanel: {
    width: '380px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
    borderRadius: '8px',
    color: '#2ecc71',
    fontSize: '14px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    backgroundColor: '#2ecc71',
    borderRadius: '50%',
  },
  footer: {
    padding: '16px',
    textAlign: 'center',
    borderTop: '1px solid #2a2a3e',
    color: '#555',
    fontSize: '13px',
  },
  footerSub: {
    fontSize: '11px',
    color: '#444',
    marginTop: '4px',
  },
};

export default App;

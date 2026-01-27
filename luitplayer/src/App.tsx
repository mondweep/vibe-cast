import { useState, useCallback, useEffect } from 'react';
import { AudioEngine, createAudioEngine } from '@domains/audio-engine';
import { PianoKeyboard } from '@domains/ui-presentation';

/**
 * LuitPlayer Main Application
 * Phase 1: WASM "Glue" Proof of Concept
 *
 * Demonstrates:
 * - AudioWorklet initialization
 * - Sine wave synthesis
 * - React + TypeScript integration
 */
function App() {
  const [audioEngine, setAudioEngine] = useState<AudioEngine | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.7);

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
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = parseFloat(e.target.value);
      setVolume(newVolume);
      audioEngine?.setVolume(newVolume);
    },
    [audioEngine]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioEngine?.dispose();
    };
  }, [audioEngine]);

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.title}>LuitPlayer</h1>
        <p style={styles.subtitle}>Score-to-Audio WASM App</p>
      </header>

      <main style={styles.main}>
        {!audioEngine?.ready ? (
          <div style={styles.initSection}>
            <p style={styles.description}>
              Click the button below to initialize the audio engine.
              <br />
              This is required due to browser autoplay policies.
            </p>

            <button
              style={styles.initButton}
              onClick={handleInitialize}
              disabled={isInitializing}
            >
              {isInitializing ? 'Initializing...' : 'Start Audio Engine'}
            </button>

            {error && <p style={styles.error}>{error}</p>}
          </div>
        ) : (
          <div style={styles.playerSection}>
            <div style={styles.status}>
              <span style={styles.statusDot} />
              Audio Engine Ready
            </div>

            <div style={styles.controls}>
              <label style={styles.volumeLabel}>
                Volume: {Math.round(volume * 100)}%
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  style={styles.volumeSlider}
                />
              </label>
            </div>

            <PianoKeyboard audioEngine={audioEngine} octave={4} />

            <div style={styles.info}>
              <h3>Phase 1: WASM Glue Complete</h3>
              <ul>
                <li>Vite + React + TypeScript project</li>
                <li>AudioWorklet with sine wave synthesis</li>
                <li>SharedArrayBuffer infrastructure ready</li>
                <li>Web Worker setup prepared</li>
              </ul>
            </div>
          </div>
        )}
      </main>

      <footer style={styles.footer}>
        <p>Built with Claude Flow V3 - 7 Agent Hierarchical Mesh</p>
        <p style={styles.footerSub}>
          DDD | ADR | TDD | WASM
        </p>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#1a1a2e',
    color: '#eaeaea',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    padding: '40px 20px',
    textAlign: 'center',
    borderBottom: '1px solid #333',
  },
  title: {
    fontSize: '3rem',
    margin: 0,
    background: 'linear-gradient(135deg, #e94560, #0f3460)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  subtitle: {
    fontSize: '1.2rem',
    color: '#888',
    marginTop: '10px',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
  },
  initSection: {
    textAlign: 'center',
    maxWidth: '400px',
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
  playerSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '30px',
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
    borderRadius: '20px',
    color: '#2ecc71',
  },
  statusDot: {
    width: '10px',
    height: '10px',
    backgroundColor: '#2ecc71',
    borderRadius: '50%',
    animation: 'pulse 2s infinite',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  volumeLabel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    color: '#aaa',
  },
  volumeSlider: {
    width: '200px',
    cursor: 'pointer',
  },
  info: {
    marginTop: '40px',
    padding: '20px 30px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    maxWidth: '400px',
  },
  footer: {
    padding: '20px',
    textAlign: 'center',
    borderTop: '1px solid #333',
    color: '#666',
  },
  footerSub: {
    fontSize: '0.9rem',
    color: '#555',
    marginTop: '5px',
  },
};

export default App;

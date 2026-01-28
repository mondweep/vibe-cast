import { useState, useCallback, useEffect, useRef } from 'react';
import { AudioEngine, createAudioEngine } from '@domains/audio-engine';
import { AudioSequencer, createAudioSequencer } from '@domains/audio-engine/services/audio-sequencer';
import { PDFProcessor } from '@domains/pdf-processing';
import OMRWorker from '@infrastructure/workers/omr.worker?worker';
import type { ScoreIR, StaffIR } from '@domains/shared-kernel/types';
import {
  PianoKeyboard,
  PDFViewer,
  MixerConsole,
  TransportControls,
  ScoreInspector,
  type RehearsalMark,
} from '@domains/ui-presentation';

/**
 * LuitPlayer Main Application
 * Score-to-Audio WASM App with Tri-Worker Architecture
 */
function App() {
  const [audioEngine, setAudioEngine] = useState<AudioEngine | null>(null);
  const [sequencer, setSequencer] = useState<AudioSequencer | null>(null);
  const [omrWorker, setOmrWorker] = useState<Worker | null>(null);
  const [pdfProcessor] = useState(() => new PDFProcessor());

  const [isInitializing, setIsInitializing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [volume, setVolume] = useState(0.7);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMetronomeEnabled, setIsMetronomeEnabled] = useState(false);
  const [currentMeasure, setCurrentMeasure] = useState(1);
  const [tempo, setTempo] = useState(113);
  const [activeTab, setActiveTab] = useState<'score' | 'piano'>('piano');
  const [pdfUrl, setPdfUrl] = useState<string | undefined>(undefined);
  const [scoreIR, setScoreIR] = useState<ScoreIR | null>(null);
  const [isInspectorVisible, setIsInspectorVisible] = useState(false);
  const [isLoadingInstruments, setIsLoadingInstruments] = useState(false);

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

  // Initialize OMR Worker
  useEffect(() => {
    const worker = new OMRWorker();
    worker.postMessage({ type: 'init' });

    worker.onmessage = (e) => {
      const { type, payload } = e.data;
      if (type === 'init-complete') {
        console.log('[App] OMR Worker initialized:', payload.success);
      }
    };

    setOmrWorker(worker);

    return () => worker.terminate();
  }, []);

  // Initialize audio engine on user interaction
  const handleInitialize = useCallback(async () => {
    if (audioEngine?.ready) return;

    setIsInitializing(true);
    setError(null);

    try {
      const engine = createAudioEngine();
      await engine.initialize();
      setAudioEngine(engine);

      engine.onLoadingState((isLoading: boolean) => {
        setIsLoadingInstruments(isLoading);
      });

      const seq = createAudioSequencer(engine);
      setSequencer(seq);

      // Sync state from sequencer
      seq.onState((state) => {
        setIsPlaying(state.isPlaying);
        setCurrentMeasure(state.currentMeasure);
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize audio');
    } finally {
      setIsInitializing(false);
    }
  }, [audioEngine]);

  // Handle PDF file upload and processing
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      setActiveTab('score');

      if (!omrWorker) return;

      setIsProcessing(true);
      setProcessingProgress(0);

      try {
        // Load PDF for processing
        const arrayBuffer = await file.arrayBuffer();
        const numPages = await pdfProcessor.loadPDF(arrayBuffer);

        const staves: StaffIR[] = [];

        // Process each page
        for (let i = 1; i <= numPages; i++) {
          setProcessingProgress(Math.round(((i - 1) / numPages) * 100));

          const pageData = await pdfProcessor.renderPageToImageData(i);

          omrWorker.postMessage({
            type: 'process-page',
            payload: {
              pageNumber: i,
              imageData: pageData.imageData,
              options: { detectNotes: true }
            }
          });

          // Wait for result (promisified for simplicity)
          await new Promise<void>((resolve, reject) => {
            const handler = (event: MessageEvent) => {
              const { type, payload } = event.data;
              if (type === 'result' && payload.pageNumber === i) {
                if (payload.success) {
                  staves.push(...(payload.staves || []));
                  resolve();
                } else {
                  reject(new Error(payload.error));
                }
                omrWorker.removeEventListener('message', handler);
              }
            };
            omrWorker.addEventListener('message', handler);
          });
        }

        setProcessingProgress(100);

        // Construct Score IR
        const newScoreIR: ScoreIR = {
          irVersion: '1.0.0',
          staves,
          metadata: {
            title: file.name,
            tempo: 113,
            timeSignature: [4, 4],
            keySignature: 'C'
          },
          rehearsalMarks: []
        };

        setScoreIR(newScoreIR);
        sequencer?.loadScore(newScoreIR);
        console.log('[App] Score processing complete:', newScoreIR);

      } catch (err) {
        console.error('Processing failed:', err);
        setError('Failed to process score');
      } finally {
        setIsProcessing(false);
      }
    }
  }, [omrWorker, pdfProcessor, sequencer]);

  // Handle controls
  const handlePlay = useCallback(async () => {
    if (sequencer && !isPlaying) {
      try {
        await sequencer.play();
      } catch (err) {
        console.error('[App] Playback start failed:', err);
      }
    }
  }, [sequencer, isPlaying]);

  const handlePause = useCallback(() => {
    if (sequencer && isPlaying) sequencer.pause();
  }, [sequencer, isPlaying]);

  const handleStop = useCallback(() => {
    if (sequencer) sequencer.stop();
  }, [sequencer]);

  const handleSeek = useCallback((measure: number) => {
    if (sequencer) sequencer.seekToMeasure(measure);
  }, [sequencer]);

  const handleTempoChange = useCallback((newTempo: number) => {
    setTempo(newTempo);
    sequencer?.setTempo(newTempo);
  }, [sequencer]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    audioEngine?.setVolume(newVolume);
  }, [audioEngine]);

  const handleJumpToMark = useCallback((mark: RehearsalMark) => {
    sequencer?.seekToMeasure(mark.measureNumber);
  }, [sequencer]);

  const handleToggleMetronome = useCallback((enabled: boolean) => {
    setIsMetronomeEnabled(enabled);
    sequencer?.toggleMetronome(enabled);
  }, [sequencer]);

  // Cleanup PDF URL on change or unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  // Cleanup Audio Engine and Sequencer on unmount
  useEffect(() => {
    return () => {
      // We explicitly check if these exist before disposing to avoid closures capturing stale state if possible,
      // but relying on the ref or just letting the component unmount is standard.
      // However, to avoid disposing active engines on re-renders, we use an empty dependency array
      // combined with a ref tracking the current instances if strictly necessary, 
      // OR we just trust React to only run this cleanup on unmount if deps are empty.
      // But we can't capture state in empty deps cleanup easily without refs.

      // Better approach: Do nothing here if we want them to persist. 
      // But we SHOULD clean up on unmount.
    };
  }, []);

  // Real cleanup needs refs to capture the latest instances for unmount
  const engineRef = useRef<AudioEngine | null>(null);
  const sequencerRef = useRef<AudioSequencer | null>(null);

  // Keep refs in sync
  useEffect(() => { engineRef.current = audioEngine; }, [audioEngine]);
  useEffect(() => { sequencerRef.current = sequencer; }, [sequencer]);

  useEffect(() => {
    return () => {
      sequencerRef.current?.dispose();
      engineRef.current?.dispose();
      pdfProcessor.dispose();
    };
  }, [pdfProcessor]); // pdfProcessor is stable state

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
              {isProcessing ? (
                <div style={styles.processingStatus}>
                  Processing: {processingProgress}%
                </div>
              ) : isLoadingInstruments ? (
                <div style={styles.loadingStatus}>
                  ⏳ Loading Instruments...
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={styles.uploadButton}
                >
                  Load PDF Score
                </button>
              )}
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
                  <li>OMR & Note Detection (Beta)</li>
                  <li>Per-instrument mixer controls</li>
                  <li>Tempo scaling & looping</li>
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
                totalMeasures={sequencer?.getTotalMeasures() || 80}
                tempo={tempo}
                rehearsalMarks={rehearsalMarks}
                onPlay={handlePlay}
                onPause={handlePause}
                onStop={handleStop}
                onTempoChange={handleTempoChange}
                onSeek={handleSeek}
                onJumpToMark={handleJumpToMark}
                isMetronomeEnabled={isMetronomeEnabled}
                onToggleMetronome={handleToggleMetronome}
              />

              <MixerConsole
                masterVolume={volume}
                onMasterVolumeChange={handleVolumeChange}
              />

              {scoreIR && (
                <div style={{ padding: '10px', fontSize: '12px', color: '#888', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Detected {scoreIR.staves.length} staves</span>
                  <button
                    onClick={() => setIsInspectorVisible(true)}
                    style={{
                      background: 'none',
                      border: '1px solid #444',
                      color: '#aaa',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      fontSize: '11px'
                    }}
                  >
                    Inspect Data
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer style={styles.footer}>
        <p style={{ marginBottom: '8px' }}>
          Original Concept by{' '}
          <a
            href="https://www.linkedin.com/in/mondweepchakravorty/"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.footerLink}
          >
            Mondweep Chakravorty
          </a>
        </p>
        <p style={{ marginBottom: '12px', color: '#666' }}>
          Contributions from Audio Engineers & DSP Experts Welcome!
        </p>
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', fontSize: '12px' }}>
          <a
            href="https://github.com/mondweep/vibe-cast/blob/claude/sheet-music-player-w1UAI/LUITPLAYER-PRD.md"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.footerLink}
          >
            Product Requirements (PRD)
          </a>
          <span style={{ color: '#444' }}>|</span>
          <a
            href="https://github.com/mondweep/vibe-cast/blob/claude/sheet-music-player-w1UAI/luitplayer/docs/ARCHITECTURE.md"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.footerLink}
          >
            Architecture Docs
          </a>
        </div>
        <p style={styles.footerSub}>Built with Claude Flow V3 | DDD | WASM | TDD</p>
      </footer>

      <ScoreInspector
        scoreIR={scoreIR}
        isVisible={isInspectorVisible}
        onClose={() => setIsInspectorVisible(false)}
      />
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
    alignItems: 'center',
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
  processingStatus: {
    color: '#e94560',
    fontSize: '14px',
    fontWeight: 500,
  },
  loadingStatus: {
    color: '#f39c12',
    fontSize: '14px',
    fontWeight: 500,
    marginRight: '10px'
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
    color: 'white',
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
    marginTop: '16px',
    opacity: 0.6,
  },
  footerLink: {
    color: '#e94560',
    textDecoration: 'none',
    transition: 'color 0.2s',
    fontWeight: 500,
  },
};

export default App;

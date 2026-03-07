import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioAnalyzer } from '../../audio/analyzer';
import { detectPitches, getPeakFrequencies } from '../../audio/pitchDetection';
import { detectChord, detectedToParseResult } from '../../audio/chordDetector';
import type { DetectedChord, ParsedChord } from '../../types';

interface MicrophoneCaptureProps {
  onChordDetected: (chord: ParsedChord, alternatives: DetectedChord[]) => void;
  onFrequencyData: (data: Uint8Array) => void;
  onPeakFrequencies: (peaks: { frequency: number; magnitude: number }[]) => void;
  isListening: boolean;
  onToggle: () => void;
}

type PermissionState = 'prompt' | 'granted' | 'denied' | 'error';

export default function MicrophoneCapture({
  onChordDetected,
  onFrequencyData,
  onPeakFrequencies,
  isListening,
  onToggle,
}: MicrophoneCaptureProps) {
  const [permission, setPermission] = useState<PermissionState>('prompt');
  const [errorMsg, setErrorMsg] = useState('');
  const analyzerRef = useRef<AudioAnalyzer | null>(null);
  const rafRef = useRef<number>(0);
  const lastUpdateRef = useRef<number>(0);

  const processAudio = useCallback(() => {
    const analyzer = analyzerRef.current;
    if (!analyzer || !analyzer.isActive) return;

    const frequencyData = analyzer.getFrequencyData();
    onFrequencyData(frequencyData);

    // Throttle chord detection to ~4 updates/sec
    const now = Date.now();
    if (now - lastUpdateRef.current >= 250) {
      lastUpdateRef.current = now;

      const peaks = getPeakFrequencies(frequencyData, analyzer.sampleRate, analyzer.fftSize);
      onPeakFrequencies(peaks);

      const pitches = detectPitches(frequencyData, analyzer.sampleRate, analyzer.fftSize);

      if (pitches.length >= 2) {
        const chords = detectChord(pitches);
        if (chords.length > 0 && chords[0].confidence > 0.3) {
          onChordDetected(detectedToParseResult(chords[0]), chords);
        }
      }
    }

    rafRef.current = requestAnimationFrame(processAudio);
  }, [onChordDetected, onFrequencyData, onPeakFrequencies]);

  const startListening = useCallback(async () => {
    try {
      const analyzer = new AudioAnalyzer();
      await analyzer.start();
      analyzerRef.current = analyzer;
      setPermission('granted');
      setErrorMsg('');
      lastUpdateRef.current = 0;
      rafRef.current = requestAnimationFrame(processAudio);
    } catch (err) {
      const error = err as Error;
      if (error.name === 'NotAllowedError') {
        setPermission('denied');
        setErrorMsg('Microphone access denied. Please allow microphone access in your browser settings.');
      } else {
        setPermission('error');
        setErrorMsg(`Microphone error: ${error.message}`);
      }
    }
  }, [processAudio]);

  const stopListening = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (analyzerRef.current) {
      analyzerRef.current.stop();
      analyzerRef.current = null;
    }
    onFrequencyData(new Uint8Array(0));
    onPeakFrequencies([]);
  }, [onFrequencyData, onPeakFrequencies]);

  useEffect(() => {
    if (isListening) {
      startListening();
    } else {
      stopListening();
    }

    return () => {
      stopListening();
    };
  }, [isListening, startListening, stopListening]);

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={onToggle}
        className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all ${
          isListening
            ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200'
            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200'
        }`}
      >
        {/* Pulsing ring when listening */}
        {isListening && (
          <span className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-20" />
        )}
        {/* Mic icon */}
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2}>
          {isListening ? (
            // Stop icon
            <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
          ) : (
            // Mic icon
            <>
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </>
          )}
        </svg>
      </button>

      <span className={`text-sm font-medium ${isListening ? 'text-red-500' : 'text-gray-500'}`}>
        {isListening ? 'Listening...' : 'Start Microphone'}
      </span>

      {permission === 'denied' && (
        <p className="text-sm text-red-500 text-center max-w-xs">{errorMsg}</p>
      )}
      {permission === 'error' && (
        <p className="text-sm text-red-500 text-center max-w-xs">{errorMsg}</p>
      )}
    </div>
  );
}

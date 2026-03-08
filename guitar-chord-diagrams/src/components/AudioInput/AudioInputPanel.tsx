import { useState, useCallback } from 'react';
import MicrophoneCapture from './MicrophoneCapture';
import FileUpload from './FileUpload';
import SpectrumVisualizer from './SpectrumVisualizer';
import type { DetectedChord, ParsedChord } from '../../types';
import type { DetectionMode } from '../../audio/detectionConfig';
import { loadDetectionMode, saveDetectionMode } from '../../audio/detectionConfig';

interface AudioInputPanelProps {
  onChordDetected: (chord: ParsedChord) => void;
}

type InputMode = 'mic' | 'file';

export default function AudioInputPanel({ onChordDetected }: AudioInputPanelProps) {
  const [mode, setMode] = useState<InputMode>('mic');
  const [isListening, setIsListening] = useState(false);
  const [frequencyData, setFrequencyData] = useState<Uint8Array | null>(null);
  const [peakFrequencies, setPeakFrequencies] = useState<{ frequency: number; magnitude: number }[]>([]);
  const [alternatives, setAlternatives] = useState<DetectedChord[]>([]);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [detectionMode, setDetectionMode] = useState<DetectionMode>(loadDetectionMode);

  const handleChordDetected = useCallback((chord: ParsedChord, alts: DetectedChord[]) => {
    onChordDetected(chord);
    setAlternatives(alts);
    setConfidence(alts[0]?.confidence ?? null);
  }, [onChordDetected]);

  function handleToggleMic() {
    setIsListening(prev => !prev);
    if (isListening) {
      setAlternatives([]);
      setConfidence(null);
    }
  }

  function switchMode(newMode: InputMode) {
    if (isListening) setIsListening(false);
    setMode(newMode);
    setAlternatives([]);
    setConfidence(null);
    setFrequencyData(null);
    setPeakFrequencies([]);
  }

  function toggleDetectionMode() {
    const next: DetectionMode = detectionMode === 'standard' ? 'beginner' : 'standard';
    setDetectionMode(next);
    saveDetectionMode(next);
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 mb-6">
      {/* Mode tabs + detection toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 w-fit">
          <button
            onClick={() => switchMode('mic')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'mic'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            Microphone
          </button>
          <button
            onClick={() => switchMode('file')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'file'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            Upload File
          </button>
        </div>

        {/* Sensitivity toggle */}
        {mode === 'mic' && (
          <button
            onClick={toggleDetectionMode}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              detectionMode === 'beginner'
                ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
            }`}
            title={detectionMode === 'beginner'
              ? 'Beginner mode: slower, more stable detection with simplified chords'
              : 'Standard mode: fast detection with all chord types'
            }
          >
            {/* Toggle track */}
            <span className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
              detectionMode === 'beginner' ? 'bg-amber-400' : 'bg-gray-300 dark:bg-gray-500'
            }`}>
              <span className={`inline-block h-3 w-3 rounded-full bg-white transition-transform ${
                detectionMode === 'beginner' ? 'translate-x-4' : 'translate-x-0.5'
              }`} />
            </span>
            {detectionMode === 'beginner' ? 'Beginner' : 'Standard'}
          </button>
        )}
      </div>

      {/* Input controls */}
      <div className="mb-4">
        {mode === 'mic' ? (
          <MicrophoneCapture
            onChordDetected={handleChordDetected}
            onFrequencyData={setFrequencyData}
            onPeakFrequencies={setPeakFrequencies}
            isListening={isListening}
            onToggle={handleToggleMic}
            detectionMode={detectionMode}
          />
        ) : (
          <FileUpload onChordDetected={handleChordDetected} />
        )}
      </div>

      {/* Beginner mode hint */}
      {mode === 'mic' && detectionMode === 'beginner' && (
        <p className="text-xs text-amber-600 dark:text-amber-400 text-center mb-2">
          Beginner mode: slower updates, simplified chords (major, minor, 7th)
        </p>
      )}

      {/* Spectrum visualizer (mic mode only) */}
      {mode === 'mic' && (
        <SpectrumVisualizer
          frequencyData={frequencyData}
          isActive={isListening}
          peakFrequencies={peakFrequencies}
        />
      )}

      {/* Confidence & alternatives */}
      {confidence !== null && alternatives.length > 0 && (
        <div className="mt-3 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-xs text-gray-400">Confidence:</span>
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  confidence > 0.7 ? 'bg-green-500' :
                  confidence > 0.4 ? 'bg-yellow-500' : 'bg-red-400'
                }`}
                style={{ width: `${Math.round(confidence * 100)}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 font-mono">{Math.round(confidence * 100)}%</span>
          </div>

          {alternatives.length > 1 && (
            <div className="flex gap-2 justify-center mt-1">
              <span className="text-xs text-gray-400">Also possible:</span>
              {alternatives.slice(1).map((alt, i) => (
                <button
                  key={i}
                  onClick={() => onChordDetected({
                    root: alt.root,
                    quality: alt.quality,
                    displayName: alt.name,
                  })}
                  className="text-xs px-2 py-0.5 bg-gray-100 rounded-md text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                >
                  {alt.name} ({Math.round(alt.confidence * 100)}%)
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

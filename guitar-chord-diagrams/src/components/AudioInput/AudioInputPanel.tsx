import { useState, useCallback } from 'react';
import MicrophoneCapture from './MicrophoneCapture';
import FileUpload from './FileUpload';
import SpectrumVisualizer from './SpectrumVisualizer';
import type { DetectedChord, ParsedChord } from '../../types';

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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 mb-6">
      {/* Mode tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mb-4 w-fit mx-auto">
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

      {/* Input controls */}
      <div className="mb-4">
        {mode === 'mic' ? (
          <MicrophoneCapture
            onChordDetected={handleChordDetected}
            onFrequencyData={setFrequencyData}
            onPeakFrequencies={setPeakFrequencies}
            isListening={isListening}
            onToggle={handleToggleMic}
          />
        ) : (
          <FileUpload onChordDetected={handleChordDetected} />
        )}
      </div>

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

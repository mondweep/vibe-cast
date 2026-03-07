import { useState, useRef, useCallback } from 'react';
import { detectPitches } from '../../audio/pitchDetection';
import { detectChord, detectedToParseResult } from '../../audio/chordDetector';
import type { DetectedChord, ParsedChord } from '../../types';

interface FileUploadProps {
  onChordDetected: (chord: ParsedChord, alternatives: DetectedChord[]) => void;
}

const ACCEPTED_TYPES = ['audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/mp3', 'audio/x-wav'];
const ACCEPTED_EXTENSIONS = '.wav,.mp3,.ogg';

export default function FileUpload({ onChordDetected }: FileUploadProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setError('');
    setFileName(file.name);
    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Create an offline context to analyze the audio
      const offlineCtx = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
      );

      const source = offlineCtx.createBufferSource();
      const analyser = offlineCtx.createAnalyser();
      analyser.fftSize = 4096;

      source.buffer = audioBuffer;
      source.connect(analyser);
      analyser.connect(offlineCtx.destination);
      source.start(0);

      await offlineCtx.startRendering();

      const frequencyData = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(frequencyData);

      const pitches = detectPitches(frequencyData, audioBuffer.sampleRate, analyser.fftSize);

      if (pitches.length >= 2) {
        const chords = detectChord(pitches);
        if (chords.length > 0) {
          onChordDetected(detectedToParseResult(chords[0]), chords);
        } else {
          setError('Could not identify a chord from this audio.');
        }
      } else {
        setError('Not enough distinct pitches detected. Try a clearer recording.');
      }

      audioContext.close();
    } catch (err) {
      setError(`Failed to process audio file: ${(err as Error).message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [onChordDetected]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (ACCEPTED_TYPES.includes(file.type) || file.name.match(/\.(wav|mp3|ogg)$/i))) {
      processFile(file);
    } else {
      setError('Please upload a .wav, .mp3, or .ogg file.');
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`w-full max-w-sm border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-indigo-400 bg-indigo-50'
            : 'border-gray-300 hover:border-gray-400 bg-white'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleFileSelect}
          className="hidden"
        />

        {isProcessing ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Analyzing {fileName}...</p>
          </div>
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="w-10 h-10 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17,8 12,3 7,8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="text-sm text-gray-600">
              {fileName ? (
                <span>Loaded: <strong>{fileName}</strong></span>
              ) : (
                <span>Drop an audio file here or <span className="text-indigo-600 font-medium">browse</span></span>
              )}
            </p>
            <p className="text-xs text-gray-400 mt-1">.wav, .mp3, .ogg</p>
          </>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500 text-center max-w-sm">{error}</p>
      )}
    </div>
  );
}

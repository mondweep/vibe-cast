/**
 * Transport Controls Component
 * Play/Pause/Stop, Tempo, and Navigation controls
 */

import { useState, useCallback } from 'react';

export interface RehearsalMark {
  label: string;
  measureNumber: number;
}

interface TransportControlsProps {
  isPlaying?: boolean;
  currentMeasure?: number;
  totalMeasures?: number;
  tempo?: number;
  rehearsalMarks?: RehearsalMark[];
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onTempoChange?: (tempo: number) => void;
  onSeek?: (measure: number) => void;
  onJumpToMark?: (mark: RehearsalMark) => void;
  isMetronomeEnabled?: boolean;
  onToggleMetronome?: (enabled: boolean) => void;
}

export function TransportControls({
  isPlaying = false,
  currentMeasure = 1,
  totalMeasures = 100,
  tempo = 113,
  rehearsalMarks = [],
  onPlay,
  onPause,
  onStop,
  onTempoChange,
  onSeek,
  onJumpToMark,
  isMetronomeEnabled = false,
  onToggleMetronome,
}: TransportControlsProps) {
  const [localTempo, setLocalTempo] = useState(tempo);
  const [isLooping, setIsLooping] = useState(false);
  const [loopStart, setLoopStart] = useState(1);
  const [loopEnd, setLoopEnd] = useState(8);

  const handleTempoChange = useCallback(
    (newTempo: number) => {
      const clampedTempo = Math.max(40, Math.min(240, newTempo));
      setLocalTempo(clampedTempo);
      onTempoChange?.(clampedTempo);
    },
    [onTempoChange]
  );

  const formatTime = (measures: number): string => {
    const beatsPerMeasure = 4;
    const totalBeats = measures * beatsPerMeasure;
    const minutes = Math.floor(totalBeats / localTempo);
    const seconds = Math.floor(((totalBeats % localTempo) / localTempo) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#1a1a2e',
        borderRadius: '8px',
        padding: '16px',
        gap: '16px',
      }}
    >
      {/* Main transport buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
        }}
      >
        {/* Stop */}
        <button
          onClick={onStop}
          style={{
            width: '48px',
            height: '48px',
            backgroundColor: '#3a3a5e',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
          }}
          title="Stop"
        >
          ⬛
        </button>

        {/* Play/Pause */}
        <button
          onClick={isPlaying ? onPause : onPlay}
          style={{
            width: '64px',
            height: '64px',
            backgroundColor: '#e94560',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            boxShadow: '0 4px 12px rgba(233, 69, 96, 0.4)',
          }}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        {/* Loop toggle */}
        <button
          onClick={() => setIsLooping(!isLooping)}
          style={{
            width: '48px',
            height: '48px',
            backgroundColor: isLooping ? '#e94560' : '#3a3a5e',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
          }}
          title="Loop"
        >
          🔁
        </button>

        {/* Metronome toggle */}
        <button
          onClick={() => onToggleMetronome?.(!isMetronomeEnabled)}
          style={{
            width: '48px',
            height: '48px',
            backgroundColor: isMetronomeEnabled ? '#e94560' : '#3a3a5e',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
          }}
          title="Metronome"
        >
          ⏱️
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ color: '#888', fontSize: '12px', minWidth: '45px' }}>
          {formatTime(currentMeasure)}
        </span>

        <div
          style={{
            flex: 1,
            height: '8px',
            backgroundColor: '#3a3a5e',
            borderRadius: '4px',
            position: 'relative',
            cursor: 'pointer',
          }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            const measure = Math.round(ratio * totalMeasures);
            onSeek?.(Math.max(1, measure));
          }}
        >
          {/* Loop region */}
          {isLooping && (
            <div
              style={{
                position: 'absolute',
                left: `${(loopStart / totalMeasures) * 100}%`,
                width: `${((loopEnd - loopStart) / totalMeasures) * 100}%`,
                height: '100%',
                backgroundColor: 'rgba(233, 69, 96, 0.3)',
                borderRadius: '4px',
              }}
            />
          )}

          {/* Progress */}
          <div
            style={{
              width: `${(currentMeasure / totalMeasures) * 100}%`,
              height: '100%',
              backgroundColor: '#e94560',
              borderRadius: '4px',
              transition: 'width 0.1s',
            }}
          />

          {/* Playhead */}
          <div
            style={{
              position: 'absolute',
              left: `${(currentMeasure / totalMeasures) * 100}%`,
              top: '-4px',
              width: '16px',
              height: '16px',
              backgroundColor: '#e94560',
              borderRadius: '50%',
              transform: 'translateX(-50%)',
              boxShadow: '0 2px 8px rgba(233, 69, 96, 0.5)',
            }}
          />
        </div>

        <span style={{ color: '#888', fontSize: '12px', minWidth: '45px' }}>
          {formatTime(totalMeasures)}
        </span>
      </div>

      {/* Measure display */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          color: '#aaa',
          fontSize: '14px',
        }}
      >
        <span>Measure</span>
        <span
          style={{
            backgroundColor: '#3a3a5e',
            padding: '4px 12px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            color: '#e94560',
            fontWeight: 'bold',
          }}
        >
          {currentMeasure}
        </span>
        <span>of {totalMeasures}</span>
      </div>

      {/* Tempo control */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
        }}
      >
        <span style={{ color: '#888', fontSize: '14px' }}>Tempo</span>
        <button
          onClick={() => handleTempoChange(localTempo - 5)}
          style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#3a3a5e',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          -
        </button>
        <span
          style={{
            backgroundColor: '#3a3a5e',
            padding: '4px 16px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            color: '#e94560',
            fontWeight: 'bold',
            fontSize: '18px',
            minWidth: '60px',
            textAlign: 'center',
          }}
        >
          {localTempo}
        </span>
        <button
          onClick={() => handleTempoChange(localTempo + 5)}
          style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#3a3a5e',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          +
        </button>
        <span style={{ color: '#666', fontSize: '12px' }}>BPM</span>
      </div>

      {/* Loop controls */}
      {isLooping && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '8px',
            backgroundColor: 'rgba(233, 69, 96, 0.1)',
            borderRadius: '4px',
          }}
        >
          <span style={{ color: '#888', fontSize: '12px' }}>Loop:</span>
          <input
            type="number"
            min="1"
            max={totalMeasures}
            value={loopStart}
            onChange={(e) => setLoopStart(parseInt(e.target.value) || 1)}
            style={{
              width: '50px',
              padding: '4px',
              backgroundColor: '#3a3a5e',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              textAlign: 'center',
            }}
          />
          <span style={{ color: '#666' }}>to</span>
          <input
            type="number"
            min="1"
            max={totalMeasures}
            value={loopEnd}
            onChange={(e) => setLoopEnd(parseInt(e.target.value) || 8)}
            style={{
              width: '50px',
              padding: '4px',
              backgroundColor: '#3a3a5e',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              textAlign: 'center',
            }}
          />
        </div>
      )}

      {/* Rehearsal marks (Jump points) */}
      {rehearsalMarks.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            justifyContent: 'center',
          }}
        >
          {rehearsalMarks.map((mark) => (
            <button
              key={mark.label}
              onClick={() => onJumpToMark?.(mark)}
              style={{
                padding: '4px 12px',
                backgroundColor:
                  currentMeasure >= mark.measureNumber ? '#e94560' : '#3a3a5e',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
              title={`Jump to measure ${mark.measureNumber}`}
            >
              {mark.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

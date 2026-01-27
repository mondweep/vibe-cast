import { useCallback, useEffect, useRef } from 'react';
import type { AudioEngine } from '@domains/audio-engine';

interface PianoKeyboardProps {
  audioEngine: AudioEngine | null;
  octave?: number;
}

interface KeyConfig {
  note: string;
  pitch: number;
  isBlack: boolean;
}

/**
 * Simple piano keyboard for testing audio synthesis
 * Proof of concept for Phase 1
 */
export function PianoKeyboard({ audioEngine, octave = 4 }: PianoKeyboardProps) {
  const activeKeys = useRef<Set<number>>(new Set());

  // Generate keys for one octave
  const keys: KeyConfig[] = [
    { note: 'C', pitch: 0, isBlack: false },
    { note: 'C#', pitch: 1, isBlack: true },
    { note: 'D', pitch: 2, isBlack: false },
    { note: 'D#', pitch: 3, isBlack: true },
    { note: 'E', pitch: 4, isBlack: false },
    { note: 'F', pitch: 5, isBlack: false },
    { note: 'F#', pitch: 6, isBlack: true },
    { note: 'G', pitch: 7, isBlack: false },
    { note: 'G#', pitch: 8, isBlack: true },
    { note: 'A', pitch: 9, isBlack: false },
    { note: 'A#', pitch: 10, isBlack: true },
    { note: 'B', pitch: 11, isBlack: false },
  ];

  const getMidiPitch = useCallback(
    (semitone: number) => {
      return (octave + 1) * 12 + semitone;
    },
    [octave]
  );

  const handleKeyDown = useCallback(
    (semitone: number) => {
      if (!audioEngine?.ready) return;

      const pitch = getMidiPitch(semitone);
      if (!activeKeys.current.has(pitch)) {
        activeKeys.current.add(pitch);
        audioEngine.noteOn(pitch, 100);
      }
    },
    [audioEngine, getMidiPitch]
  );

  const handleKeyUp = useCallback(
    (semitone: number) => {
      if (!audioEngine?.ready) return;

      const pitch = getMidiPitch(semitone);
      activeKeys.current.delete(pitch);
      audioEngine.noteOff(pitch);
    },
    [audioEngine, getMidiPitch]
  );

  // Keyboard mapping
  useEffect(() => {
    const keyMap: Record<string, number> = {
      a: 0, // C
      w: 1, // C#
      s: 2, // D
      e: 3, // D#
      d: 4, // E
      f: 5, // F
      t: 6, // F#
      g: 7, // G
      y: 8, // G#
      h: 9, // A
      u: 10, // A#
      j: 11, // B
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const semitone = keyMap[e.key.toLowerCase()];
      if (semitone !== undefined) {
        handleKeyDown(semitone);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const semitone = keyMap[e.key.toLowerCase()];
      if (semitone !== undefined) {
        handleKeyUp(semitone);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const whiteKeys = keys.filter((k) => !k.isBlack);
  const blackKeys = keys.filter((k) => k.isBlack);

  return (
    <div style={styles.container}>
      <div style={styles.keyboard}>
        {/* White keys */}
        <div style={styles.whiteKeys}>
          {whiteKeys.map((key) => (
            <button
              key={key.note}
              style={styles.whiteKey}
              onMouseDown={() => handleKeyDown(key.pitch)}
              onMouseUp={() => handleKeyUp(key.pitch)}
              onMouseLeave={() => handleKeyUp(key.pitch)}
            >
              <span style={styles.keyLabel}>{key.note}{octave}</span>
            </button>
          ))}
        </div>

        {/* Black keys */}
        <div style={styles.blackKeys}>
          {blackKeys.map((key) => {
            // Calculate position based on white key gaps
            const positions: Record<number, number> = {
              1: 0.7, // C#
              3: 1.7, // D#
              6: 3.7, // F#
              8: 4.7, // G#
              10: 5.7, // A#
            };

            return (
              <button
                key={key.note}
                style={{
                  ...styles.blackKey,
                  left: `${positions[key.pitch] * 50 + 35}px`,
                }}
                onMouseDown={() => handleKeyDown(key.pitch)}
                onMouseUp={() => handleKeyUp(key.pitch)}
                onMouseLeave={() => handleKeyUp(key.pitch)}
              />
            );
          })}
        </div>
      </div>

      <p style={styles.hint}>
        Use keyboard keys A-S-D-F-G-H-J (white) and W-E-T-Y-U (black)
      </p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
  },
  keyboard: {
    position: 'relative',
    display: 'flex',
  },
  whiteKeys: {
    display: 'flex',
  },
  whiteKey: {
    width: '50px',
    height: '180px',
    backgroundColor: '#fff',
    border: '1px solid #333',
    borderRadius: '0 0 6px 6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingBottom: '10px',
    transition: 'background-color 0.1s',
  },
  blackKey: {
    position: 'absolute',
    width: '30px',
    height: '110px',
    backgroundColor: '#1a1a2e',
    border: '1px solid #000',
    borderRadius: '0 0 4px 4px',
    cursor: 'pointer',
    zIndex: 1,
  },
  blackKeys: {
    position: 'absolute',
    top: 0,
    left: 0,
    pointerEvents: 'none',
  },
  keyLabel: {
    fontSize: '12px',
    color: '#666',
  },
  hint: {
    marginTop: '20px',
    color: '#888',
    fontSize: '14px',
  },
};

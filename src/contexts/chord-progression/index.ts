export { useProgression } from './hooks/useProgression.ts';
export { ProgressionDisplay } from './components/ProgressionDisplay.tsx';
export { ChordLabel } from './components/ChordLabel.tsx';
export { CHORD_LIBRARY, RSD_LESSON_PROGRESSION } from './domain/chord-data.ts';
export { resolveCurrentChord, isSilenceBeat } from './domain/progression-engine.ts';
export type { ChordName, ChordVoicing, Progression, Bar, BarSegment } from './domain/types.ts';

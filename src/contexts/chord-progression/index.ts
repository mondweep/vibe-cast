export { useProgression } from './hooks/useProgression.ts';
export { ProgressionDisplay } from './components/ProgressionDisplay.tsx';
export { ChordLabel } from './components/ChordLabel.tsx';
export { MiniChordDiagram } from './components/MiniChordDiagram.tsx';
export { CHORD_LIBRARY, RSD_LESSON_PROGRESSION } from './domain/chord-data.ts';
export { resolveCurrentChord, isSilenceBeat } from './domain/progression-engine.ts';
export { playChord, stopChord } from './domain/chord-audio.ts';
export type { ChordName, ChordVoicing, Progression, Bar, BarSegment } from './domain/types.ts';

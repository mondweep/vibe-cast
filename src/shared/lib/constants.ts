export const FAMILIARITY_THRESHOLDS = {
  NEW: 0.0,
  RECOGNIZED: 0.3,
  KNOWN: 0.7,
  MASTERED: 0.9,
} as const;

export const SRS_DEFAULTS = {
  INITIAL_INTERVAL: 1,
  INITIAL_EASE_FACTOR: 2.5,
  MIN_EASE_FACTOR: 1.3,
} as const;

export const TRANSLATION_MODES = {
  LITERAL: 'literal',
  POETIC: 'poetic',
} as const;

export const REVISION_MODES = {
  FLASHCARD: 'flashcard',
  AUDIO: 'audio',
  MATCHING: 'matching',
  SENTENCE: 'sentence',
} as const;

export const PLAYBACK_POLL_INTERVAL_MS = 250;

export const TRANSLATION_LATENCY_TARGET_MS = 2000;

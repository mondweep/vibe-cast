# PRD: Guitar Chord Sound Interpreter & Diagram Generator

## Overview

A browser-based application that listens to guitar audio input (via microphone or audio file), identifies the chord being played, and displays all possible fingering shapes/voicings for that chord as interactive SVG diagrams.

---

## Problem Statement

Guitarists often know a chord by name or sound but don't know all the possible ways to play it across the fretboard. Conversely, beginners may hear a chord but not know what it is. This tool bridges both gaps: it identifies chords from sound and shows every practical voicing.

---

## Target Users

- **Beginner guitarists** learning chord shapes
- **Intermediate players** looking to expand voicing vocabulary
- **Songwriters/transcribers** identifying chords by ear
- **Guitar teachers** needing a visual reference tool

---

## Core Features

### 1. Audio Chord Detection

**Description:** Capture audio from the user's microphone or an uploaded audio file and analyze it to determine the chord being played.

**Technical Approach:**
- Use the Web Audio API to capture microphone input in real time
- Apply FFT (Fast Fourier Transform) to extract frequency spectrum
- Use pitch detection (autocorrelation or harmonic product spectrum) to identify individual note frequencies
- Map detected pitches to musical notes (A, B, C#, etc.)
- Match the note set against a chord dictionary to identify the chord name and quality (major, minor, 7th, sus, dim, aug, etc.)

**Supported Input Modes:**
- Live microphone input with real-time analysis
- Audio file upload (.wav, .mp3, .ogg)

**Detection Capabilities:**
- Major, minor chords
- 7th chords (dominant 7, major 7, minor 7)
- Suspended chords (sus2, sus4)
- Augmented and diminished chords
- Add9, add11 variations
- Power chords (5th)
- Slash chords (inversions with identified bass note)

### 2. Chord Diagram Renderer

**Description:** Given a chord name, render all known/practical fingering positions as standard guitar chord box diagrams (SVG).

**Diagram Features:**
- Standard 6-string guitar neck representation
- Fret numbers labeled on the side
- Finger dots with finger number annotations (1 = index, 2 = middle, 3 = ring, 4 = pinky, T = thumb)
- Open string indicators (O)
- Muted/unplayed string indicators (X)
- Barre indicators (curved bar across strings)
- Fret position marker when chord is played above the 3rd fret
- Note names displayed below each string

**Voicing Coverage:**
- Open position shapes (cowboy chords)
- Barre chord shapes (E-form, A-form, C-form, D-form, G-form — CAGED system)
- Moveable shapes across the fretboard
- Partial/jazz voicings (3-4 string fragments)
- Drop 2, Drop 3 voicings
- All inversions (root, 1st, 2nd, 3rd as applicable)

### 3. Chord Library / Dictionary

**Description:** A comprehensive data model of guitar chords covering all practical voicings.

**Chord Types Supported:**
| Category | Types |
|----------|-------|
| Triads | Major, Minor, Augmented, Diminished |
| 7th Chords | Dom7, Maj7, Min7, Min7b5 (half-dim), Dim7 |
| Extended | 9, Maj9, Min9, 11, 13 |
| Suspended | Sus2, Sus4, 7sus4 |
| Added Tone | Add9, Add11, 6, Min6 |
| Altered | 7#5, 7b5, 7#9, 7b9 |
| Power | 5 (power chord) |

**Root Notes:** All 12 chromatic notes (C, C#/Db, D, D#/Eb, E, F, F#/Gb, G, G#/Ab, A, A#/Bb, B)

### 4. Interactive UI

**Sections:**
- **Audio Input Panel** — mic toggle, file upload, waveform/spectrum visualizer
- **Detected Chord Display** — large, prominent chord name with notes listed
- **Diagram Grid** — scrollable grid of all voicing diagrams for the detected chord
- **Manual Search** — text input to search for any chord by name (e.g., "Am7", "F#dim")
- **Playback** — click a diagram to hear the chord voicing played back via Web Audio API synthesis

---

## Technical Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite |
| Language | TypeScript |
| Styling | TailwindCSS |
| Audio Processing | Web Audio API (native browser) |
| Diagram Rendering | SVG (inline React components) |
| Audio Synthesis | Tone.js (for chord playback) |
| State Management | React hooks (useState, useReducer, useContext) |
| Testing | Vitest + React Testing Library |

### Project Structure

```
guitar-chord-diagrams/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── AudioInput/
│   │   │   ├── MicrophoneCapture.tsx
│   │   │   ├── FileUpload.tsx
│   │   │   └── SpectrumVisualizer.tsx
│   │   ├── ChordDisplay/
│   │   │   ├── ChordName.tsx
│   │   │   └── NoteList.tsx
│   │   ├── ChordDiagram/
│   │   │   ├── DiagramSVG.tsx
│   │   │   ├── DiagramGrid.tsx
│   │   │   ├── FretBoard.tsx
│   │   │   ├── FingerDot.tsx
│   │   │   └── BarreIndicator.tsx
│   │   ├── ChordSearch/
│   │   │   └── SearchInput.tsx
│   │   └── Layout/
│   │       ├── Header.tsx
│   │       └── Footer.tsx
│   ├── audio/
│   │   ├── analyzer.ts          # FFT + pitch detection
│   │   ├── chordDetector.ts     # Note set → chord name mapping
│   │   ├── pitchDetection.ts    # Autocorrelation algorithm
│   │   └── synthesizer.ts       # Chord playback via Tone.js
│   ├── data/
│   │   ├── chordDefinitions.ts  # All chord formulas (intervals)
│   │   ├── chordVoicings.ts     # Fretboard positions for each chord
│   │   ├── tunings.ts           # Standard + alternate tunings
│   │   └── noteFrequencies.ts   # Note → Hz mapping
│   ├── utils/
│   │   ├── musicTheory.ts       # Interval math, note transposition
│   │   └── fretboardMath.ts     # Fret-to-note calculations
│   └── types/
│       └── index.ts             # TypeScript interfaces
├── tests/
│   ├── chordDetector.test.ts
│   ├── musicTheory.test.ts
│   └── diagramSVG.test.ts
└── README.md
```

### Key Data Types

```typescript
interface ChordVoicing {
  name: string;              // e.g., "Am7"
  root: string;              // e.g., "A"
  quality: string;           // e.g., "min7"
  strings: (number | null)[]; // Fret per string [E,A,D,G,B,e], null = muted
  fingers: (number | null)[]; // Finger per string, null = open/muted
  barres: Barre[];           // Barre definitions
  baseFret: number;          // Starting fret position
  notes: string[];           // Notes in this voicing
  category: string;          // "open" | "barre" | "jazz" | "partial"
}

interface Barre {
  fret: number;
  fromString: number;
  toString: number;
  finger: number;
}

interface DetectedChord {
  name: string;
  root: string;
  quality: string;
  confidence: number;        // 0-1 detection confidence
  detectedNotes: string[];
  allVoicings: ChordVoicing[];
}
```

---

## Scope & Milestones

### Phase 1 — Core Diagrams (MVP)
- Chord data library with all standard open and barre chord voicings
- SVG diagram renderer with finger numbers, barres, open/muted indicators
- Manual chord search by name
- Responsive grid layout

### Phase 2 — Audio Detection
- Microphone capture via Web Audio API
- FFT-based pitch detection
- Chord identification from detected pitches
- Real-time spectrum visualizer

### Phase 3 — Extended Voicings & Playback
- CAGED system voicings across entire fretboard
- Jazz voicings (Drop 2, Drop 3)
- Click-to-play audio synthesis for each diagram
- Alternate tuning support

### Phase 4 — Polish
- Chord progression tracking (sequence of detected chords)
- Favorites / bookmarking voicings
- Print-friendly diagram export
- Dark mode

---

## Non-Goals (Out of Scope)

- Tab/sheet music generation
- Chord progression suggestions or AI composition
- Mobile native app (browser-only for now)
- Multi-instrument support (guitar only)
- Backend / user accounts / cloud storage

---

## Success Metrics

- Correctly identifies > 85% of cleanly played chords from microphone input
- Renders at least 5 voicings for every standard chord type
- Page loads in < 2 seconds
- All diagrams render correctly at mobile and desktop viewport sizes

---

## Open Questions

1. Should we support alternate tunings (Drop D, Open G, DADGAD) in Phase 1 or defer?
2. Should the chord library be algorithmically generated from intervals + fretboard math, or hand-curated for quality?
3. Do we want left-handed diagram mode?
4. Should audio file upload support scrubbing/seeking to specific timestamps?

# ADR-004: JSON Intermediate Representation (IR) for Score Data

## Status
Accepted

## Date
2026-01-27

## Context
The OMR engine produces structured musical data that the Audio engine must consume. These components run in separate workers with different memory spaces. We need a standardized format for transferring score data that is efficient, debuggable, and extensible.

## Decision
We will use a **JSON Intermediate Representation (IR)** as the published language between OMR and Audio contexts.

### IR Schema

```typescript
interface ScoreIR {
  metadata: {
    title: string;
    tempo: number;          // BPM (e.g., 113-114)
    timeSignature: [number, number];  // [4, 4]
    keySignature: string;   // "Bm" or "CA7"
  };
  staves: StaffIR[];
  rehearsalMarks: RehearsalMark[];
}

interface StaffIR {
  id: string;
  instrument: InstrumentType;  // "soprano" | "piano" | "bass-guitar" | etc.
  measures: MeasureIR[];
}

interface MeasureIR {
  number: number;
  startTime: number;        // In beats
  events: NoteEvent[];
  dynamics?: Dynamic;       // "p" | "mp" | "mf" | "f" | "pppp"
  chordSymbol?: string;     // "F#m7b5/A" | "EmAdd9"
}

interface NoteEvent {
  type: "note-on" | "note-off";
  pitch: number;            // MIDI note number (0-127)
  time: number;             // Beat offset within measure
  duration: number;         // In beats
  velocity: number;         // 0-127 (derived from dynamics)
  lyric?: string;           // Assamese text if present
}

interface RehearsalMark {
  label: string;            // "A1", "A2", "S1", "M1"
  measureNumber: number;
}

type InstrumentType =
  | "soprano"
  | "lead-vocal"
  | "space-synth"
  | "piano"
  | "acoustic-guitar-strum"
  | "acoustic-guitar-lead"
  | "bass-guitar"
  | "drums"
  | "strings"
  | "brass"
  | "choir";
```

### Transfer Mechanism
1. OMR Worker serializes IR to JSON
2. Transfer via `postMessage` with Transferable objects where possible
3. For large scores: Use SharedArrayBuffer with JSON pointer offsets

### Versioning
IR schema includes version field for backward compatibility:
```json
{
  "irVersion": "1.0.0",
  "metadata": { ... }
}
```

## Consequences

### Positive
- Human-readable for debugging
- Language-agnostic (WASM can produce, JS can consume)
- Extensible with optional fields
- Cacheable (can save parsed scores)

### Negative
- JSON parsing overhead (mitigated by streaming)
- Larger than binary formats

### Alternatives Considered
1. **Protocol Buffers**: More efficient but adds complexity
2. **MessagePack**: Binary JSON, less debuggable
3. **Custom binary**: Maximum performance, minimum flexibility

## References
- PRD Section 3.1: PDF Processing & OMR
- JSON Schema specification

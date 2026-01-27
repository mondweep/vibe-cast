# PRD: LuitPlayer (Score-to-Audio WASM App)

## 1. Product Vision

A high-performance web application that digitises complex, multi-stave PDF musical scores (e.g., Māyābini Rātir Bùkùt) and provides an interactive, real-time playback experience with per-instrument controls.

## 2. Technical Architecture (WASM-Centric)

The app shall utilize a tri-worker architecture to ensure the UI remains responsive during heavy computation.

- **Main Thread (React/TypeScript):** Handles PDF rendering, UI state (play/pause), and coordinate mapping for the follow-along cursor.

- **OMR Worker (C++/WASM):** Compiled via Emscripten using OpenCV. It processes PDF pages into a custom JSON intermediate representation (IR) of notes, chords, and timing.

- **Audio Engine (AudioWorklet/WASM):** A low-latency thread running a sample-based synthesizer. It consumes the IR and renders raw PCM audio.

## 3. Core Functional Requirements

### 3.1 PDF Processing & OMR

**Segmented Scanning:** The OMR engine must identify 11 distinct instrumental/vocal staves as seen in the provided score (Soprano, Lead Vocal, Space Synth, Piano, etc.).

**Symbol Recognition:** Must detect:
- Tempo: d=113−114.
- Dynamics: p, mp, mf, f, pppp.
- Complex Chords: Slash chords (F#m7b5/A) and extensions (EmAdd9).

**Assamese OCR:** Integration of a Tesseract-based WASM module to recognise and align Assamese lyrics with note heads.

### 3.2 High-Fidelity Playback

**Sample Mapping:** Use specific sound fonts or samples for:
- Space Synth (KB).
- Acoustic Guitar (Strum vs. Lead).
- Bass Gtr (Finger).

**Mixer Console:** Each identified staff must have an independent Volume Slider, Mute, and Solo toggle.

**Real-time Tempo Scaling:** Ability to change playback speed (0.5x to 1.5x) without pitch shifting via a WASM-based time-stretching algorithm.

### 3.3 Navigation & UX

**Follow-along Cursor:** A visual overlay on the PDF that highlights the current measure being played.

**Jump Points:** Automatic detection of rehearsal marks (A1, A2, S1, M1, etc.) for quick navigation.

**Looping:** User can click-and-drag over a section of the score to create a playback loop.

## 4. Implementation Roadmap for AI Assistant

### Phase 1: The WASM "Glue"
**Prompt for AI:** "Set up a Vite project with React and TypeScript. Configure a Web Worker that loads a basic WASM module. Set up an AudioWorkletNode that can receive a frequency value and play a sine wave as a proof of concept."

### Phase 2: OMR Engine (The Bottleneck)
**Prompt for AI:** "Integrate OpenCV.js via WASM. Write a function to detect horizontal staff lines in an uploaded image. Once lines are found, segment the image into individual measures."

### Phase 3: Audio Synthesis
**Prompt for AI:** "Create a WASM-based sampler in the AudioWorklet. It should hold an array of audio buffers (samples). When it receives a MIDI-style 'Note On' message, it should play the corresponding sample with gain adjustment based on dynamics (mp, f)."

## 5. Non-Functional Requirements

- **Low Latency:** Audio-to-Visual sync must have a latency of <20ms.

- **Memory Efficiency:** Use SharedArrayBuffer to pass score data from the OMR Worker to the Audio thread to avoid memory spikes.

- **Offline Capability:** The app should function as a PWA (Progressive Web App) so the 14-page analysis can happen without a server.

## 6. Success Criteria

- **Parsing Accuracy:** The app correctly identifies the key change or chord transitions in Page 4 (Bm7→CA7).

- **Multithreading:** The UI remains at 60fps even while the OMR engine is parsing a new page.

- **Playback Fidelity:** The "Bass Guitar Solo" at measure 53 sounds distinct from the Piano accompaniment.

## 7. Current Implementation Status (Jan 27, 2026)

### Completed
- **Project Setup:** Vite + React + TypeScript environment established.
- **Detailed Architecture:** `ARCHITECTURE.md` created with tri-worker data flow diagrams.
- **Audio Infrastructure:** `AudioWorklet` implemented. Currently uses a sine wave synthesizer for basic testing and a woodblock metronome for playback feedback.
- **PDF Score Viewer:** 
  - Integrated `pdfjs-dist` for rendering.
  - Implemented custom `PDFViewer` component with zoom, manual navigation (Next/Prev), and boundary checks.
  - Resolved rendering concurrency issues ("same canvas" errors).
- **Interactive UI:** 
  - **Piano Keyboard:** Fully functional virtual keyboard triggers audio engine.
  - **Transport Controls:** Play/Pause/Stop with verified measure counting.
  - **Mixer Console:** UI implementation with volume sliders/mute/solo (partial wiring).
- **Playback Features:**
  - **Metronome:** Audio click on every measure beat confirms engine activity.
  - **Follow-Along Cursor:** Red overlay tracking measures (currently using fixed geometry, not OMR).
- **PWA Support:** Service workers and manifest configured.

### In Progress
- **OMR Integration:** `omr.worker.ts` exists but lacks OpenCV logic. Real note detection is **NOT** yet implemented.
- **Advanced Synthesis:** Moving from sine waves/metronome to Sample-based synthesis (required for Piano, Guitar, Strings).

### Remaining Scope
- **Optical Music Recognition (OMR):**
  - Implement caching/pipeline in `omr.worker.ts`.
  - Detect staves, measures, and individual notes using OpenCV.js.
  - Map PDF coordinates to audio events.
- **Audio Engine Upgrade:** 
  - Implement SoundFont or Wavetable synthesis.
  - Support multi-channel mixer logic (currently all channels sum to one oscillator).
- **Data Synchronization:**
  - Connect OMR output (JSON IR) to the Audio Sequencer.
  - Use `SharedArrayBuffer` for zero-copy data transfer between workers.

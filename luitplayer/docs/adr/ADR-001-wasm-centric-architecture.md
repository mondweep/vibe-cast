# ADR-001: WASM-Centric Tri-Worker Architecture

## Status
Accepted

## Date
2026-01-27

## Context
LuitPlayer needs to process complex PDF musical scores with Optical Music Recognition (OMR) while providing real-time audio playback. These are computationally intensive tasks that could block the main UI thread, causing poor user experience.

## Decision
We will implement a **tri-worker architecture** using WebAssembly (WASM):

1. **Main Thread (React/TypeScript)**
   - PDF rendering via PDF.js
   - UI state management (play/pause, volume)
   - Coordinate mapping for follow-along cursor
   - User interaction handling

2. **OMR Worker (C++/WASM via Emscripten)**
   - OpenCV-based image processing
   - Staff line detection
   - Note and chord recognition
   - Outputs JSON Intermediate Representation (IR)

3. **Audio Engine (AudioWorklet/WASM)**
   - Low-latency sample-based synthesizer
   - Consumes IR from OMR Worker
   - Renders raw PCM audio
   - Real-time tempo scaling

## Consequences

### Positive
- UI remains responsive (60fps target) during heavy computation
- Low-latency audio (<20ms sync)
- Efficient memory usage via SharedArrayBuffer
- Offline capability as PWA

### Negative
- Increased complexity in worker communication
- WASM compilation adds build complexity
- SharedArrayBuffer requires specific COOP/COEP headers

### Risks
- Browser compatibility for SharedArrayBuffer
- WASM module size impact on initial load

## Alternatives Considered
1. **Single-threaded JS**: Rejected due to UI blocking
2. **Server-side processing**: Rejected due to offline requirement
3. **Web Workers without WASM**: Rejected due to performance needs

## References
- PRD Section 2: Technical Architecture
- [WebAssembly Specification](https://webassembly.org/)
- [AudioWorklet API](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet)

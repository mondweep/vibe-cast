# System Architecture

## Overview

LuitPlayer utilizes a **Tri-Worker Architecture** to ensure high performance and low latency. The application runs on the main thread for UI, while offloading computationally expensive tasks (OMR and Audio Synthesis) to dedicated Web Workers and AudioWorklets.

## Component Diagram

```mermaid
graph TD
    subgraph Browser
        UI[Main Thread (React UI)]
        OMR[OMR Worker (OpenCV/WASM)]
        Audio[Audio Engine (AudioWorklet)]
        SAB[(SharedArrayBuffer)]
    end

    User[User] -->|Interact| UI
    UI -->|Load PDF| OMR
    OMR -->|Write Score Data| SAB
    SAB -->|Read Score Data| Audio
    UI -->|Control Playback| Audio
    Audio -->|Output Sound| Speakers
    Audio -->|Sync Position| SAB
    SAB -->|Read Position| UI

    style SAB fill:#f9f,stroke:#333,stroke-width:2px
```

## Data Flow

1.  **PDF Loading:** User selects a score. UI sends image data to OMR Worker.
2.  **OMR Processing:** OMR Worker uses OpenCV (WASM) to detect staves and notes. It writes the "Intermediate Representation" (IR) to the `SharedArrayBuffer`.
3.  **Playback:**
    *   Audio Engine reads note data from `SharedArrayBuffer` in real-time.
    *   It synthesizes audio (sample-based) and writes to the Audio Context.
    *   Supports infinite looping for sustained instruments (Voice, Synth) to handle long durations.
    *   It writes the current playback timestamp back to `SharedArrayBuffer`.
4.  **Visual Sync:** UI reads the timestamp from `SharedArrayBuffer` (via requestAnimationFrame) to update the cursor position and score view.

## Technologies

*   **Frontend:** React, TypeScript, Vite
*   **Audio:** Web Audio API, AudioWorklet
*   **OMR:** OpenCV.js (WASM)
*   **State:** Zustand
*   **Styling:** CSS Modules / Inline (Proof of Concept)

# ADR-007: SharedArrayBuffer for Cross-Worker Memory

## Status
Accepted

## Date
2026-01-27

## Context
The PRD requires memory efficiency and low latency (<20ms audio-visual sync). Traditional `postMessage` involves data copying between workers, causing memory spikes and latency. The OMR Worker produces large score data that the Audio Engine must access with minimal delay.

## Decision
We will use **SharedArrayBuffer** to share memory between the Main Thread, OMR Worker, and Audio Engine.

### Memory Layout

```
SharedArrayBuffer (Total: 16 MB)
├── [0x0000 - 0x0FFF]     Control Block (4 KB)
│   ├── [0x0000]          Version counter (Atomics)
│   ├── [0x0004]          Write lock (Atomics)
│   ├── [0x0008]          Playback position (samples)
│   ├── [0x000C]          Current measure index
│   └── [0x0010 - 0x0FFF] Reserved
│
├── [0x1000 - 0x1FFFFF]   Score IR Data (2 MB)
│   └── UTF-8 encoded JSON with length prefix
│
├── [0x200000 - 0x9FFFFF] Audio Ring Buffer (8 MB)
│   └── Stereo float32 samples (2 channels)
│
└── [0xA00000 - 0xFFFFFF] OMR Working Memory (6 MB)
    └── Image processing scratch space
```

### Synchronization Protocol

```typescript
// Writing score data (OMR Worker)
function writeScoreIR(sab: SharedArrayBuffer, ir: ScoreIR) {
  const control = new Int32Array(sab, 0, 16);
  const data = new Uint8Array(sab, 0x1000, 0x1FFFFF - 0x1000);

  // Acquire write lock
  while (Atomics.compareExchange(control, 1, 0, 1) !== 0) {
    Atomics.wait(control, 1, 1);
  }

  // Write data
  const json = JSON.stringify(ir);
  const encoded = new TextEncoder().encode(json);
  new DataView(sab).setUint32(0x1000, encoded.length);
  data.set(encoded, 4);

  // Increment version, release lock
  Atomics.add(control, 0, 1);
  Atomics.store(control, 1, 0);
  Atomics.notify(control, 1);
}

// Reading playback position (Main Thread)
function getPlaybackPosition(sab: SharedArrayBuffer): number {
  const control = new Int32Array(sab, 0, 16);
  return Atomics.load(control, 2);
}
```

### Audio Ring Buffer
Double-buffered design for glitch-free playback:
```
[Buffer A: 2MB] [Buffer B: 2MB] [Buffer C: 2MB] [Buffer D: 2MB]
     ↑ Read         ↑ Write
```

## Consequences

### Positive
- Zero-copy data sharing between workers
- Sub-millisecond latency for position updates
- No memory spikes from serialization
- Enables <20ms audio-visual sync target

### Negative
- Requires COOP/COEP headers (see ADR-006)
- Complex synchronization logic
- Browser compatibility concerns (Safari limitations)
- Debugging shared memory is challenging

### Browser Support
- Chrome 68+
- Firefox 79+
- Safari 15.2+ (with caveats)
- Edge 79+

### Fallback Strategy
For browsers without SharedArrayBuffer support:
1. Detect via `typeof SharedArrayBuffer !== 'undefined'`
2. Fall back to MessageChannel with Transferable objects
3. Accept higher latency (~50ms) in fallback mode

## References
- PRD Section 5: Memory Efficiency requirement
- [SharedArrayBuffer MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer)
- [Atomics MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics)

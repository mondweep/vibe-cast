# ADR-006: Progressive Web App (PWA) for Offline Capability

## Status
Accepted

## Date
2026-01-27

## Context
The PRD requires the app to function offline so users can analyze 14-page scores without server dependency. Musicians often practice in environments with unreliable internet (rehearsal spaces, travel). The app must cache WASM modules, samples, and parsed scores locally.

## Decision
We will implement LuitPlayer as a **Progressive Web App (PWA)** with comprehensive offline support.

### Service Worker Strategy

```typescript
// Cache-first for static assets
const STATIC_CACHE = 'luitplayer-static-v1';
const WASM_CACHE = 'luitplayer-wasm-v1';
const SAMPLES_CACHE = 'luitplayer-samples-v1';
const SCORES_CACHE = 'luitplayer-scores-v1';

// Caching strategy by resource type
const strategies = {
  wasm: 'cache-first',      // WASM modules rarely change
  samples: 'cache-first',   // Audio samples are static
  scores: 'cache-first',    // Parsed scores persist
  app: 'stale-while-revalidate'  // App shell updates
};
```

### Storage Allocation

| Resource Type | Storage | Estimated Size |
|--------------|---------|----------------|
| WASM Modules | Cache API | ~5 MB |
| Audio Samples | IndexedDB | ~50 MB |
| Parsed Scores | IndexedDB | ~2 MB per score |
| App Shell | Cache API | ~1 MB |

### IndexedDB Schema

```typescript
// Scores database
interface ScoreStore {
  id: string;           // Hash of PDF
  pdfBlob: Blob;        // Original PDF
  ir: ScoreIR;          // Parsed intermediate representation
  parsedAt: Date;
  pageCount: number;
}

// Samples database
interface SampleStore {
  instrument: InstrumentType;
  noteRange: [number, number];  // MIDI range
  samples: Map<number, ArrayBuffer>;  // pitch -> audio data
}
```

### Manifest Configuration

```json
{
  "name": "LuitPlayer",
  "short_name": "LuitPlayer",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a1a2e",
  "theme_color": "#e94560",
  "icons": [
    { "src": "/icons/192.png", "sizes": "192x192" },
    { "src": "/icons/512.png", "sizes": "512x512" }
  ]
}
```

### COOP/COEP Headers
Required for SharedArrayBuffer support:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

## Consequences

### Positive
- Full offline functionality
- Instant load after first visit
- Native-like experience
- Works on mobile devices

### Negative
- Storage quota management needed
- Cache invalidation complexity
- COOP/COEP restricts some third-party integrations

## References
- PRD Section 5: Non-Functional Requirements
- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Workbox](https://developer.chrome.com/docs/workbox/)

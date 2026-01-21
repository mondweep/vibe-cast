# Driftwise: Architecture & Framework Document (AFD)

**Project:** Driftwise - Voice-First Serendipitous Local History Companion
**Version:** 1.0.0
**Status:** Architecture Design Phase
**Last Updated:** January 2026

---

## 1. Executive Summary

Driftwise is a voice-first Progressive Web Application (PWA) that delivers serendipitous historical facts about locations during routine car journeys. The architecture follows a **client-centric PWA model** with direct API integrations for V1 (personal use), designed for future backend-proxy scalability.

### Design Principles

1. **Voice-First**: Every interaction optimized for hands-free, eyes-free operation
2. **Serendipity Over Search**: Proactive discovery, not reactive querying
3. **Graceful Degradation**: Never fail loudly; skip cycles silently
4. **Privacy by Default**: No tracking, minimal data retention
5. **Driver Safety**: Zero visual attention required during operation

---

## 2. System Architecture Overview

### 2.1 High-Level Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           DRIFTWISE PWA (Client-Side)                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐          │
│  │  PRESENTATION   │    │   APPLICATION   │    │     DOMAIN      │          │
│  │     LAYER       │    │     LAYER       │    │     LAYER       │          │
│  ├─────────────────┤    ├─────────────────┤    ├─────────────────┤          │
│  │ SvelteKit       │    │ StateManager    │    │ LocationContext │          │
│  │ Routes          │◄──►│ Orchestrator    │◄──►│ DiscoveryContext│          │
│  │ Components      │    │ EventBus        │    │ VoiceContext    │          │
│  │ Stores          │    │                 │    │ AudioContext    │          │
│  └─────────────────┘    └─────────────────┘    │ ConfigContext   │          │
│                                                 └─────────────────┘          │
│                                                          │                   │
│                                                          ▼                   │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    INFRASTRUCTURE LAYER                              │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │    │
│  │ │  Nominatim   │ │   Gemini     │ │ Gemini Live  │ │   Android    │ │    │
│  │ │   Adapter    │ │ Text Adapter │ │  API Adapter │ │ Audio Adapter│ │    │
│  │ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ │    │
│  └────────┼────────────────┼────────────────┼────────────────┼─────────┘    │
│           │                │                │                │              │
└───────────┼────────────────┼────────────────┼────────────────┼──────────────┘
            │                │                │                │
            ▼                ▼                ▼                ▼
     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────────┐
     │Nominatim │     │  Gemini  │     │  Gemini  │     │   Android    │
     │   API    │     │ Text API │     │ Live API │     │  Audio Focus │
     │  (OSM)   │     │  (REST)  │     │   (WS)   │     │     API      │
     └──────────┘     └──────────┘     └──────────┘     └──────────────┘
```

### 2.2 Technology Stack

| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| **Framework** | SvelteKit | 2.x | Excellent PWA support, small bundle, reactive stores |
| **Build Tool** | Vite | 5.x | Fast HMR, native ESM, PWA plugin ecosystem |
| **Language** | TypeScript | 5.x | Type safety, better tooling, refactoring support |
| **Mobile Bridge** | Capacitor | 6.x | Native API access (GPS, Audio) from PWA |
| **State Management** | Svelte Stores | Native | Reactive, minimal boilerplate, SSR-compatible |
| **Voice AI** | Gemini Live API | v1beta | Bidirectional audio streaming, native quality |
| **Text AI** | Gemini 2.5 Flash | Latest | Web search grounding, fast inference |
| **Geocoding** | Nominatim | - | Free, no API key, OSM data |
| **Persistence** | IndexedDB | - | Large storage, async, structured data |
| **PWA** | Vite PWA Plugin | 0.20+ | Automatic service worker, caching strategies |
| **Testing** | Vitest + Playwright | Latest | Fast unit tests, E2E browser testing |

---

## 3. Core Components & Responsibilities

### 3.1 Location Service

**Purpose:** Acquire and manage device GPS position with fallback strategies.

```typescript
interface LocationService {
  // Core acquisition
  requestLocation(): Promise<GPSCoordinates | null>;
  startPolling(intervalMs: number): void;
  stopPolling(): void;

  // Configuration
  setPollingInterval(intervalMs: number): void;
  getPollingInterval(): number;

  // State
  getCurrentLocation(): GPSCoordinates | null;
  hasLocationChanged(threshold: number): boolean;
}

interface GPSCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;      // meters
  timestamp: number;     // Unix ms
  source: 'gps' | 'network' | 'cached';
}
```

**Implementation Details:**
- Poll GPS at configurable intervals (default: 5 min, min: 2 min, max: 15 min)
- Request `enableHighAccuracy: true` from Geolocation API
- Timeout: 3 seconds for GPS, fall back to network location
- Skip cycles if position hasn't changed by >100m
- Use Capacitor `@capacitor/geolocation` for background support

**Error Handling:**
| Scenario | Behavior |
|----------|----------|
| Permission denied | Return `null`, skip cycle, prompt user once |
| GPS timeout (>3s) | Fall back to network location |
| Network location unavailable | Use cached position if <10 min old |
| All sources fail | Skip cycle silently |

---

### 3.2 Geocoding Client

**Purpose:** Reverse-geocode GPS coordinates to place names using Nominatim API.

```typescript
interface GeocodingClient {
  reverseGeocode(lat: number, lon: number): Promise<PlaceNames | null>;
  getCachedResult(lat: number, lon: number): PlaceNames | null;
}

interface PlaceNames {
  village?: string;
  town?: string;
  city?: string;
  locality?: string;
  hamlet?: string;
  suburb?: string;
  county?: string;
  state?: string;
  country?: string;
  displayName: string;
}
```

**API Integration:**
```http
GET https://nominatim.openstreetmap.org/reverse
  ?lat={latitude}
  &lon={longitude}
  &format=json
  &zoom=14
  &addressdetails=1

Headers:
  User-Agent: Driftwise/1.0 (contact@example.com)
```

**Rate Limiting:**
- Enforce 1 request per second (Nominatim policy)
- Queue requests if limit would be exceeded
- Cache results in IndexedDB (TTL: 24 hours)
- Round coordinates to 0.001 precision (~100m) for cache key

---

### 3.3 Fact Generator

**Purpose:** Query Gemini to research and generate edge-case historical facts.

```typescript
interface FactGenerator {
  generateFact(
    places: PlaceNames,
    context: SeasonalContext
  ): Promise<Fact | null>;
}

interface Fact {
  text: string;
  location: PlaceNames;
  generatedAt: number;
  confidence: 'high' | 'medium' | 'low';
}

interface SeasonalContext {
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  weather?: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
}
```

**System Prompt Template:**

```
You are a local history researcher finding fascinating, unusual facts.

PRIORITIZE:
- Specific dates, measurements, quantities
- Named individuals and their stories
- Unusual events, firsts, records
- Industrial, engineering, or scientific history
- Connections to notable historical events

EXCLUDE:
- Generic descriptions ("known for", "famous for", "picturesque")
- Regional clichés ("traditional stone cottages", "scenic views")
- Vague historical references without specifics
- Tourism-brochure language

Current context: {season}, {weather_conditions}, {time_of_day}
Location(s): {place_names}

Return ONE fascinating fact, 2-3 sentences max, ready to be spoken aloud.
If no suitable fact exists, return exactly: "NO_SUITABLE_FACT"
```

**API Configuration:**
- Model: `gemini-2.5-flash-preview`
- Tools: `googleSearch` enabled (web grounding)
- Temperature: 0.7 (balance creativity/accuracy)
- Max tokens: 150 (2-3 sentences)
- Timeout: 10 seconds

---

### 3.4 Voice Delivery Engine

**Purpose:** Manage Gemini Live API sessions for voice delivery and command listening.

```typescript
interface VoiceDeliveryEngine {
  // Session lifecycle
  openSession(): Promise<void>;
  closeSession(): Promise<void>;
  isSessionActive(): boolean;

  // Delivery
  deliverFact(fact: Fact): Promise<DeliveryResult>;

  // Commands
  listenForCommands(durationMs: number): Promise<VoiceCommand | null>;
}

interface DeliveryResult {
  status: 'completed' | 'paused' | 'skipped' | 'error';
  durationMs: number;
  followUpCommand?: VoiceCommand;
}

type VoiceCommand =
  | { type: 'pause' }
  | { type: 'continue' }
  | { type: 'skip' }
  | { type: 'increase_cadence' }
  | { type: 'decrease_cadence' }
  | { type: 'follow_up'; question: string };
```

**WebSocket Protocol:**

```
1. CONNECT
   wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent

2. SETUP
   Send: BidiGenerateContentSetup {
     model: "gemini-2.5-flash-native-audio-preview",
     generationConfig: {
       speech_config: {
         voice_config: {
           prebuilt_voice_config: { voice_name: "Puck" }
         }
       }
     },
     systemInstruction: "You are Driftwise, a friendly local history companion..."
   }

3. RECEIVE: BidiGenerateContentSetupComplete

4. SEND TEXT
   Send: BidiGenerateContentClientContent {
     turns: [{ role: "user", parts: [{ text: factText }] }]
   }

5. RECEIVE AUDIO STREAM
   Receive: BidiGenerateContentServerContent {
     modelTurn: { parts: [{ inlineData: { mimeType: "audio/pcm", data: base64Audio } }] }
   }

6. LISTEN FOR COMMANDS (5 seconds)
   Send: BidiGenerateContentRealtimeInput { audio: { data: base64Microphone } }
   Receive: Transcript + Response

7. CLOSE
   Close WebSocket connection
```

**State Machine:**

```
     ┌─────────┐
     │  IDLE   │
     └────┬────┘
          │ openSession()
          ▼
     ┌─────────┐
     │ READY   │
     └────┬────┘
          │ deliverFact()
          ▼
     ┌─────────┐    [pause]    ┌─────────┐
     │SPEAKING │──────────────►│ PAUSED  │
     └────┬────┘               └────┬────┘
          │                         │ [continue]
          │ [speech complete]       │
          │◄────────────────────────┘
          ▼
     ┌─────────┐    [timeout/skip]
     │LISTENING│───────────────────────┐
     └────┬────┘                       │
          │ [follow-up detected]       │
          ▼                            │
     ┌─────────┐                       │
     │SPEAKING │                       │
     └─────────┘                       │
          │                            │
          └────────────────────────────┘
                      │
                      ▼
                 ┌─────────┐
                 │  IDLE   │
                 └─────────┘
```

---

### 3.5 Audio Focus Manager

**Purpose:** Manage Android audio focus for navigation-like audio ducking.

```typescript
interface AudioFocusManager {
  requestFocus(type: AudioFocusType): Promise<boolean>;
  releaseFocus(): Promise<void>;
  isHoldingFocus(): boolean;
}

type AudioFocusType =
  | 'transient'           // Brief, immediate
  | 'transient_may_duck'  // Brief, other apps can duck
  | 'gain';               // Permanent (not used by Driftwise)
```

**Integration Pattern:**
```typescript
async function deliverWithAudioFocus(fact: Fact) {
  const focusGranted = await audioManager.requestFocus('transient_may_duck');

  if (!focusGranted) {
    // Another app has critical audio focus (e.g., phone call)
    return { status: 'skipped', reason: 'audio_focus_denied' };
  }

  try {
    const result = await voiceEngine.deliverFact(fact);
    return result;
  } finally {
    await audioManager.releaseFocus();
  }
}
```

**Capacitor Implementation:**
- Use `@niclaslindstedt/capacitor-audio-focus` plugin
- Request `AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK`
- Handle focus loss gracefully (pause/stop delivery)

---

### 3.6 Command Processor

**Purpose:** Parse voice transcripts into structured commands.

```typescript
interface CommandProcessor {
  parseCommand(transcript: string): VoiceCommand | null;
}

const COMMAND_PATTERNS = {
  pause: ['pause', 'wait', 'hold on', 'stop talking'],
  continue: ['continue', 'go on', 'resume', 'keep going'],
  skip: ['skip', 'next', 'stop', 'nevermind'],
  increase_cadence: ['more often', 'more facts', 'more frequently'],
  decrease_cadence: ['less often', 'fewer facts', 'quiet mode', 'less frequently']
};
```

**Matching Algorithm:**
1. Normalize transcript (lowercase, remove punctuation)
2. Check exact matches first
3. Use fuzzy matching (Levenshtein distance < 2) for variants
4. Return highest confidence match above threshold (0.8)
5. If no command matches, treat as follow-up question

---

### 3.7 State Manager

**Purpose:** Orchestrate application lifecycle and coordinate components.

```typescript
interface StateManager {
  // Lifecycle
  initialize(): Promise<void>;
  startSession(): Promise<void>;
  stopSession(): Promise<void>;

  // State observation
  subscribe(listener: StateListener): Unsubscriber;
  getState(): AppState;
}

type AppState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'geocoding'; location: GPSCoordinates }
  | { status: 'researching'; places: PlaceNames }
  | { status: 'speaking'; fact: Fact }
  | { status: 'listening'; timeout: number }
  | { status: 'paused'; fact: Fact }
  | { status: 'error'; error: AppError };
```

---

## 4. Data Flow Architecture

### 4.1 Fact Delivery Cycle (Complete Sequence)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          FACT DELIVERY CYCLE                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. [IDLE] Timer fires (every 5 minutes, configurable)                       │
│     └─► StateManager emits: GPS_POLL_START                                   │
│                                                                              │
│  2. [LOCATING] LocationService.requestLocation()                             │
│     ├─► Geolocation API: high accuracy, 3s timeout                           │
│     ├─► Success: { lat, lon, accuracy, timestamp }                           │
│     ├─► Failure: Try network fallback → cached → skip cycle                  │
│     └─► Check: hasLocationChanged(100m) → false? Skip cycle                  │
│                                                                              │
│  3. [GEOCODING] GeocodingClient.reverseGeocode(lat, lon)                     │
│     ├─► Check IndexedDB cache first (key: lat_lon rounded)                   │
│     ├─► Cache miss: Call Nominatim (enforce 1 req/sec)                       │
│     ├─► Parse response → PlaceNames { village, town, city, ... }             │
│     ├─► Cache result (TTL: 24h)                                              │
│     └─► No places found? Skip cycle                                          │
│                                                                              │
│  4. [RESEARCHING] FactGenerator.generateFact(places, context)                │
│     ├─► Enforce 15s minimum since last Gemini call                           │
│     ├─► Build system prompt with exclusions                                  │
│     ├─► Call Gemini 2.5 Flash with googleSearch tool                         │
│     ├─► Parse response                                                       │
│     │   ├─► "NO_SUITABLE_FACT" → Skip cycle                                  │
│     │   └─► Valid fact → Continue                                            │
│     └─► Timeout (10s) / Error → Skip cycle                                   │
│                                                                              │
│  5. [SPEAKING] VoiceDeliveryEngine.deliverFact(fact)                         │
│     ├─► AudioFocusManager.requestFocus('transient_may_duck')                 │
│     ├─► Open WebSocket to Gemini Live API                                    │
│     ├─► Send BidiGenerateContentSetup                                        │
│     ├─► Wait for BidiGenerateContentSetupComplete                            │
│     ├─► Send fact text as client content                                     │
│     ├─► Stream audio response to device speaker                              │
│     └─► On speech complete → Transition to LISTENING                         │
│                                                                              │
│  6. [LISTENING] VoiceDeliveryEngine.listenForCommands(5000ms)                │
│     ├─► Start 5-second timer                                                 │
│     ├─► Stream microphone to Gemini Live API                                 │
│     ├─► Receive transcript → CommandProcessor.parseCommand()                 │
│     │   ├─► "pause" → Enter PAUSED state                                     │
│     │   ├─► "continue" → Resume SPEAKING                                     │
│     │   ├─► "skip" → Close session → IDLE                                    │
│     │   ├─► "more/less often" → Update polling interval → IDLE               │
│     │   └─► Follow-up question → Send to API → SPEAKING                      │
│     ├─► Timeout (5s) → Close session → IDLE                                  │
│     └─► AudioFocusManager.releaseFocus()                                     │
│                                                                              │
│  7. [IDLE] Reset timer for next cycle                                        │
│     └─► Schedule next poll in {pollingInterval}ms                            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 API Integration Specifications

#### Nominatim Reverse Geocoding

```yaml
Endpoint: GET https://nominatim.openstreetmap.org/reverse
Parameters:
  lat: {latitude}
  lon: {longitude}
  format: json
  zoom: 14
  addressdetails: 1
Headers:
  User-Agent: "Driftwise/1.0 (contact@example.com)"
Rate Limit: 1 request/second (enforced client-side)
Timeout: 2 seconds
Retry: None (skip cycle on failure)
```

#### Gemini Text API (Fact Generation)

```yaml
Endpoint: POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent
Headers:
  x-goog-api-key: {GEMINI_API_KEY}
  Content-Type: application/json
Body:
  contents:
    - role: user
      parts:
        - text: "Generate fact about: {places}"
  systemInstruction:
    parts:
      - text: "{system_prompt}"
  tools:
    - googleSearch: {}
  generationConfig:
    temperature: 0.7
    maxOutputTokens: 150
Rate Limit: 5 RPM free tier (enforce 15s gap)
Timeout: 10 seconds
```

#### Gemini Live API (Voice Delivery)

```yaml
Protocol: WebSocket (Secure)
Endpoint: wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent
Query: key={GEMINI_API_KEY}
Session Timeout: 10 minutes
Audio Format:
  Input: PCM 16-bit 16kHz mono
  Output: PCM 16-bit 24kHz mono
Messages:
  - BidiGenerateContentSetup (client → server)
  - BidiGenerateContentSetupComplete (server → client)
  - BidiGenerateContentClientContent (client → server)
  - BidiGenerateContentRealtimeInput (client → server, audio)
  - BidiGenerateContentServerContent (server → client, audio + text)
```

---

## 5. Error Handling & Resilience

### 5.1 Error Recovery Matrix

| Component | Error Type | Recovery Strategy | User Feedback |
|-----------|------------|-------------------|---------------|
| Location | Permission denied | Skip cycle, show permission prompt once | Toast (once) |
| Location | GPS timeout | Use network fallback | None |
| Location | All sources fail | Skip cycle | None |
| Geocoding | API timeout | Skip cycle | None |
| Geocoding | Rate limit | Queue request, retry next cycle | None |
| Fact Gen | API error | Skip cycle, log error | None |
| Fact Gen | Rate limit | Increase backoff, skip cycle | None |
| Fact Gen | NO_SUITABLE_FACT | Skip cycle (expected behavior) | None |
| Voice | WebSocket fail | Fall back to toast notification | Toast |
| Voice | Audio focus denied | Skip cycle | None |
| Voice | Session timeout | Graceful close, return to IDLE | None |

### 5.2 Graceful Degradation Strategy

```
                    ┌─────────────────────────────────────┐
                    │       FULL FUNCTIONALITY            │
                    │  GPS + Nominatim + Gemini + Voice   │
                    └────────────────┬────────────────────┘
                                     │ Voice API unavailable
                                     ▼
                    ┌─────────────────────────────────────┐
                    │      TOAST NOTIFICATION MODE        │
                    │  GPS + Nominatim + Gemini + Toast   │
                    └────────────────┬────────────────────┘
                                     │ Gemini API unavailable
                                     ▼
                    ┌─────────────────────────────────────┐
                    │        CACHED FACTS MODE            │
                    │  GPS + Nominatim + Cached Facts     │
                    └────────────────┬────────────────────┘
                                     │ Network unavailable
                                     ▼
                    ┌─────────────────────────────────────┐
                    │          OFFLINE MODE               │
                    │  GPS + Cached Geocoding + Cached    │
                    └─────────────────────────────────────┘
```

---

## 6. Caching Strategy

### 6.1 IndexedDB Schema

```typescript
// Database: driftwise_db

// Store: geocoding_cache
interface GeoCacheEntry {
  key: string;           // "{lat}_{lon}" rounded to 0.001
  places: PlaceNames;
  timestamp: number;
  ttlMs: number;         // 24 hours
}

// Store: fact_history
interface FactHistoryEntry {
  id: string;            // UUID
  fact: Fact;
  location: GPSCoordinates;
  deliveredAt: number;
  userFeedback?: 'liked' | 'skipped';
}

// Store: user_preferences
interface UserPreferences {
  pollingIntervalMs: number;   // 120000 - 900000
  interestThreshold: 'low' | 'medium' | 'high';
  voicePreset: string;
  lastKnownPosition?: GPSCoordinates;
}
```

### 6.2 Cache Eviction Policies

| Store | Max Size | Eviction Policy | TTL |
|-------|----------|-----------------|-----|
| geocoding_cache | 1000 entries | LRU | 24 hours |
| fact_history | 500 entries | FIFO | 30 days |
| user_preferences | 1 entry | Overwrite | Never |

---

## 7. Security Architecture

### 7.1 V1 Security Model (Personal Use)

```
┌─────────────────────────────────────────────────────┐
│                 V1: PERSONAL USE                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  API Key Storage:                                   │
│  ├─ Build-time: Vite define plugin (VITE_*)         │
│  ├─ Runtime: .env file (not in repo)                │
│  └─ Client: Never in JS bundle directly             │
│                                                     │
│  Data Privacy:                                      │
│  ├─ No server-side storage                          │
│  ├─ Location data: Memory only during cycle         │
│  ├─ Fact history: Local IndexedDB only              │
│  └─ No analytics or tracking                        │
│                                                     │
│  Transport Security:                                │
│  ├─ All API calls over HTTPS                        │
│  ├─ WebSocket over WSS                              │
│  └─ CSP headers in PWA                              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 7.2 V2+ Security Model (Production)

```
┌─────────────────────────────────────────────────────┐
│               V2+: PRODUCTION USE                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────┐        ┌─────────────┐            │
│  │   Client    │───────►│   Backend   │            │
│  │    PWA      │        │   Proxy     │            │
│  └─────────────┘        └──────┬──────┘            │
│        │                       │                    │
│        │ Ephemeral Token       │ API Key            │
│        │ (1-hour TTL)          │ (Server-side)      │
│        │                       │                    │
│        ▼                       ▼                    │
│  ┌─────────────────────────────────────┐           │
│  │           External APIs              │           │
│  │  (Gemini, Nominatim)                 │           │
│  └─────────────────────────────────────┘           │
│                                                     │
│  Rate Limiting: Enforced at backend                 │
│  Authentication: OAuth 2.0 / API tokens             │
│  Audit Logging: Request/response logging            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 8. Performance Budgets

| Metric | Target | Measurement Point |
|--------|--------|-------------------|
| GPS Acquisition | < 3s | Geolocation API response |
| Geocoding Latency | < 2s | Nominatim round-trip |
| Fact Generation | < 10s | Gemini API response |
| Voice Session Open | < 2s | WebSocket + setup complete |
| Audio First Byte | < 500ms | First audio chunk received |
| **Total Cycle** | **< 20s** | GPS poll → speech start |
| PWA Load (cold) | < 3s | First contentful paint |
| PWA Load (cached) | < 500ms | From service worker |
| Bundle Size | < 200KB | Gzipped JS |

---

## 9. Deployment Architecture

### 9.1 PWA Manifest

```json
{
  "name": "Driftwise",
  "short_name": "Driftwise",
  "description": "Voice-first local history companion",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#1e88e5",
  "background_color": "#ffffff",
  "categories": ["travel", "education", "navigation"],
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "screenshots": [
    { "src": "/screenshots/main.png", "sizes": "1080x1920", "type": "image/png" }
  ]
}
```

### 9.2 Service Worker Strategy

| Resource Type | Strategy | Cache Name |
|---------------|----------|------------|
| Static assets (JS, CSS, fonts) | Cache First | `static-v1` |
| Images | Cache First | `images-v1` |
| API responses (Nominatim) | Network First | `api-v1` |
| Gemini API | Network Only | - |
| HTML shell | Stale While Revalidate | `shell-v1` |

---

## 10. Monitoring & Observability

### 10.1 Metrics to Track

| Category | Metric | Purpose |
|----------|--------|---------|
| **Usage** | Facts delivered per session | Engagement |
| **Usage** | Session duration | User behavior |
| **Usage** | Commands recognized | Feature adoption |
| **Performance** | API latency (p50, p95, p99) | Performance health |
| **Performance** | Voice session success rate | Reliability |
| **Errors** | API failure rate by type | Debugging |
| **Errors** | GPS acquisition failures | Device compatibility |

### 10.2 Logging Strategy (V1)

```typescript
// Client-side logging (development only)
const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;

function log(level: LogLevel, component: string, message: string, data?: unknown) {
  if (import.meta.env.DEV) {
    console[level](`[${component}] ${message}`, data);
  }
}
```

---

## 11. Future Migration Path

| Version | Enhancement | Architectural Change |
|---------|-------------|---------------------|
| **V1.1** | Offline fact caching | Pre-fetch facts for common routes |
| **V2.0** | Backend proxy | Secure API key management |
| **V2.1** | Route awareness | If destination set, preview upcoming locations |
| **V3.0** | Fact quality ML | Local model for filtering generic facts |
| **V4.0** | Multi-user | Authentication, cloud sync, shared caching |

---

**End of Architecture & Framework Document**

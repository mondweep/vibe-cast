# Driftwise: Architecture & Framework Document (AFD)

**Project:** Driftwise - AI-Powered Serendipitous Local History Companion
**Version:** 1.0
**Date:** January 2026
**Status:** Architecture Design Phase

---

## 1. Executive Summary

Driftwise is a voice-first Progressive Web Application (PWA) that delivers serendipitous historical facts about locations during routine car journeys. The architecture follows a client-centric PWA model with direct API integrations for V1 (personal use), designed for future backend-proxy scalability. This document defines the system architecture, component design, data flows, and integration patterns.

---

## 2. System Architecture Overview

### 2.1 Architecture Diagram (Text-Based)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Driftwise PWA (Client-Side)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────┐         ┌──────────────────────┐       │
│  │  Location Service  │         │  State Manager       │       │
│  │  (Geolocation API) │         │  (React/Svelte)      │       │
│  └─────────┬──────────┘         └────────┬─────────────┘       │
│            │                             │                     │
│            ▼                             ▼                     │
│  ┌─────────────────────────┐  ┌──────────────────────┐        │
│  │ Geocoding Client        │  │  Command Processor   │        │
│  │ (Nominatim Adapter)     │  │  (Voice Recognition) │        │
│  └──────────┬──────────────┘  └─────────┬────────────┘        │
│             │                           │                     │
│             ▼                           ▼                     │
│  ┌──────────────────────┐  ┌──────────────────────┐           │
│  │ Fact Generator       │  │ Audio Focus Manager  │           │
│  │ (Gemini Text API)    │  │ (Android Audio API)  │           │
│  └──────────┬───────────┘  └──────────┬───────────┘           │
│             │                         │                       │
│             └────────────┬────────────┘                        │
│                          ▼                                     │
│              ┌──────────────────────────┐                      │
│              │ Voice Delivery Engine    │                      │
│              │ (Gemini Live API)        │                      │
│              └──────────────────────────┘                      │
│                          │                                     │
└──────────────────────────┼─────────────────────────────────────┘
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
       ▼                   ▼                   ▼
   ┌──────────┐      ┌──────────┐      ┌──────────────┐
   │ Nominatim│      │  Gemini  │      │   Android    │
   │  (OSM)   │      │ Text API │      │  Audio Focus │
   └──────────┘      └──────────┘      └──────────────┘
                           │
                           ▼
                    ┌──────────────────┐
                    │ Gemini Live API  │
                    │  (WebSocket)     │
                    └──────────────────┘
```

### 2.2 Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend Framework** | SvelteKit or Ionic/Capacitor | PWA-native hybrid with excellent device API access |
| **State Management** | Svelte Stores or React Context | Simple, reactive state management with minimal overhead |
| **Location Acquisition** | Geolocation API + Capacitor | Background location support for PWA; GPS accuracy control |
| **Geocoding** | Nominatim (OpenStreetMap) | Free, no API key, 1 req/sec compliance built-in |
| **Text-based Fact Generation** | Gemini 2.5 Flash with Web Search | Current-aware facts with grounding in real web data |
| **Voice Delivery** | Gemini Live API (WebSocket) | Bidirectional audio, native quality, real-time interaction |
| **Audio Management** | Web Audio API + Android Audio Focus | Seamless audio ducking like navigation apps |
| **Build & PWA** | Vite + PWA Plugin | Fast hot-reload; automatic service worker generation |
| **Persistence** | IndexedDB (PWA Local Storage) | Client-side cache for preferences, geocoding results |
| **Deployment** | Static PWA + API Proxy (V2+) | V1: Direct API keys; V2: Backend for secure token management |

---

## 3. Core Components & Responsibilities

### 3.1 LocationService

**Purpose:** Acquire and manage device GPS position with fallback strategies.

**Responsibilities:**
- Poll GPS at configurable intervals (default: 5 min, min: 2 min, max: 15 min)
- Request high-accuracy Geolocation API (HighAccuracy mode)
- Fall back to network-based location if GPS unavailable
- Handle permission requests and graceful degradation
- Support background location access via Capacitor (PWA keepalive)
- Cache last known position; skip cycles if position hasn't changed >100m

**Key Methods:**
- `requestLocation(): Promise<GPS Coordinates>`
- `startBackgroundPolling(interval: ms)`
- `stopBackgroundPolling()`
- `setPollingInterval(newInterval: ms)`

**Error Handling:**
- No permission → Return `null`, skip cycle
- Timeout (>3 sec) → Use network fallback or skip cycle
- Network-only fallback → Proceed with lower accuracy

---

### 3.2 GeocodingClient

**Purpose:** Reverse-geocode GPS coordinates to place names using Nominatim API.

**Responsibilities:**
- Call Nominatim reverse endpoint with lat/lon
- Extract multiple place names (village, town, city, locality, hamlet, suburb)
- Handle areas with sparse data gracefully
- Respect Nominatim 1 req/sec rate limit
- Cache recent results (TTL: 24 hours) in IndexedDB
- Fallback to generic "Unknown Location" if no data

**Key Methods:**
- `reverseGeocode(lat, lon): Promise<PlaceNames>`
- `getCachedResult(lat, lon): PlaceNames | null`
- `cacheResult(lat, lon, places, ttl)`

**Rate Limiting:**
- Enforce 1 second minimum between requests
- Queue requests if limit would be exceeded
- Log warnings if rate limit is breached

---

### 3.3 FactGenerator

**Purpose:** Query Gemini to research and generate edge-case historical facts about locations.

**Responsibilities:**
- Construct system prompt prioritizing non-generic, specific facts
- Include seasonal and weather context
- Pass location names to Gemini with web search grounding enabled
- Parse response for valid fact (not "no suitable fact" marker)
- Enforce 15-second minimum gap between API calls (free tier)
- Handle rate limit errors and API failures gracefully

**Key Methods:**
- `generateFact(placeNames, season, weather): Promise<Fact>`
- `constructPrompt(places, season, weather): string`

**System Prompt Template:**
```
You are a local history researcher finding fascinating, unusual facts.

PRIORITISE:
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

Current context: {season}, {weather_conditions}
Location(s): {place_names}

Return ONE fascinating fact, 2-3 sentences max, ready to be spoken aloud.
If no suitable fact exists, return the text: "NO_SUITABLE_FACT"
```

---

### 3.4 VoiceDeliveryEngine

**Purpose:** Establish Gemini Live API session, deliver fact via speech, listen for follow-ups.

**Responsibilities:**
- Open WebSocket connection to Gemini Live API
- Send fact text for speech synthesis
- Stream audio output to device speakers
- Request Android audio focus (AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
- Release audio focus post-delivery
- Listen for 5-second window for follow-up commands
- Close session after 5-second silence or user command
- Handle session timeouts and connection failures

**State Machine:**
```
SPEAKING → [Pause] → PAUSED
SPEAKING → [Skip]  → IDLE
SPEAKING → [5s]    → LISTENING
LISTENING → [Command] → SPEAKING or PAUSED or IDLE
LISTENING → [Timeout] → IDLE
```

**Key Methods:**
- `openSession(): Promise<WebSocket>`
- `sendText(fact: string): Promise<void>`
- `requestAudioFocus(): Promise<void>`
- `releaseAudioFocus(): Promise<void>`
- `listenForCommands(duration: 5s): Promise<Command | null>`
- `closeSession(): Promise<void>`

---

### 3.5 AudioFocusManager

**Purpose:** Manage Android audio focus, enable ducking of podcasts/music during Driftwise delivery.

**Responsibilities:**
- Request `AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK` before speaking
- Monitor system audio streams
- Ensure podcasts/music duck (reduce volume)
- Release focus immediately after fact delivery
- Restore previous audio volume

**Integration Pattern:**
```typescript
await audioManager.requestFocus('transient_may_duck');
await voiceEngine.deliverFact(fact);
await audioManager.releaseFocus();
```

---

### 3.6 CommandProcessor

**Purpose:** Parse voice commands and update application behavior.

**Commands:**
- `pause` / `wait` / `hold on` → Pause speech, enter PAUSED state
- `continue` / `go on` / `resume` → Resume paused speech
- `skip` / `next` / `stop` → End session immediately
- `more often` / `more facts` → Reduce polling interval (min 2 min)
- `less often` / `fewer facts` / `quiet mode` → Increase polling interval (max 15 min)

**Responsibilities:**
- Tokenize voice transcription
- Match against command patterns (fuzzy matching)
- Update state or polling interval
- Return command result to VoiceDeliveryEngine

---

### 3.7 StateManager

**Purpose:** Manage application lifecycle, polling loops, session state.

**State Hierarchy:**
- `IDLE` → Waiting for next GPS poll cycle
- `LOCATING` → Acquiring GPS position
- `GEOCODING` → Reverse-geocoding coordinates
- `RESEARCHING` → Querying Gemini for facts
- `SPEAKING` → Live API delivering fact
- `LISTENING` → 5-second window for follow-ups
- `PAUSED` → Speech paused by user
- `ERROR` → Graceful error state

**Responsibilities:**
- Maintain application state machine
- Trigger polling cycles on timer
- Store user preferences (polling interval, interest threshold)
- Persist preferences to IndexedDB
- Restore state on app restart

---

## 4. Data Flow Architecture

### 4.1 Fact Generation Cycle (Detailed Sequence)

```
1. [IDLE] Timer fires (every 5 minutes, configurable)
   └─> Emit: GPS_POLL_START

2. [LOCATING] LocationService.requestLocation()
   ├─> Request high-accuracy GPS via Geolocation API
   ├─> Timeout: 3 seconds
   ├─> On success: lat, lon
   └─> On failure: Return network fallback or skip cycle

3. [GEOCODING] GeocodingClient.reverseGeocode(lat, lon)
   ├─> Check IndexedDB cache first
   ├─> If cache miss: Call Nominatim API
   │   ├─> Enforce 1 req/sec rate limit
   │   ├─> Parse response: Extract place_names
   │   ├─> Cache result (TTL: 24h)
   │   └─> Return: [village, town, locality, ...] or null
   ├─> If no places found: Skip cycle, log warning
   └─> Return: PlaceNames array

4. [RESEARCHING] FactGenerator.generateFact(places, season, weather)
   ├─> Enforce 15-second minimum gap since last API call
   ├─> Construct system prompt with place names
   ├─> Call Gemini 2.5 Flash (generateContent) with web search grounding
   ├─> Parse response
   │   ├─> If contains "NO_SUITABLE_FACT": Skip cycle, log info
   │   ├─> Otherwise: Extract fact text
   │   └─> Return: Fact (2-3 sentences)
   ├─> Validate fact quality (length, language)
   └─> Return: Fact or null

5. [SPEAKING] VoiceDeliveryEngine.openSession() & deliverFact()
   ├─> Open WebSocket to Gemini Live API
   ├─> Send BidiGenerateContentSetup with:
   │   ├─> Model: gemini-2.5-flash-native-audio-preview
   │   ├─> System instruction: "You are Driftwise, a friendly local history companion..."
   │   └─> Tools: None (voice only)
   ├─> Receive BidiGenerateContentSetupComplete
   ├─> AudioFocusManager.requestFocus('transient_may_duck')
   ├─> Send fact text content to Live API
   ├─> Stream audio output to device speakers
   ├─> On speech complete: Begin listening window
   └─> AudioFocusManager.releaseFocus()

6. [LISTENING] VoiceDeliveryEngine.listenForCommands(5s)
   ├─> Start 5-second timer
   ├─> Stream microphone input to Live API
   ├─> Detect user speech / commands
   ├─> Parse command via CommandProcessor
   │   ├─> If "pause": Enter PAUSED state
   │   ├─> If "continue": Resume SPEAKING
   │   ├─> If "skip": Close session, return to IDLE
   │   ├─> If "more/less often": Update polling interval, return to IDLE
   │   └─> If follow-up question: Send to Live API, continue SPEAKING
   ├─> On 5-second timeout: Close session, return to IDLE
   └─> Return: Command or null

7. [IDLE] Back to polling cycle
   └─> Reset timer for next cycle (5 min default)
```

### 4.2 API Integration Specs

#### Nominatim Reverse Geocoding
```
GET https://nominatim.openstreetmap.org/reverse
  ?lat={latitude}
  &lon={longitude}
  &format=json
  &zoom=14
  &addressdetails=1

Response:
{
  "address": {
    "village": "...",
    "town": "...",
    "city": "...",
    "locality": "...",
    "hamlet": "...",
    "suburb": "..."
  },
  "display_name": "..."
}

Rate Limit: 1 request per second (enforced client-side with queue)
Timeout: 2 seconds
Retry: No automatic retry; skip cycle on failure
```

#### Gemini Text API (Fact Generation)
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent

Request:
{
  "system": "...",
  "contents": [{
    "role": "user",
    "parts": [{"text": "Generate fact about: {places}"}]
  }],
  "tools": [{
    "googleSearch": {}
  }]
}

Response:
{
  "candidates": [{
    "content": {
      "parts": [{"text": "...fact text..."}]
    }
  }]
}

Rate Limit: Free tier ~5 RPM (enforce 15s min gap)
Timeout: 10 seconds
Error Handling: Skip cycle, log error
```

#### Gemini Live API (Voice Delivery)
```
Protocol: WebSocket
Endpoint: wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent

Session Setup:
1. Open WebSocket
2. Send: BidiGenerateContentSetup
   {
     "model": "gemini-2.5-flash-native-audio-preview-12-2025",
     "generationConfig": { "speech_config": { "voice_config": { "prebuilt_voice_config": { "voice_name": "Puck" } } } },
     "systemInstruction": "You are Driftwise, a friendly local history companion..."
   }
3. Receive: BidiGenerateContentSetupComplete

Delivery:
1. Send: Content (fact text)
2. Receive: Audio chunks (streamed)
3. Play audio immediately

Listening:
1. Send: Audio (from microphone, PCM 16-bit 16kHz)
2. Receive: Transcript & responses
3. Parse commands, update state

Close:
- Manual close after 5s silence
- Session timeout: 10 minutes
- User command: "skip"
```

---

## 5. Error Handling & Resilience

### 5.1 Error Recovery Strategy

| Scenario | Behavior | User Feedback |
|----------|----------|-----------------|
| **No GPS signal** | Skip cycle, retry next interval | Silent (no interruption) |
| **Geocoding API fails** | Skip cycle, don't cache | Silent |
| **Gemini rate limit** | Skip cycle, increase backoff | None |
| **Gemini API error** | Skip cycle, log error | None |
| **Live API connection fails** | Fall back to text notification (toast) | Optional toast |
| **No interesting facts** | Skip cycle (system returned NO_SUITABLE_FACT) | Silent |
| **Network offline** | Queue facts, resume when online | Optional status indicator |
| **Low battery** | Auto-increase polling interval | Optional notification |

### 5.2 Graceful Degradation

**GPS unavailable:** Use network-based location (lower accuracy)
**Geocoding sparse:** Skip cycle instead of generic content
**API rate limit:** Increase 15-second gap between Gemini calls
**Live API down:** Show toast: "Unable to deliver fact, try again later"
**Voice recognition fails:** Re-prompt for command or skip

---

## 6. Caching Strategy

### 6.1 IndexedDB Stores

**Store: `geocoding_cache`**
- Key: `{latitude}_{longitude}` (rounded to 0.001 precision, ~100m)
- Value: `{ places: [...], timestamp, ttl_ms }`
- TTL: 24 hours
- Purpose: Reduce Nominatim API calls for repeated locations

**Store: `user_preferences`**
- Key: `polling_interval` | `interest_threshold` | `voice_preset`
- Value: User-configured values
- Purpose: Persist settings across sessions

**Store: `session_history`**
- Key: Timestamp-based
- Value: `{ fact, location, timestamp, command_feedback }`
- Purpose: Avoid repeating facts on regular routes

---

## 7. Performance Budgets

| Component | Target | Impact |
|-----------|--------|--------|
| GPS acquisition | < 3 seconds | Delay before geocoding |
| Nominatim call | < 2 seconds | Geocoding latency |
| Gemini fact generation | < 10 seconds | Research latency |
| Live API session open | < 2 seconds | Speech start delay |
| **Total cycle (GPS → speech)** | **< 20 seconds** | Acceptable for 5-min polling |

---

## 8. Security Architecture

### 8.1 API Key Management

**V1 (Personal Use):**
- Gemini API key stored in `.env` file (not in code)
- Loaded at build time or runtime
- Never exposed in client bundles

**V2+ (Production):**
- Backend proxy for secure token generation
- Client receives ephemeral token (short-lived, ~1 hour)
- API key never exposed to client
- Rate limiting enforced at backend

### 8.2 Data Privacy

- **No persistent location history** stored locally or remotely
- Location only in memory during fact delivery cycle
- No user tracking or analytics (V1)
- All communication via HTTPS/WSS only
- Geolocation permission explicit per user

---

## 9. Deployment Considerations

### 9.1 PWA Manifest Configuration

```json
{
  "name": "Driftwise",
  "short_name": "Driftwise",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#1e88e5",
  "background_color": "#ffffff",
  "categories": ["travel", "education"],
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 9.2 Service Worker Strategy

- Cache static assets (CSS, JS, fonts) with Cache-First strategy
- Network-First for API calls (Nominatim, Gemini)
- Stale-While-Revalidate for preference data
- Pre-cache critical assets on first load

---

## 10. Monitoring & Observability

### 10.1 Metrics to Track

- Fact delivery frequency (facts/hour)
- Audio focus request success rate
- API latency (Nominatim, Gemini)
- Command recognition accuracy
- Session completion rate (listening window)
- Battery consumption impact

---

## 11. Next Steps & Migration Path

1. **V1 → V2:** Introduce backend proxy for secure key management
2. **V2 → V3:** Add location-aware fact filtering, avoid repetition
3. **V3 → V4:** Route awareness (if destination set, preview upcoming locations)
4. **V4+:** Multi-user support, shared caching, analytics

---

**End of Architecture & Framework Document**

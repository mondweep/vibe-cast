# Driftwise: Domain-Driven Design (DDD) - Strategic Overview

**Project:** Driftwise - AI-Powered Serendipitous Local History Companion
**Version:** 1.0
**Date:** January 2026
**Methodology:** Domain-Driven Design (Evans)

---

## 1. Domain Vision Statement

Driftwise transforms routine journeys into opportunities for authentic discovery by delivering serendipitous, edge-case historical facts about locations—without requiring user effort or distraction from driving. The core domain is **"Serendipitous Historical Discovery"**: connecting drivers with fascinating, specific stories about places they pass through, fostering curiosity and deeper place awareness.

---

## 2. Ubiquitous Language

**Key Domain Terms:**

| Term | Definition | Context |
|------|-----------|---------|
| **Serendipitous Fact** | An edge-case, non-obvious historical fact delivered at the right moment | Core domain value |
| **Location Context** | GPS coordinates + reverse-geocoded place names within ~1-2km radius | The "where" of discovery |
| **Fact Delivery** | Single cycle: research, synthesize, voice delivery, optional follow-up | Transaction unit |
| **Cadence** | User-configurable polling interval (2-15 minutes) | Controls frequency of delivery |
| **Audio Interruption** | Request audio focus, duck other audio, deliver speech, restore | Navigation-like behavior |
| **Interest Threshold** | Filtering mechanism: exclude generic, prioritize specific facts | Quality gate |
| **Voice Session** | WebSocket connection: text input, voice output, command listening | Interaction container |
| **Pause/Continue** | User-initiated pause of speech delivery | Transient state |
| **Skip** | Immediate termination of current fact cycle | User control |
| **Follow-up Question** | User-asked question within 5-second listening window | Dialog extension |

---

## 3. Bounded Contexts

Driftwise decomposes into **five distinct bounded contexts**, each with its own models and languages:

### 3.1 Location Context

**Responsibility:** Acquire, manage, and interpret geographic position.

**Key Concepts:**
- GPS Coordinates (lat, lon, accuracy, timestamp)
- Location Estimate (coarse vs fine)
- Reverse Geocoding (coordinate → place names)
- Place Name Collection (village, town, locality, etc.)
- Location Change Detection (threshold: 100m)

**Core Entities:**
- `Location` (coordinate + places)
- `GeolocationState` (REQUESTING, ACQUIRED, FAILED)

**Value Objects:**
- `GPSCoordinates { latitude, longitude, accuracy, timestamp }`
- `PlaceNames { [place_type: string]: place_name }`
- `LocationDelta { previous, current, distance_m }`

**Repositories:**
- `LocationRepository` (cache + real-time stream)

**Key Aggregates:**
- **LocationAggregate**
  - Root: `Location`
  - Entities: `GPSAcquisition`, `GeocodeResult`
  - Invariants: Coordinates must be valid; Places must be non-empty

**Anti-Corruption Layer:** Nominatim Adapter
- Transforms Nominatim JSON → PlaceNames value object
- Handles nulls, sparse data gracefully

---

### 3.2 Historical Discovery Context

**Responsibility:** Research, synthesize, and quality-filter historical facts.

**Key Concepts:**
- Historical Fact (specific, verifiable, non-generic)
- Fact Generation (AI research + synthesis)
- Quality Assessment (exclude clichés, prioritize specifics)
- Fact Freshness (avoid repetition on familiar routes)
- Interest-Based Filtering (user-configured)

**Core Entities:**
- `HistoricalFact`
- `FactQuality` (ACCEPTABLE, GENERIC, NO_SUITABLE_FACT)

**Value Objects:**
- `Fact { text: string, source_location: PlaceNames, generated_at: timestamp }`
- `FactMetadata { season, weather_context, confidence_level }`
- `QualityAssessment { is_generic, contains_specifics, confidence }`

**Repositories:**
- `FactRepository` (in-memory cache, avoid repetition)

**Key Aggregates:**
- **FactDeliveryAggregate**
  - Root: `FactDelivery`
  - Value Objects: `Fact`, `HistoricalContext`, `QualityAssessment`
  - Invariants: Fact must be unique; Quality must be ACCEPTABLE; Length 2-3 sentences

**Domain Services:**
- `FactGenerationService` (Gemini integration)
  - Input: Location, Seasonal Context
  - Output: Fact or NO_SUITABLE_FACT marker
  - Logic: System prompt, grounding, parsing

- `QualityFilterService`
  - Input: Raw fact text
  - Output: ACCEPTABLE / GENERIC / INVALID
  - Logic: Exclude generic phrases, prioritize specifics

**Anti-Corruption Layer:** Gemini API Adapter
- Transforms Gemini response → Fact value object
- Handles "NO_SUITABLE_FACT" marker
- Manages API rate limiting (15-second gap)

---

### 3.3 Voice Interaction Context

**Responsibility:** Manage real-time bidirectional dialog via voice.

**Key Concepts:**
- Voice Session (WebSocket lifecycle)
- Speech Synthesis (text → audio)
- Speech Recognition (audio → transcript → command)
- Command Intent (pause, continue, skip, more/less often, follow-up Q)
- Dialog State (SPEAKING, LISTENING, PAUSED, ENDED)

**Core Entities:**
- `VoiceSession`
- `Command` (command_type, parameters)
- `DialogTurn` (who spoke, what was said, timestamp)

**Value Objects:**
- `VoiceCommand { intent: CommandType, parameters: Map }`
- `TranscriptConfidence { text, confidence_score, alternatives }`
- `AudioMetadata { duration_ms, sample_rate, format }`

**Repositories:**
- `VoiceSessionRepository` (active sessions)

**Key Aggregates:**
- **VoiceSessionAggregate**
  - Root: `VoiceSession`
  - Entities: `Turn`, `Command`
  - Invariants: Only one active session; Session timeout 10 min
  - State Machine: IDLE → SPEAKING → LISTENING → (PAUSED or IDLE)

**Domain Services:**
- `SpeechSynthesisService`
  - Input: Fact text
  - Output: Audio stream
  - Logic: Gemini Live API integration

- `CommandRecognitionService`
  - Input: Transcript
  - Output: Command intent + confidence
  - Logic: Fuzzy matching against command patterns

**Anti-Corruption Layer:** Gemini Live API Adapter
- WebSocket connection management
- Audio format translation (PCM 16-bit 16kHz)
- Transcript parsing

---

### 3.4 Audio Management Context

**Responsibility:** Control device audio playback, request/release focus.

**Key Concepts:**
- Audio Focus (system-level priority mechanism)
- Audio Ducking (reduce volume of other apps)
- Audio Stream Types (music, podcast, navigation, alarm)
- Focus Duration (transient, can be interrupted)

**Core Entities:**
- `AudioFocusRequest`
- `AudioStream` (app, volume, stream_type)

**Value Objects:**
- `FocusType { PERMANENT, TRANSIENT, TRANSIENT_MAY_DUCK }`
- `Volume { level: 0-100 }`

**Repositories:**
- `AudioStreamRepository` (active streams)

**Key Aggregates:**
- **AudioFocusAggregate**
  - Root: `AudioFocus`
  - Invariants: Only one permanent focus; Transient automatically released

**Domain Services:**
- `AudioFocusManager`
  - Methods: requestFocus(), releaseFocus(), duckOtherAudio()
  - Logic: Android Audio Manager API integration

**Anti-Corruption Layer:** Android Audio API Adapter
- Handles native platform audio focus requests

---

### 3.5 Configuration Context

**Responsibility:** Store and manage user preferences, settings, and tuning parameters.

**Key Concepts:**
- Polling Interval (how often to check location)
- Interest Threshold (quality filtering sensitivity)
- Voice Presets (voice character, speech rate)
- App State (current mode, session data)

**Core Entities:**
- `UserPreferences`
- `AppConfiguration`

**Value Objects:**
- `PollingInterval { min_ms: 120000, max_ms: 900000, current_ms }`
- `InterestThreshold { level: LOW | MEDIUM | HIGH }`

**Repositories:**
- `PreferencesRepository` (persistent, IndexedDB)

**Key Aggregates:**
- **UserPreferencesAggregate**
  - Root: `UserPreferences`
  - Invariants: Polling interval within [2min, 15min]; Threshold must be valid

---

## 4. Domain Events

**Events represent significant state changes and enable eventual consistency across contexts:**

| Event | Emitted By | Consumed By | Payload |
|-------|-----------|-------------|---------|
| `LocationAcquired` | Location Context | Fact Discovery | `{ location: Location, timestamp }` |
| `LocationChanged` | Location Context | Fact Discovery | `{ previous, current, distance_m }` |
| `FactGenerated` | Fact Discovery | Voice Interaction | `{ fact: Fact, quality: QualityAssessment }` |
| `FactDeliveryStarted` | Voice Interaction | Audio Management | `{ session_id, fact }` |
| `SpeechBegun` | Voice Interaction | Audio Management | `{ session_id, timestamp }` |
| `CommandRecognized` | Voice Interaction | Configuration | `{ command: VoiceCommand, confidence }` |
| `SessionEnded` | Voice Interaction | Fact Discovery | `{ session_id, reason: COMPLETED | SKIPPED | PAUSED }` |
| `PreferenceChanged` | Configuration | Location Context | `{ preference: POLLING_INTERVAL, value }` |
| `ErrorOccurred` | Any | Logging, Monitoring | `{ error_type, context, timestamp }` |

---

## 5. Anti-Corruption Layers (ACL)

**Purpose:** Isolate domain from external API changes.

### 5.1 Nominatim Adapter

```
External Nominatim JSON → Domain PlaceNames Value Object
|
├─ Null/empty fields → Graceful skip
├─ Multiple address levels → Flatten to PlaceNames map
└─ Confidence scores → Translate to domain confidence
```

### 5.2 Gemini API Adapter

```
External Gemini Response → Domain Fact or NO_SUITABLE_FACT
|
├─ Token parsing → Extract text content
├─ Error codes → Map to domain error types
├─ Rate limit → Queue requests, enforce 15-second gap
└─ "NO_SUITABLE_FACT" marker → Skip cycle signal
```

### 5.3 Android Audio Focus Adapter

```
Native Android Audio Manager API → Domain AudioFocus Model
|
├─ Platform constants → Map to FocusType enum
├─ Permission checks → Validation at adapter boundary
└─ Native callbacks → Translate to domain events
```

---

## 6. Strategic Design Patterns

### 6.1 Aggregate Boundaries

**Rule:** Each aggregate is independently testable and deployable.

- **LocationAggregate:** GPS data + geocoded places (tightly coupled)
- **FactDeliveryAggregate:** Fact + metadata + quality assessment (tightly coupled)
- **VoiceSessionAggregate:** Session + turns + commands (tightly coupled)
- **UserPreferencesAggregate:** All user settings (independent)
- **AudioFocusAggregate:** Focus requests + streams (independent)

**Invariants** (business rules enforced at aggregate level):
- Fact must have non-empty text and location
- Polling interval must be 2-15 minutes
- Voice session times out after 10 minutes
- Only one active audio focus request per app

### 6.2 Command Objects

Commands represent user-initiated actions:

```
CommandType enum:
- PAUSE_DELIVERY
- CONTINUE_DELIVERY
- SKIP_FACT
- INCREASE_CADENCE
- DECREASE_CADENCE
- ASK_FOLLOW_UP_QUESTION
```

### 6.3 Service Layer

Services orchestrate domain logic across boundaries:

```
- LocationService: Acquire position
- GeocodingService: Reverse-geocode
- FactGenerationService: Research & synthesize
- VoiceDeliveryService: Manage session lifecycle
- AudioManagementService: Handle focus
- PreferenceService: Store/restore settings
```

---

## 7. Implementation Roadmap by Bounded Context

### Phase 1: Foundation (Weeks 1-2)

**Location Context + Configuration Context**
- Implement `LocationAggregate`, `Location`, `GPSCoordinates`
- Implement `UserPreferencesAggregate`
- Integrate Geolocation API
- Tests: Unit + integration

### Phase 2: Discovery Engine (Weeks 2-3)

**Historical Discovery Context**
- Implement `FactDeliveryAggregate`, `Fact`
- Implement `FactGenerationService`
- Integrate Nominatim (ACL)
- Integrate Gemini Text API
- Tests: Unit + Gemini mock

### Phase 3: Voice Interaction (Weeks 3-4)

**Voice Interaction Context**
- Implement `VoiceSessionAggregate`, `VoiceSession`, `Command`
- Implement `SpeechSynthesisService`, `CommandRecognitionService`
- Integrate Gemini Live API (ACL)
- Tests: Unit + WebSocket mock

### Phase 4: Audio Management (Week 4)

**Audio Management Context**
- Implement `AudioFocusAggregate`
- Implement `AudioManagementService`
- Integrate Android Audio API (ACL via Capacitor)
- Tests: Unit + platform-specific

### Phase 5: Integration & Polish (Weeks 5-6)

- End-to-end tests (Location → Fact → Voice)
- Error handling, retry logic
- PWA optimization, service worker
- Deployment, monitoring setup

---

## 8. Dependency Graph (Contexts)

```
Configuration Context
        ↑
        │ (reads preferences)
        │
Location Context ───────→ Historical Discovery Context
        ↓                           ↓
        │                           │
        └─→ Voice Interaction Context ←─────┘
                        ↓
                 Audio Management Context
```

---

## 9. Key Insights for Implementation

1. **Aggregate Isolation:** Each aggregate is independently testable; communication via domain events or repositories.

2. **Anti-Corruption Layers:** APIs hidden behind adapters; domain models never depend on external APIs.

3. **Ubiquitous Language:** Use domain terms (Fact, Cadence, Audio Interruption) consistently in code, tests, docs.

4. **State Machines:** Model Voice Session as explicit state machine (IDLE → SPEAKING → LISTENING → PAUSED).

5. **Error Handling:** Graceful degradation; skip cycles rather than crashing or showing generic content.

6. **Event-Driven:** Domain events (LocationAcquired, FactGenerated, CommandRecognized) enable loose coupling.

---

**End of DDD Strategic Overview**

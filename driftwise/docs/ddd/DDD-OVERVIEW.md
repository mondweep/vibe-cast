# Driftwise: Domain-Driven Design (DDD) Overview

**Project:** Driftwise - Voice-First Serendipitous Local History Companion
**Version:** 1.0.0
**Methodology:** Domain-Driven Design (Eric Evans)
**Last Updated:** January 2026

---

## 1. Domain Vision Statement

> **Driftwise transforms routine journeys into opportunities for authentic discovery by delivering serendipitous, edge-case historical facts about locations—without requiring user effort or distraction from driving.**

The core domain is **Serendipitous Historical Discovery**: connecting drivers with fascinating, specific stories about places they pass through, fostering curiosity and deeper place awareness.

### Strategic Goals

1. **Minimize Friction**: Zero manual interaction required during driving
2. **Maximize Relevance**: Facts tied to exact location, not regional generalities
3. **Ensure Quality**: Specific, verifiable facts over tourism platitudes
4. **Respect Attention**: Audio-first, non-intrusive, pausable delivery

---

## 2. Ubiquitous Language

The following terms constitute the shared vocabulary across code, documentation, and conversation:

| Term | Definition | Example |
|------|------------|---------|
| **Serendipitous Fact** | An edge-case, non-obvious historical fact delivered without user request | "In 1842, the first telegraph line in England ran through this exact village" |
| **Location Context** | GPS coordinates + reverse-geocoded place names (village, town, etc.) | `{ lat: 51.5, lon: -0.1, places: { town: "Reading" } }` |
| **Fact Delivery** | Single cycle: locate → research → speak → listen | One complete user interaction |
| **Cadence** | User-configurable polling interval (2-15 minutes) | "More often" decreases cadence |
| **Audio Interruption** | Request audio focus, duck other audio, deliver speech, restore | Like navigation announcements |
| **Interest Threshold** | Quality filter sensitivity for excluding generic facts | High threshold = fewer, better facts |
| **Voice Session** | WebSocket connection for bidirectional audio | Lasts until timeout or command |
| **Pause/Continue** | User-initiated temporary halt of speech | "Hold on" → "Continue" |
| **Skip** | Immediate termination of current delivery | "Skip" or "Next" |
| **Follow-up Question** | User-asked question within 5-second listening window | "Tell me more about that" |
| **Cycle** | One complete polling iteration (may skip if no fact found) | ~5 minutes between cycles |
| **Place Names** | Structured set of location names at different granularities | `{ hamlet, village, town, city, county, country }` |

---

## 3. Bounded Contexts

Driftwise decomposes into **five bounded contexts**, each with independent models, clear responsibilities, and defined integration points.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CONTEXT MAP                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    ┌──────────────────────┐          ┌──────────────────────┐              │
│    │ CONFIGURATION        │          │    LOCATION          │              │
│    │ CONTEXT              │◄────────►│    CONTEXT           │              │
│    │                      │ reads    │                      │              │
│    │ • UserPreferences    │ prefs    │ • GPSCoordinates     │              │
│    │ • PollingInterval    │          │ • PlaceNames         │              │
│    │ • InterestThreshold  │          │ • GeocodeResult      │              │
│    └──────────────────────┘          └──────────┬───────────┘              │
│                                                  │                          │
│                                                  │ LocationAcquired         │
│                                                  ▼ event                    │
│                                      ┌──────────────────────┐              │
│                                      │ HISTORICAL DISCOVERY │              │
│                                      │ CONTEXT              │              │
│                                      │                      │              │
│                                      │ • HistoricalFact     │              │
│                                      │ • QualityAssessment  │              │
│                                      │ • SeasonalContext    │              │
│                                      └──────────┬───────────┘              │
│                                                  │                          │
│                                                  │ FactGenerated            │
│                                                  ▼ event                    │
│                                      ┌──────────────────────┐              │
│                                      │ VOICE INTERACTION    │              │
│                                      │ CONTEXT              │              │
│                                      │                      │              │
│                                      │ • VoiceSession       │              │
│                                      │ • VoiceCommand       │              │
│                                      │ • DialogTurn         │              │
│                                      └──────────┬───────────┘              │
│                                                  │                          │
│                                                  │ SpeechBegun              │
│                                                  ▼ event                    │
│                                      ┌──────────────────────┐              │
│                                      │ AUDIO MANAGEMENT     │              │
│                                      │ CONTEXT              │              │
│                                      │                      │              │
│                                      │ • AudioFocus         │              │
│                                      │ • AudioStream        │              │
│                                      │ • FocusType          │              │
│                                      └──────────────────────┘              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3.1 Location Context

**Responsibility:** Acquire, manage, and interpret geographic position.

### Domain Model

```typescript
// ══════════════════════════════════════════════════════════════════════════
// VALUE OBJECTS
// ══════════════════════════════════════════════════════════════════════════

interface GPSCoordinates {
  readonly latitude: number;       // -90 to 90
  readonly longitude: number;      // -180 to 180
  readonly accuracy: number;       // meters
  readonly timestamp: number;      // Unix milliseconds
  readonly source: 'gps' | 'network' | 'cached';
}

interface PlaceNames {
  readonly hamlet?: string;
  readonly village?: string;
  readonly town?: string;
  readonly city?: string;
  readonly locality?: string;
  readonly suburb?: string;
  readonly county?: string;
  readonly state?: string;
  readonly country?: string;
  readonly displayName: string;
}

interface LocationDelta {
  readonly previous: GPSCoordinates;
  readonly current: GPSCoordinates;
  readonly distanceMeters: number;
}

// ══════════════════════════════════════════════════════════════════════════
// ENTITIES
// ══════════════════════════════════════════════════════════════════════════

interface Location {
  readonly id: string;
  readonly coordinates: GPSCoordinates;
  readonly places: PlaceNames;
  readonly acquiredAt: number;
}

// ══════════════════════════════════════════════════════════════════════════
// AGGREGATE ROOT
// ══════════════════════════════════════════════════════════════════════════

class LocationAggregate {
  private currentLocation: Location | null = null;
  private previousLocation: Location | null = null;

  // Commands
  updateLocation(coordinates: GPSCoordinates, places: PlaceNames): Location;
  clearLocation(): void;

  // Queries
  getCurrentLocation(): Location | null;
  hasLocationChanged(thresholdMeters: number): boolean;
  getLocationDelta(): LocationDelta | null;

  // Invariants
  // - Coordinates must be valid (lat: -90..90, lon: -180..180)
  // - Places must have at least one non-null field
  // - Timestamp must be in the past
}
```

### Domain Events

| Event | Payload | Triggered When |
|-------|---------|----------------|
| `LocationAcquired` | `{ location: Location }` | GPS successfully obtained and geocoded |
| `LocationChanged` | `{ delta: LocationDelta }` | Location moved > threshold since last cycle |
| `LocationUnavailable` | `{ reason: string }` | All location sources failed |

### Anti-Corruption Layer

**Nominatim Adapter** transforms external API responses to domain models:

```typescript
interface NominatimAdapter {
  // External → Domain transformation
  reverseGeocode(lat: number, lon: number): Promise<PlaceNames | null>;
}

// Implementation handles:
// - Null/empty address fields → graceful omission
// - Multiple granularity levels → unified PlaceNames
// - Rate limiting → 1 req/sec queue
// - Caching → IndexedDB with TTL
```

---

## 3.2 Historical Discovery Context

**Responsibility:** Research, synthesize, and quality-filter historical facts.

### Domain Model

```typescript
// ══════════════════════════════════════════════════════════════════════════
// VALUE OBJECTS
// ══════════════════════════════════════════════════════════════════════════

interface SeasonalContext {
  readonly season: 'spring' | 'summer' | 'autumn' | 'winter';
  readonly weather?: string;
  readonly timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
}

interface QualityAssessment {
  readonly score: number;          // 0-100
  readonly isGeneric: boolean;
  readonly containsSpecifics: boolean;
  readonly containsExclusions: boolean;
  readonly verdict: 'acceptable' | 'generic' | 'invalid';
}

interface FactMetadata {
  readonly sourceLocation: PlaceNames;
  readonly seasonalContext: SeasonalContext;
  readonly generatedAt: number;
  readonly researchDurationMs: number;
}

// ══════════════════════════════════════════════════════════════════════════
// ENTITIES
// ══════════════════════════════════════════════════════════════════════════

interface HistoricalFact {
  readonly id: string;
  readonly text: string;             // 2-3 sentences, ready for speech
  readonly metadata: FactMetadata;
  readonly quality: QualityAssessment;
}

// ══════════════════════════════════════════════════════════════════════════
// AGGREGATE ROOT
// ══════════════════════════════════════════════════════════════════════════

class FactDeliveryAggregate {
  private currentFact: HistoricalFact | null = null;
  private deliveryHistory: string[] = [];  // Fact IDs to prevent repetition

  // Commands
  generateFact(location: Location, context: SeasonalContext): Promise<HistoricalFact | null>;
  markDelivered(factId: string): void;
  clearHistory(): void;

  // Queries
  getCurrentFact(): HistoricalFact | null;
  wasRecentlyDelivered(factText: string): boolean;

  // Invariants
  // - Fact text must be 50-500 characters
  // - Quality verdict must be 'acceptable'
  // - Fact must not repeat within session
}
```

### Domain Services

```typescript
// ══════════════════════════════════════════════════════════════════════════
// FACT GENERATION SERVICE
// ══════════════════════════════════════════════════════════════════════════

interface FactGenerationService {
  research(location: Location, context: SeasonalContext): Promise<string | null>;
}

// ══════════════════════════════════════════════════════════════════════════
// QUALITY FILTER SERVICE
// ══════════════════════════════════════════════════════════════════════════

interface QualityFilterService {
  assess(factText: string): QualityAssessment;
}

// Quality rules:
const EXCLUSION_PATTERNS = [
  /known for/i,
  /famous for/i,
  /picturesque/i,
  /charming/i,
  /traditional/i,
  /scenic/i,
  /quaint/i,
  /historic town/i,
];

const INCLUSION_PATTERNS = [
  /in \d{4}/,           // Specific years
  /\d+ (meters?|feet|miles?|km)/i,  // Measurements
  /[A-Z][a-z]+ [A-Z][a-z]+/,  // Named individuals
  /first|only|largest|smallest/i,  // Records
];
```

### Domain Events

| Event | Payload | Triggered When |
|-------|---------|----------------|
| `FactGenerated` | `{ fact: HistoricalFact }` | Valid fact researched and passed quality filter |
| `NoSuitableFact` | `{ location: Location, reason: string }` | Research returned NO_SUITABLE_FACT or failed filter |
| `FactResearchFailed` | `{ error: string }` | API error or timeout |

### Anti-Corruption Layer

**Gemini API Adapter** transforms AI responses to domain models:

```typescript
interface GeminiTextAdapter {
  generateContent(prompt: string, tools: Tool[]): Promise<string>;
}

// Implementation handles:
// - "NO_SUITABLE_FACT" marker → null return
// - Token parsing → clean text extraction
// - Rate limiting → 15-second minimum gap
// - Error codes → domain error types
```

---

## 3.3 Voice Interaction Context

**Responsibility:** Manage real-time bidirectional dialog via voice.

### Domain Model

```typescript
// ══════════════════════════════════════════════════════════════════════════
// VALUE OBJECTS
// ══════════════════════════════════════════════════════════════════════════

type CommandType =
  | 'pause'
  | 'continue'
  | 'skip'
  | 'increase_cadence'
  | 'decrease_cadence'
  | 'follow_up';

interface VoiceCommand {
  readonly type: CommandType;
  readonly confidence: number;       // 0-1
  readonly transcript?: string;      // For follow_up type
}

interface TranscriptResult {
  readonly text: string;
  readonly confidence: number;
  readonly alternatives: string[];
  readonly isFinal: boolean;
}

interface DialogTurn {
  readonly id: string;
  readonly speaker: 'assistant' | 'user';
  readonly content: string;
  readonly timestamp: number;
  readonly durationMs?: number;
}

type SessionState =
  | 'idle'
  | 'connecting'
  | 'ready'
  | 'speaking'
  | 'listening'
  | 'paused'
  | 'closing'
  | 'closed'
  | 'error';

// ══════════════════════════════════════════════════════════════════════════
// ENTITIES
// ══════════════════════════════════════════════════════════════════════════

interface VoiceSession {
  readonly id: string;
  readonly state: SessionState;
  readonly turns: DialogTurn[];
  readonly startedAt: number;
  readonly lastActivityAt: number;
}

// ══════════════════════════════════════════════════════════════════════════
// AGGREGATE ROOT
// ══════════════════════════════════════════════════════════════════════════

class VoiceSessionAggregate {
  private session: VoiceSession | null = null;

  // Commands
  openSession(): Promise<void>;
  closeSession(): Promise<void>;
  deliverSpeech(text: string): Promise<void>;
  pauseSpeech(): void;
  resumeSpeech(): void;
  startListening(durationMs: number): Promise<VoiceCommand | null>;
  processCommand(command: VoiceCommand): void;

  // Queries
  getSession(): VoiceSession | null;
  getState(): SessionState;
  isActive(): boolean;
  getTurns(): DialogTurn[];

  // Invariants
  // - Only one active session at a time
  // - Session timeout: 10 minutes
  // - State transitions must follow state machine
}
```

### State Machine

```
                          openSession()
                    ┌─────────────────────────┐
                    │                         ▼
               ┌─────────┐              ┌──────────┐
               │  idle   │              │connecting│
               └─────────┘              └────┬─────┘
                    ▲                        │ connected
                    │                        ▼
                    │                   ┌─────────┐
                    │                   │  ready  │
                    │                   └────┬────┘
                    │                        │ deliverSpeech()
                    │                        ▼
                    │                   ┌─────────┐   pauseSpeech()   ┌─────────┐
                    │                   │speaking │◄─────────────────►│ paused  │
                    │                   └────┬────┘   resumeSpeech()  └─────────┘
                    │                        │
                    │                        │ speech complete
                    │                        ▼
                    │                   ┌─────────┐
                    │                   │listening│
                    │                   └────┬────┘
                    │                        │
                    │     ┌──────────────────┼──────────────────┐
                    │     │                  │                  │
                    │     │ follow-up        │ timeout          │ skip
                    │     ▼                  ▼                  ▼
                    │ ┌─────────┐       ┌─────────┐        ┌─────────┐
                    │ │speaking │       │ closing │        │ closing │
                    │ └─────────┘       └────┬────┘        └────┬────┘
                    │                        │                  │
                    │                        └────────┬─────────┘
                    │                                 │
                    │                                 ▼
                    │                           ┌─────────┐
                    └───────────────────────────│ closed  │
                                                └─────────┘
```

### Domain Events

| Event | Payload | Triggered When |
|-------|---------|----------------|
| `VoiceSessionOpened` | `{ sessionId: string }` | WebSocket connected and setup complete |
| `SpeechBegun` | `{ sessionId, turn: DialogTurn }` | Audio output started |
| `SpeechPaused` | `{ sessionId }` | User command paused delivery |
| `SpeechResumed` | `{ sessionId }` | User command resumed delivery |
| `SpeechCompleted` | `{ sessionId, durationMs }` | Audio output finished |
| `CommandRecognized` | `{ command: VoiceCommand }` | User voice command parsed |
| `ListeningTimeout` | `{ sessionId }` | 5-second window expired |
| `VoiceSessionClosed` | `{ sessionId, reason: string }` | Session ended |

### Anti-Corruption Layer

**Gemini Live API Adapter** manages WebSocket protocol:

```typescript
interface GeminiLiveAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendText(text: string): Promise<void>;
  sendAudio(pcmData: ArrayBuffer): Promise<void>;
  onAudio(callback: (pcmData: ArrayBuffer) => void): void;
  onTranscript(callback: (result: TranscriptResult) => void): void;
}

// Implementation handles:
// - WebSocket connection lifecycle
// - BidiGenerateContent message protocol
// - Audio format conversion (PCM 16-bit 16kHz)
// - Transcript parsing and confidence scoring
```

---

## 3.4 Audio Management Context

**Responsibility:** Control device audio playback and focus.

### Domain Model

```typescript
// ══════════════════════════════════════════════════════════════════════════
// VALUE OBJECTS
// ══════════════════════════════════════════════════════════════════════════

type FocusType =
  | 'gain'                    // Permanent focus (not used)
  | 'transient'               // Brief, immediate
  | 'transient_may_duck';     // Brief, other apps can lower volume

type FocusResult =
  | 'granted'
  | 'delayed'
  | 'failed';

interface AudioStreamInfo {
  readonly streamType: 'music' | 'podcast' | 'navigation' | 'alarm' | 'call';
  readonly isPlaying: boolean;
  readonly volume: number;     // 0-100
}

// ══════════════════════════════════════════════════════════════════════════
// ENTITIES
// ══════════════════════════════════════════════════════════════════════════

interface AudioFocusRequest {
  readonly id: string;
  readonly type: FocusType;
  readonly requestedAt: number;
  readonly result: FocusResult;
  readonly releasedAt?: number;
}

// ══════════════════════════════════════════════════════════════════════════
// AGGREGATE ROOT
// ══════════════════════════════════════════════════════════════════════════

class AudioFocusAggregate {
  private currentRequest: AudioFocusRequest | null = null;

  // Commands
  requestFocus(type: FocusType): Promise<FocusResult>;
  releaseFocus(): Promise<void>;
  handleFocusLoss(temporary: boolean): void;

  // Queries
  hasFocus(): boolean;
  getCurrentRequest(): AudioFocusRequest | null;

  // Invariants
  // - Only one focus request at a time
  // - Must release before requesting new focus
  // - Transient focus auto-releases after delivery
}
```

### Domain Events

| Event | Payload | Triggered When |
|-------|---------|----------------|
| `AudioFocusRequested` | `{ type: FocusType }` | Focus request initiated |
| `AudioFocusGranted` | `{ requestId }` | System granted audio focus |
| `AudioFocusDenied` | `{ requestId, reason }` | Higher-priority app has focus |
| `AudioFocusReleased` | `{ requestId }` | Focus voluntarily released |
| `AudioFocusLost` | `{ temporary: boolean }` | Another app took focus |

### Anti-Corruption Layer

**Android Audio Adapter** interfaces with native audio system:

```typescript
interface AndroidAudioAdapter {
  requestFocus(type: FocusType): Promise<FocusResult>;
  releaseFocus(): Promise<void>;
  onFocusLoss(callback: (temporary: boolean) => void): void;
  getCurrentStreams(): AudioStreamInfo[];
}

// Implementation handles:
// - Capacitor plugin bridge
// - Native Android AudioManager
// - Focus change callbacks
// - Ducking behavior coordination
```

---

## 3.5 Configuration Context

**Responsibility:** Store and manage user preferences and application settings.

### Domain Model

```typescript
// ══════════════════════════════════════════════════════════════════════════
// VALUE OBJECTS
// ══════════════════════════════════════════════════════════════════════════

interface PollingInterval {
  readonly currentMs: number;
  readonly minMs: number;      // 120000 (2 min)
  readonly maxMs: number;      // 900000 (15 min)
}

type InterestThreshold = 'low' | 'medium' | 'high';

type VoicePreset = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Aoede';

// ══════════════════════════════════════════════════════════════════════════
// ENTITIES
// ══════════════════════════════════════════════════════════════════════════

interface UserPreferences {
  readonly id: string;          // Always 'default' for V1
  readonly pollingInterval: PollingInterval;
  readonly interestThreshold: InterestThreshold;
  readonly voicePreset: VoicePreset;
  readonly isFirstLaunch: boolean;
  readonly lastUpdatedAt: number;
}

// ══════════════════════════════════════════════════════════════════════════
// AGGREGATE ROOT
// ══════════════════════════════════════════════════════════════════════════

class UserPreferencesAggregate {
  private preferences: UserPreferences;

  // Commands
  setPollingInterval(ms: number): void;
  increasePollingInterval(): void;  // "less often"
  decreasePollingInterval(): void;  // "more often"
  setInterestThreshold(threshold: InterestThreshold): void;
  setVoicePreset(preset: VoicePreset): void;
  markFirstLaunchComplete(): void;

  // Queries
  getPreferences(): UserPreferences;
  getPollingInterval(): number;
  isWithinPollingBounds(ms: number): boolean;

  // Invariants
  // - Polling interval must be within [minMs, maxMs]
  // - Interest threshold must be valid enum value
  // - Voice preset must be valid enum value
}
```

### Domain Events

| Event | Payload | Triggered When |
|-------|---------|----------------|
| `PollingIntervalChanged` | `{ previousMs, newMs }` | User adjusted cadence |
| `InterestThresholdChanged` | `{ previous, new }` | User adjusted quality filter |
| `VoicePresetChanged` | `{ previous, new }` | User selected different voice |
| `PreferencesReset` | `{}` | User reset to defaults |

---

## 4. Domain Events Summary

All domain events enable loose coupling between bounded contexts:

```typescript
// Event bus interface
interface DomainEventBus {
  publish<T extends DomainEvent>(event: T): void;
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: (event: T) => void
  ): Unsubscriber;
}

// Base event structure
interface DomainEvent {
  readonly type: string;
  readonly timestamp: number;
  readonly correlationId?: string;  // Links related events
}

// Event flow
// 1. LocationAcquired → triggers FactGeneration
// 2. FactGenerated → triggers VoiceSession open
// 3. SpeechBegun → triggers AudioFocus request
// 4. CommandRecognized → may trigger PreferenceChange
// 5. VoiceSessionClosed → triggers return to polling
```

---

## 5. Aggregate Boundaries

Each aggregate is independently testable and maintains its own consistency:

| Aggregate | Root Entity | Invariants |
|-----------|-------------|------------|
| **LocationAggregate** | Location | Valid coordinates; non-empty places |
| **FactDeliveryAggregate** | HistoricalFact | Quality verdict acceptable; no repetition |
| **VoiceSessionAggregate** | VoiceSession | One active session; valid state transitions |
| **AudioFocusAggregate** | AudioFocusRequest | One focus at a time; proper release |
| **UserPreferencesAggregate** | UserPreferences | Polling in bounds; valid enums |

---

## 6. Repository Interfaces

```typescript
// ══════════════════════════════════════════════════════════════════════════
// REPOSITORIES
// ══════════════════════════════════════════════════════════════════════════

interface LocationRepository {
  getCurrentLocation(): Location | null;
  saveLocation(location: Location): Promise<void>;
  getLocationHistory(limit: number): Promise<Location[]>;
}

interface FactRepository {
  saveFact(fact: HistoricalFact): Promise<void>;
  getRecentFacts(limit: number): Promise<HistoricalFact[]>;
  wasFactDelivered(textHash: string): Promise<boolean>;
}

interface PreferencesRepository {
  load(): Promise<UserPreferences>;
  save(preferences: UserPreferences): Promise<void>;
}

// All repositories backed by IndexedDB for V1
```

---

## 7. Context Integration Patterns

### 7.1 Event-Driven Integration

```
┌─────────────────┐     LocationAcquired      ┌─────────────────┐
│    Location     │─────────────────────────►│   Discovery     │
│    Context      │                           │    Context      │
└─────────────────┘                           └────────┬────────┘
                                                       │
                                                       │ FactGenerated
                                                       ▼
                                              ┌─────────────────┐
                                              │     Voice       │
                                              │    Context      │
                                              └────────┬────────┘
                                                       │
                                                       │ SpeechBegun
                                                       ▼
                                              ┌─────────────────┐
                                              │     Audio       │
                                              │    Context      │
                                              └─────────────────┘
```

### 7.2 Shared Kernel

Minimal shared types across contexts:

```typescript
// Shared kernel - kept minimal
interface SharedTypes {
  // Identifiers
  type UUID = string;
  type Timestamp = number;

  // Results
  type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
}
```

---

## 8. Implementation Guidelines

### 8.1 Coding Conventions

1. **Immutability**: All value objects and events are immutable
2. **Type Safety**: Strict TypeScript with no `any`
3. **Pure Functions**: Domain logic in pure functions where possible
4. **Explicit State**: State machines for complex flows
5. **Error as Values**: Use Result types, not exceptions

### 8.2 Testing Strategy

| Layer | Test Type | Focus |
|-------|-----------|-------|
| Domain | Unit | Aggregate invariants, value object validation |
| Services | Integration | API adapter behavior with mocks |
| Application | Integration | Event flow between contexts |
| Presentation | E2E | User journeys |

### 8.3 File Organization

```
src/lib/domain/
├── location/
│   ├── aggregates/LocationAggregate.ts
│   ├── value-objects/GPSCoordinates.ts
│   ├── value-objects/PlaceNames.ts
│   ├── events/LocationEvents.ts
│   └── index.ts
├── discovery/
│   ├── aggregates/FactDeliveryAggregate.ts
│   ├── services/FactGenerationService.ts
│   ├── services/QualityFilterService.ts
│   ├── value-objects/HistoricalFact.ts
│   ├── events/DiscoveryEvents.ts
│   └── index.ts
├── voice/
│   ├── aggregates/VoiceSessionAggregate.ts
│   ├── value-objects/VoiceCommand.ts
│   ├── events/VoiceEvents.ts
│   └── index.ts
├── audio/
│   ├── aggregates/AudioFocusAggregate.ts
│   ├── events/AudioEvents.ts
│   └── index.ts
└── config/
    ├── aggregates/UserPreferencesAggregate.ts
    ├── value-objects/PollingInterval.ts
    ├── events/ConfigEvents.ts
    └── index.ts
```

---

**End of Domain-Driven Design Overview**

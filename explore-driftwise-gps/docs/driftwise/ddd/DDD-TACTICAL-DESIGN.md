# Driftwise: DDD Tactical Design - Detailed Aggregates & Value Objects

**Focus:** Implementation-level domain modeling

---

## 1. Location Context - Detailed Design

### 1.1 Aggregate: LocationAggregate

**Aggregate Root:** `Location`

```typescript
// Location (Aggregate Root Entity)
class Location {
  id: LocationId
  coordinates: GPSCoordinates
  placeNames: PlaceNames
  accuracy: number  // meters
  acquiredAt: DateTime

  // Invariants:
  // - coordinates must be valid (lat -90..90, lon -180..180)
  // - placeNames must have at least one place
  // - accuracy must be > 0

  static create(
    coordinates: GPSCoordinates,
    placeNames: PlaceNames
  ): Result<Location, LocationError>

  hasMoved(previous: Location, threshold_m: number): boolean

  isExpired(maxAgeSec: number): boolean
}
```

### 1.2 Value Objects

```typescript
// GPSCoordinates
class GPSCoordinates {
  latitude: number    // -90..90
  longitude: number   // -180..180
  accuracy: number    // meters (confidence radius)
  timestamp: DateTime

  // Validate on construction
  static create(lat: number, lon: number, acc: number): Result<GPSCoordinates>

  distanceTo(other: GPSCoordinates): number  // meters (Haversine)

  equals(other: GPSCoordinates): boolean
}

// PlaceNames - Flexible map of hierarchical places
class PlaceNames {
  private places: Map<PlaceType, string>

  // PlaceType: 'village' | 'town' | 'city' | 'locality' | 'hamlet' | 'suburb'

  static create(nominatimResponse: object): Result<PlaceNames>

  getAll(): string[]

  toString(): string  // For display/logging
}

// LocationId - Unique identifier
class LocationId extends ValueObject {
  value: UUID

  static generate(): LocationId
}

// LocationDelta - Represents change between two locations
class LocationDelta {
  previousLocation: Location
  currentLocation: Location
  distanceMovedM: number
  timeElapsedS: number
  speedMPS: number

  hasSignificantlyMoved(threshold_m: number): boolean
}
```

### 1.3 Repository Interface

```typescript
interface LocationRepository {
  save(location: Location): Promise<void>
  getLastLocation(): Promise<Location | null>
  getCachedLocations(radiusKm: number): Promise<Location[]>
  clear(): Promise<void>
}
```

### 1.4 Domain Service

```typescript
class LocationService implements DomainService {
  constructor(
    private geolocationProvider: GeolocationProvider,
    private nominatimAdapter: NominatimAdapter,
    private repository: LocationRepository
  ) {}

  async acquireLocation(): Promise<Result<Location, LocationError>> {
    const coords = await this.geolocationProvider.getCurrentPosition()
    if (coords.isErr) return coords  // GPS timeout, permission denied, etc.

    const places = await this.nominatimAdapter.reverseGeocode(coords.value)
    if (places.isErr) return places  // Nominatim API failure

    const location = Location.create(coords.value, places.value)
    if (location.isErr) return location  // Validation failed

    await this.repository.save(location.value)
    return location
  }

  async hasSignificantlyMoved(threshold_m: number): Promise<boolean> {
    const last = await this.repository.getLastLocation()
    if (!last) return false

    const current = await this.acquireLocation()
    if (current.isErr) return false

    return current.value.hasMoved(last, threshold_m)
  }
}
```

---

## 2. Historical Discovery Context - Detailed Design

### 2.1 Aggregate: FactDeliveryAggregate

**Aggregate Root:** `FactDelivery`

```typescript
// FactDelivery (Aggregate Root Entity)
class FactDelivery {
  id: FactDeliveryId
  fact: Fact
  location: Location
  generatedAt: DateTime
  deliveryState: DeliveryState
  qualityAssessment: QualityAssessment

  // Invariants:
  // - fact must be non-empty
  // - location must have valid coordinates
  // - quality must be ACCEPTABLE
  // - deliveryState must be valid transition

  static create(
    fact: Fact,
    location: Location,
    assessment: QualityAssessment
  ): Result<FactDelivery, FactError>

  markAsStarted(): FactDelivery
  markAsCompleted(): FactDelivery
  markAsSkipped(): FactDelivery

  // State machine transitions validated here
  transition(newState: DeliveryState): Result<FactDelivery>
}

// Delivery state machine
enum DeliveryState {
  CREATED = 'CREATED',
  SPEAKING = 'SPEAKING',
  LISTENING = 'LISTENING',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
  PAUSED = 'PAUSED'
}
```

### 2.2 Value Objects

```typescript
// Fact
class Fact extends ValueObject {
  text: string           // 2-3 sentences
  sourceLocation: PlaceNames
  generatedAt: DateTime

  static create(text: string, location: PlaceNames): Result<Fact> {
    if (text.length < 10 || text.length > 300) return Err('Invalid length')
    return Ok(new Fact(text, location))
  }

  isGeneric(): boolean {
    // Heuristic: contains "known for", "famous for", etc.
    const genericPhrases = ['known for', 'famous for', 'is home to']
    return genericPhrases.some(phrase => this.text.toLowerCase().includes(phrase))
  }
}

// QualityAssessment
class QualityAssessment extends ValueObject {
  isGeneric: boolean
  containsSpecifics: boolean
  confidenceLevel: number  // 0-100
  reason: string

  // Decide acceptance
  isAcceptable(): boolean {
    return !this.isGeneric && this.containsSpecifics && this.confidenceLevel > 70
  }
}

// FactMetadata
class FactMetadata {
  season: Season  // SPRING | SUMMER | FALL | WINTER
  weather: WeatherCondition
  requestedAt: DateTime
  responseTimeMs: number
  modelUsed: string  // "gemini-2.5-flash"
}

// FactDeliveryId
class FactDeliveryId extends ValueObject {
  value: UUID
  static generate(): FactDeliveryId
}
```

### 2.3 Repository Interface

```typescript
interface FactRepository {
  save(delivery: FactDelivery): Promise<void>
  findRecentByLocation(location: Location, withinDays: number): Promise<FactDelivery[]>
  findById(id: FactDeliveryId): Promise<FactDelivery | null>
  getDeliveryCount(period: 'today' | 'week' | 'month'): Promise<number>
  clear(): Promise<void>
}
```

### 2.4 Domain Services

```typescript
class FactGenerationService implements DomainService {
  constructor(
    private geminiAdapter: GeminiAdapter
  ) {}

  async generateFact(
    location: Location,
    context: FactMetadata
  ): Promise<Result<Fact, FactGenerationError>> {
    const prompt = this.constructPrompt(location, context)
    const response = await this.geminiAdapter.generateContent(prompt)

    if (response.isErr) return response

    // Check for "NO_SUITABLE_FACT" marker
    if (response.value.includes('NO_SUITABLE_FACT')) {
      return Err(new FactGenerationError('NO_SUITABLE_FACT'))
    }

    return Fact.create(response.value, location.placeNames)
  }

  private constructPrompt(location: Location, context: FactMetadata): string {
    return `You are a local history researcher...

    Current context: ${context.season}, ${context.weather}
    Location(s): ${location.placeNames.toString()}

    Return ONE fascinating fact, 2-3 sentences max...`
  }
}

class QualityFilterService implements DomainService {
  assessQuality(fact: Fact): QualityAssessment {
    const isGeneric = fact.isGeneric()
    const containsSpecifics = this.detectSpecifics(fact.text)
    const confidence = this.calculateConfidence(fact.text)

    return new QualityAssessment(
      isGeneric,
      containsSpecifics,
      confidence,
      `Generic: ${isGeneric}, Specifics: ${containsSpecifics}`
    )
  }

  private detectSpecifics(text: string): boolean {
    // Look for: dates, numbers, named individuals, measurements
    const datePattern = /\d{4}|\d{1,2}\/\d{1,2}/
    const numberPattern = /\d+(?:\.\d+)?\s*(?:meters|feet|km|miles|people|years)/i
    const namePattern = /[A-Z][a-z]+ [A-Z][a-z]+/  // Named person

    return datePattern.test(text) || numberPattern.test(text) || namePattern.test(text)
  }

  private calculateConfidence(text: string): number {
    // Simple heuristic: length, specificity, professional tone
    let score = 50  // baseline
    if (text.length > 50) score += 20
    if (text.length > 100) score += 15
    if (this.detectSpecifics(text)) score += 20
    return Math.min(score, 100)
  }
}
```

---

## 3. Voice Interaction Context - Detailed Design

### 3.1 Aggregate: VoiceSessionAggregate

**Aggregate Root:** `VoiceSession`

```typescript
// VoiceSession (Aggregate Root Entity)
class VoiceSession {
  id: VoiceSessionId
  fact: Fact
  startedAt: DateTime
  state: SessionState  // SPEAKING, LISTENING, PAUSED, ENDED
  turns: DialogTurn[]

  // Invariants:
  // - Session must timeout after 10 minutes
  // - Only one session active at a time
  // - Transitions must follow state machine rules

  static create(fact: Fact): Result<VoiceSession>

  addTurn(turn: DialogTurn): Result<VoiceSession>

  transition(newState: SessionState): Result<VoiceSession>

  getElapsedTimeMs(): number

  isExpired(): boolean  // > 10 minutes
}

enum SessionState {
  SPEAKING = 'SPEAKING',
  LISTENING = 'LISTENING',
  PAUSED = 'PAUSED',
  ENDED = 'ENDED'
}
```

### 3.2 Value Objects

```typescript
// VoiceCommand
class VoiceCommand extends ValueObject {
  intent: CommandIntent
  confidence: number  // 0-100
  parameters: Map<string, any>
  recognizedAt: DateTime

  static create(
    intent: CommandIntent,
    confidence: number,
    params?: Map<string, any>
  ): Result<VoiceCommand> {
    if (confidence < 0 || confidence > 100) return Err('Invalid confidence')
    return Ok(new VoiceCommand(intent, confidence, params || new Map()))
  }
}

enum CommandIntent {
  PAUSE = 'PAUSE',
  CONTINUE = 'CONTINUE',
  SKIP = 'SKIP',
  MORE_OFTEN = 'MORE_OFTEN',
  LESS_OFTEN = 'LESS_OFTEN',
  FOLLOW_UP_QUESTION = 'FOLLOW_UP_QUESTION'
}

// DialogTurn
class DialogTurn {
  speaker: Speaker  // SYSTEM | USER
  content: string   // Text or transcript
  confidence?: number  // For user speech
  timestamp: DateTime

  constructor(
    speaker: Speaker,
    content: string,
    timestamp: DateTime = DateTime.now()
  ) {
    this.speaker = speaker
    this.content = content
    this.timestamp = timestamp
  }
}

enum Speaker {
  SYSTEM = 'SYSTEM',
  USER = 'USER'
}

// VoiceSessionId
class VoiceSessionId extends ValueObject {
  value: UUID
  static generate(): VoiceSessionId
}

// Transcript with confidence
class Transcript {
  text: string
  confidence: number  // 0-100
  alternatives: string[]  // Alternative recognitions
}
```

### 3.3 Repository Interface

```typescript
interface VoiceSessionRepository {
  save(session: VoiceSession): Promise<void>
  findActive(): Promise<VoiceSession | null>
  findById(id: VoiceSessionId): Promise<VoiceSession | null>
  delete(id: VoiceSessionId): Promise<void>
}
```

### 3.4 Domain Services

```typescript
class SpeechSynthesisService implements DomainService {
  constructor(private geminiLiveAdapter: GeminiLiveAdapter) {}

  async synthesizeAndDeliver(
    fact: Fact,
    session: VoiceSession
  ): Promise<Result<VoiceSession>> {
    const result = await this.geminiLiveAdapter.openSession()
    if (result.isErr) return result

    const wsConnection = result.value

    try {
      await wsConnection.sendText(fact.text)

      // Stream audio to speakers
      const audioStream = await wsConnection.receiveAudioStream()
      await this.playAudio(audioStream)

      return Ok(session.transition('LISTENING').value)
    } catch (err) {
      return Err(new SynthesisError(err.message))
    }
  }

  private async playAudio(stream: AsyncIterable<Uint8Array>): Promise<void> {
    const audioContext = new AudioContext()
    const source = audioContext.createBufferSource()

    for await (const chunk of stream) {
      // Append to audio buffer and play
    }
  }
}

class CommandRecognitionService implements DomainService {
  recognizeCommand(transcript: Transcript): VoiceCommand {
    const text = transcript.text.toLowerCase()

    const patterns: Map<CommandIntent, RegExp[]> = new Map([
      [CommandIntent.PAUSE, [/pause/, /wait/, /hold on/]],
      [CommandIntent.CONTINUE, [/continue/, /go on/, /resume/]],
      [CommandIntent.SKIP, [/skip/, /next/, /stop/]],
      [CommandIntent.MORE_OFTEN, [/more often/, /more facts/, /tell me more/]],
      [CommandIntent.LESS_OFTEN, [/less often/, /fewer facts/, /quiet/]],
    ])

    for (const [intent, regexes] of patterns) {
      if (regexes.some(r => r.test(text))) {
        return VoiceCommand.create(intent, transcript.confidence).value
      }
    }

    // Default: follow-up question
    return VoiceCommand.create(
      CommandIntent.FOLLOW_UP_QUESTION,
      transcript.confidence
    ).value
  }
}
```

---

## 4. Audio Management Context - Detailed Design

### 4.1 Aggregate: AudioFocusAggregate

```typescript
// AudioFocus (Aggregate Root)
class AudioFocus {
  id: AudioFocusId
  focusType: FocusType
  requestedAt: DateTime
  isActive: boolean

  static request(
    focusType: FocusType
  ): Result<AudioFocus> {
    // Validate: only one permanent focus allowed
    if (focusType === FocusType.PERMANENT && hasActiveFocus()) {
      return Err('Another app has permanent focus')
    }
    return Ok(new AudioFocus(focusType))
  }

  release(): AudioFocus {
    this.isActive = false
    return this
  }
}

enum FocusType {
  PERMANENT = 'PERMANENT',
  TRANSIENT = 'TRANSIENT',
  TRANSIENT_MAY_DUCK = 'TRANSIENT_MAY_DUCK'
}
```

### 4.2 Domain Service

```typescript
class AudioManagementService implements DomainService {
  constructor(private androidAudioAdapter: AndroidAudioAdapter) {}

  async requestAudioFocus(): Promise<Result<AudioFocus>> {
    const focus = AudioFocus.request(FocusType.TRANSIENT_MAY_DUCK)
    if (focus.isErr) return focus

    const result = await this.androidAudioAdapter.requestFocus(
      FocusType.TRANSIENT_MAY_DUCK
    )
    if (result.isErr) return result

    return focus
  }

  async releaseAudioFocus(focus: AudioFocus): Promise<Result<AudioFocus>> {
    const released = focus.release()
    await this.androidAudioAdapter.releaseFocus()
    return Ok(released)
  }
}
```

---

## 5. Configuration Context - Detailed Design

### 5.1 Aggregate: UserPreferencesAggregate

```typescript
// UserPreferences (Aggregate Root)
class UserPreferences {
  pollingInterval: PollingInterval
  interestThreshold: InterestThreshold
  voicePreset: VoicePreset

  // Invariants:
  // - Polling interval: 2-15 minutes
  // - Interest threshold: LOW, MEDIUM, HIGH
  // - Voice preset: valid voice name

  static create(
    interval_ms: number,
    threshold: InterestThreshold,
    voice: VoicePreset
  ): Result<UserPreferences> {
    const interval = PollingInterval.create(interval_ms)
    if (interval.isErr) return interval

    return Ok(new UserPreferences(interval.value, threshold, voice))
  }

  updatePollingInterval(newInterval_ms: number): Result<UserPreferences> {
    const interval = PollingInterval.create(newInterval_ms)
    if (interval.isErr) return interval

    this.pollingInterval = interval.value
    return Ok(this)
  }

  increaseFrequency(): Result<UserPreferences> {
    const newInterval = this.pollingInterval.decreaseBy(60000)  // -1 min
    return this.updatePollingInterval(newInterval.toMs())
  }

  decreaseFrequency(): Result<UserPreferences> {
    const newInterval = this.pollingInterval.increaseBy(60000)  // +1 min
    return this.updatePollingInterval(newInterval.toMs())
  }
}
```

### 5.2 Value Objects

```typescript
// PollingInterval
class PollingInterval extends ValueObject {
  private readonly MIN_MS = 2 * 60 * 1000  // 2 minutes
  private readonly MAX_MS = 15 * 60 * 1000  // 15 minutes

  value: number  // milliseconds

  static create(ms: number): Result<PollingInterval> {
    if (ms < this.MIN_MS || ms > this.MAX_MS) {
      return Err(`Interval must be 2-15 minutes`)
    }
    return Ok(new PollingInterval(ms))
  }

  decreaseBy(ms: number): PollingInterval {
    const newValue = Math.max(this.value - ms, this.MIN_MS)
    return new PollingInterval(newValue)
  }

  increaseBy(ms: number): PollingInterval {
    const newValue = Math.min(this.value + ms, this.MAX_MS)
    return new PollingInterval(newValue)
  }

  toMs(): number { return this.value }
  toMinutes(): number { return this.value / 60000 }
}

// InterestThreshold
enum InterestThreshold {
  LOW = 'LOW',      // Accept even generic facts
  MEDIUM = 'MEDIUM', // Balance generic and specific
  HIGH = 'HIGH'     // Only highly specific facts
}

// VoicePreset
class VoicePreset extends ValueObject {
  name: string  // 'Puck', 'Breeze', 'Cove', etc.
  speedFactor: number  // 0.8 - 1.2 (slow to fast)
}
```

### 5.3 Repository Interface

```typescript
interface PreferencesRepository {
  save(prefs: UserPreferences): Promise<void>
  load(): Promise<UserPreferences | null>
  delete(): Promise<void>
}
```

---

## 6. Complete Type Definitions

```typescript
// Core result type for error handling (similar to Rust Result)
type Result<T, E = Error> = Ok<T> | Err<E>

class Ok<T> {
  constructor(readonly value: T) {}
  isErr = false
  isOk = true
}

class Err<E> {
  constructor(readonly error: E) {}
  isErr = true
  isOk = false
}

// Base classes
abstract class Entity {
  abstract id: any

  equals(other: Entity): boolean {
    return this.id === other.id
  }
}

abstract class ValueObject {
  abstract equals(other: ValueObject): boolean
}

abstract class DomainService {
  // Stateless, encapsulates domain logic across aggregates
}
```

---

## 7. Testing Strategy

**Unit Tests (By Aggregate):**
- LocationAggregate: Create, move detection, expiration
- FactDeliveryAggregate: State transitions, quality assessment
- VoiceSessionAggregate: State machine, turn tracking
- UserPreferencesAggregate: Interval constraints, frequency changes

**Integration Tests (Across Contexts):**
- Location → Fact Generation → Voice Delivery
- Command Processing → Preference Updates → Location Polling
- Audio Focus → Voice Delivery → Audio Release

**Test Doubles:**
- Mock Nominatim responses for Location tests
- Mock Gemini responses for Fact tests
- Mock WebSocket for Voice tests
- Mock Android Audio API for Audio tests

---

**End of Tactical Design Document**

# Driftwise: Implementation Roadmap & Technical Specifications

**Phase:** Full Project Realization
**Timeline:** 6 weeks (realistic, not optimistic)
**Methodology:** Iterative + Hive-Mind Swarm Coordination

---

## Executive Overview

This roadmap outlines the complete path from architecture/DDD designs to production-ready Driftwise PWA. It integrates the AFD (Architecture & Framework Document) and DDD (Domain-Driven Design) models into concrete implementation phases, with clear dependencies, critical paths, and validation checkpoints.

---

## Phase Breakdown

### Phase 0: Setup & Environment (Days 1-2)

**Objective:** Establish development infrastructure, tooling, and project skeleton.

**Tasks:**
- [ ] Initialize Node.js + npm project
- [ ] Set up Vite with SvelteKit (or Ionic/Capacitor)
- [ ] Configure TypeScript, ESLint, Prettier
- [ ] Install core dependencies:
  - `svelte` + `svelte-kit`
  - `capacitor` (for Android native access)
  - `zod` (schema validation)
  - `neverthrow` (Result type)
  - `uuid`
  - `js-sha256` (for caching)
- [ ] Configure PWA manifest + service worker
- [ ] Set up Git workflow (feature branches, PR workflow)
- [ ] Create project directory structure:
  ```
  src/
  ├── domains/
  │   ├── location/
  │   ├── discovery/
  │   ├── voice/
  │   ├── audio/
  │   └── config/
  ├── adapters/
  │   ├── nominatim/
  │   ├── gemini/
  │   └── android/
  ├── shared/
  │   ├── types/
  │   ├── utils/
  │   └── errors/
  └── ui/
      ├── components/
      ├── pages/
      └── styles/
  tests/
  docs/
  ```
- [ ] Create `.env.example` with placeholder API keys
- [ ] Document setup instructions in README

**Artifacts:**
- Working development environment
- Project skeleton with empty modules
- TypeScript compilation verified

**Validation:** `npm run dev` starts without errors; `npm run build` succeeds

---

### Phase 1: Location Context & Configuration Context (Days 3-5)

**Objective:** Build location acquisition and user preferences management.

**Critical Path:** Location + Preferences are prerequisites for all downstream contexts.

**Tasks:**

#### 1.1 Location Domain Model

- [ ] Create `src/domains/location/Location.ts`
  - `Location` entity (aggregate root)
  - `GPSCoordinates` value object
  - `PlaceNames` value object
  - `LocationId`, `LocationDelta` value objects
  - Validation logic (invariants)

- [ ] Create `src/domains/location/LocationRepository.ts`
  - Interface definition
  - IndexedDB implementation (use `idb` package)
  - Methods: `save()`, `getLastLocation()`, `clear()`

- [ ] Create `src/domains/location/LocationService.ts`
  - Domain service integrating Geolocation API
  - Methods: `acquireLocation()`, `hasSignificantlyMoved()`
  - Error handling: timeout, no permission, network-only

- [ ] Write unit tests for Location entity and value objects
  - Test creation, invariant validation
  - Test coordinate distance calculation
  - Test expiration logic

#### 1.2 Location Adapter (Geolocation API)

- [ ] Create `src/adapters/geolocation/GeolocationAdapter.ts`
  - Wrap native Geolocation API
  - Handle permission requests
  - Implement fallback to network-based location
  - Timeout management (3 seconds)

- [ ] Write integration tests with mock Geolocation API

#### 1.3 Configuration Domain Model

- [ ] Create `src/domains/config/UserPreferences.ts`
  - `UserPreferences` aggregate root
  - `PollingInterval` value object (2-15 min validation)
  - `InterestThreshold` enum
  - `VoicePreset` value object
  - Methods: `updatePollingInterval()`, `increaseFrequency()`, `decreaseFrequency()`

- [ ] Create `src/domains/config/PreferencesRepository.ts`
  - Interface definition
  - IndexedDB implementation
  - Persistence logic

- [ ] Write unit tests for UserPreferences aggregate

#### 1.4 State Manager Integration

- [ ] Create `src/domains/config/StateManager.ts`
  - Application state machine (IDLE, LOCATING, etc.)
  - Polling loop orchestration
  - Timer management
  - Event emission (LocationAcquired, PreferenceChanged, etc.)

- [ ] Integrate with SvelteKit stores (reactive state)

**Artifacts:**
- Location domain module (testable, validated)
- Configuration domain module (testable, validated)
- Adapters for Geolocation API
- Complete unit/integration test suite

**Validation:**
- All Location tests pass
- All Configuration tests pass
- LocationService can acquire GPS coords
- PreferencesRepository persists to IndexedDB

**Blockers:** None (Phase 0 complete)

---

### Phase 2: Historical Discovery Context (Days 6-8)

**Objective:** Implement fact generation, quality filtering, and caching.

**Depends On:** Phase 1 (Location provides PlaceNames)

**Tasks:**

#### 2.1 Fact Domain Model

- [ ] Create `src/domains/discovery/Fact.ts`
  - `Fact` value object
  - `QualityAssessment` value object
  - `FactDelivery` aggregate root
  - Validation: text length, non-empty location

- [ ] Create `src/domains/discovery/FactRepository.ts`
  - Interface definition
  - In-memory cache (with TTL) + IndexedDB
  - Methods: `save()`, `findRecentByLocation()`, `getDeliveryCount()`
  - Deduplication logic (avoid repeating facts)

#### 2.2 Fact Generation Service

- [ ] Create `src/domains/discovery/FactGenerationService.ts`
  - Method: `generateFact(location, context): Promise<Result<Fact>>`
  - Integrates with Gemini adapter
  - Rate limiting (15-second gap enforcement)
  - Error handling: API failures, timeouts, "NO_SUITABLE_FACT" marker

#### 2.3 Quality Filter Service

- [ ] Create `src/domains/discovery/QualityFilterService.ts`
  - Method: `assessQuality(fact): QualityAssessment`
  - Heuristics: generic phrase detection, specificity detection (dates, numbers, names)
  - Confidence scoring
  - Interest threshold application

#### 2.4 Gemini API Adapter (Text)

- [ ] Create `src/adapters/gemini/GeminiTextAdapter.ts`
  - Integrate Google Generative AI SDK
  - API key management (from .env)
  - System prompt construction with location + season + weather
  - Response parsing
  - Rate limit tracking (15-second gap enforcement)
  - Error mapping (API errors → domain errors)

- [ ] Create `src/adapters/gemini/GeminiLiveAdapter.ts` (skeleton for Phase 3)
  - WebSocket connection management (detailed in Phase 3)

#### 2.5 Integration Tests

- [ ] Mock Gemini API responses
- [ ] Test fact generation with various location types
- [ ] Test quality assessment with generic vs specific facts
- [ ] Test rate limiting (15-second gap)
- [ ] Test caching and deduplication

**Artifacts:**
- Fact domain module (entity, value objects)
- FactRepository with caching logic
- FactGenerationService + QualityFilterService
- Gemini Text API adapter
- Complete test suite

**Validation:**
- All Discovery tests pass
- FactGenerationService successfully generates facts
- QualityFilterService correctly identifies generic facts
- Rate limiting enforced (can call generateFact every 15+ seconds)
- Cache prevents redundant API calls

**Blockers:** Requires valid Gemini API key in .env

---

### Phase 3: Voice Interaction Context (Days 9-11)

**Objective:** Implement Gemini Live API integration, speech synthesis, command recognition.

**Depends On:** Phase 2 (generates Fact to deliver)

**Tasks:**

#### 3.1 Voice Session Domain Model

- [ ] Create `src/domains/voice/VoiceSession.ts`
  - `VoiceSession` aggregate root
  - `DialogTurn` entity
  - `VoiceCommand` value object
  - `CommandIntent` enum (PAUSE, CONTINUE, SKIP, MORE_OFTEN, LESS_OFTEN, FOLLOW_UP)
  - State machine: SPEAKING → LISTENING → (PAUSED | IDLE)

- [ ] Create `src/domains/voice/VoiceSessionRepository.ts`
  - Interface definition
  - In-memory implementation (single active session)
  - Methods: `save()`, `findActive()`, `findById()`, `delete()`

#### 3.2 Speech Synthesis Service

- [ ] Create `src/domains/voice/SpeechSynthesisService.ts`
  - Method: `synthesizeAndDeliver(fact, session): Promise<Result<VoiceSession>>`
  - Opens Gemini Live API WebSocket session
  - Sends fact text to API
  - Streams audio output to Web Audio API
  - Manages session lifecycle

#### 3.3 Command Recognition Service

- [ ] Create `src/domains/voice/CommandRecognitionService.ts`
  - Method: `recognizeCommand(transcript): VoiceCommand`
  - Regex patterns for command intents
  - Fuzzy matching for robustness
  - Confidence scoring
  - Default: follow-up question intent

#### 3.4 Gemini Live API Adapter

- [ ] Create `src/adapters/gemini/GeminiLiveAdapter.ts` (detailed)
  - WebSocket connection management
  - BidiGenerateContentSetup protocol
  - Audio format handling (PCM 16-bit 16kHz)
  - Microphone input streaming
  - Audio output streaming to speakers
  - Session timeout management (10 minutes)
  - Error handling (connection failures, timeouts)

#### 3.5 Audio Output Integration

- [ ] Create `src/adapters/audio/WebAudioAdapter.ts`
  - Play PCM audio stream
  - Volume control
  - Integration with Web Audio API

#### 3.6 Integration Tests

- [ ] Mock WebSocket for Gemini Live API
- [ ] Test voice session creation and closure
- [ ] Test command recognition with various transcripts
- [ ] Test state machine transitions
- [ ] Test microphone input and audio output flow

**Artifacts:**
- Voice domain module (aggregate, entities, value objects)
- Speech synthesis and command recognition services
- Gemini Live API adapter (full WebSocket integration)
- Web Audio adapter
- Complete test suite

**Validation:**
- All Voice tests pass
- VoiceSession state machine works correctly
- Command recognition accuracy > 90% on known commands
- Live API WebSocket connection established and maintained
- Audio plays through speakers

**Blockers:** Requires Gemini Live API availability and credentials

---

### Phase 4: Audio Management Context (Days 12-13)

**Objective:** Implement Android audio focus and ducking behavior.

**Depends On:** Phase 3 (VoiceDeliveryEngine needs audio focus)

**Tasks:**

#### 4.1 Audio Focus Domain Model

- [ ] Create `src/domains/audio/AudioFocus.ts`
  - `AudioFocus` aggregate root
  - `FocusType` enum (PERMANENT, TRANSIENT, TRANSIENT_MAY_DUCK)
  - Methods: `request()`, `release()`
  - Invariants: only one permanent focus

#### 4.2 Audio Management Service

- [ ] Create `src/domains/audio/AudioManagementService.ts`
  - Method: `requestAudioFocus(): Promise<Result<AudioFocus>>`
  - Method: `releaseAudioFocus(focus): Promise<Result<AudioFocus>>`
  - Integrates with Android Audio API adapter

#### 4.3 Android Audio Adapter

- [ ] Create `src/adapters/android/AndroidAudioAdapter.ts`
  - Uses Capacitor or Cordova bridge to native Android code
  - AudioManager.requestAudioFocus() wrapper
  - AudioManager.abandonAudioFocus() wrapper
  - Handles AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK
  - Detects focus loss (other app playing)

#### 4.4 Integration Tests

- [ ] Mock Android Audio API
- [ ] Test focus request success
- [ ] Test focus release
- [ ] Test duck behavior with simultaneous playback

**Artifacts:**
- Audio domain module (aggregate)
- AudioManagementService
- Android Audio API adapter (via Capacitor)
- Complete test suite

**Validation:**
- All Audio tests pass
- Focus request/release cycle works
- Podcasts/music duck during Driftwise speech

**Blockers:** Requires Android device or emulator; Capacitor setup

---

### Phase 5: Integration & State Orchestration (Days 14-17)

**Objective:** Wire all contexts together, implement fact delivery cycle, state machine orchestration.

**Depends On:** Phases 1-4 (all domains complete)

**Tasks:**

#### 5.1 Fact Delivery Cycle Orchestration

- [ ] Create `src/application/FactDeliveryCycle.ts`
  - Orchestrator class coordinating all contexts
  - Sequence: GPS → Geocode → Generate Fact → Voice Delivery → Listen for Commands
  - Error recovery: skip cycle on any failure
  - Emit domain events

#### 5.2 Command Handling

- [ ] Create `src/application/CommandHandler.ts`
  - Handle VoiceCommand events
  - Update application state based on command
  - PAUSE: pause current speech
  - CONTINUE: resume speech
  - SKIP: end session, return to IDLE
  - MORE_OFTEN: reduce polling interval
  - LESS_OFTEN: increase polling interval
  - FOLLOW_UP_QUESTION: send transcript to Gemini Live for context-aware response

#### 5.3 State Machine Implementation

- [ ] Create `src/application/StateManager.ts`
  - Implement full state machine: IDLE → LOCATING → GEOCODING → RESEARCHING → SPEAKING → LISTENING → (repeat or IDLE)
  - Polling loop: timer-driven cycles at configured interval
  - Graceful error handling: skip cycles on failures
  - Transition validation

#### 5.4 UI Integration (Minimal)

- [ ] Create `src/ui/App.svelte`
  - Display current state (IDLE, LOCATING, SPEAKING, etc.)
  - Show last fact delivered
  - Display polling interval + interest threshold settings
  - Manual "Start" button for testing
  - Settings panel for preferences

#### 5.5 End-to-End Tests

- [ ] Test complete fact delivery cycle (Location → Fact → Voice)
- [ ] Test error scenarios (no GPS, API fails, no suitable fact)
- [ ] Test command handling (pause, continue, skip)
- [ ] Test state machine transitions
- [ ] Test background polling loop (simulated timer)

#### 5.6 PWA Configuration

- [ ] Configure manifest.json (name, icons, start_url, display: standalone)
- [ ] Configure service worker (cache assets, network-first for APIs)
- [ ] Test offline behavior (graceful degradation)
- [ ] Test "Add to Home Screen" on Android

**Artifacts:**
- FactDeliveryCycle orchestrator
- CommandHandler
- State machine implementation
- Minimal UI (settings + diagnostics)
- Complete E2E test suite
- PWA manifest + service worker

**Validation:**
- E2E tests all pass
- Fact delivery cycle completes without errors
- Commands properly handled
- State transitions logged correctly
- PWA installable on Android

---

### Phase 6: Testing, Optimization & Documentation (Days 18-21)

**Objective:** Achieve production readiness: test coverage, performance, security, documentation.

**Depends On:** Phase 5 (all features implemented)

**Tasks:**

#### 6.1 Test Coverage

- [ ] Aim for >80% code coverage (via Jest + Coverage report)
- [ ] Unit tests for all domains, value objects, aggregates
- [ ] Integration tests for service interactions
- [ ] E2E tests for complete cycles
- [ ] Generate coverage report: `npm run test:coverage`

#### 6.2 Performance Optimization

- [ ] Profile GPS acquisition time (target: <3s)
- [ ] Profile Nominatim API latency (target: <2s)
- [ ] Profile Gemini fact generation (target: <10s)
- [ ] Profile Live API session setup (target: <2s)
- [ ] Total cycle time (target: <20s)
- [ ] Analyze and optimize if targets missed

#### 6.3 Security Audit

- [ ] API key not in code or logs (use .env only)
- [ ] HTTPS/WSS enforced for all API calls
- [ ] No persistent location history stored
- [ ] Permissions explicit (Geolocation)
- [ ] Run security linter: `npm audit`
- [ ] Fix any vulnerabilities

#### 6.4 Error Handling & Logging

- [ ] Comprehensive error logging (structured JSON logs)
- [ ] Graceful error messages (user-facing)
- [ ] Retry logic for transient failures
- [ ] Circuit breaker for repeated API failures
- [ ] Error rate monitoring (dashboard or console)

#### 6.5 API Integration Testing

- [ ] Test with real Nominatim API (rate-limited)
- [ ] Test with real Gemini APIs (using valid API key)
- [ ] Test with real Android Audio Manager (if available)
- [ ] Verify API response handling
- [ ] Verify error scenarios (rate limit, timeout, invalid key)

#### 6.6 Documentation

- [ ] API documentation (OpenAPI-style)
- [ ] Component architecture diagram (mermaid)
- [ ] User guide (how to use Driftwise)
- [ ] Developer guide (setup, testing, deployment)
- [ ] Troubleshooting guide (common issues)

#### 6.7 World-Class README

- [ ] Project overview (problem, solution, vision)
- [ ] Feature highlights + screenshots/GIFs
- [ ] Architecture overview (context diagram)
- [ ] Quick start guide (setup in 5 minutes)
- [ ] API keys & configuration section
- [ ] Testing & development workflow
- [ ] Deployment instructions (PWA on web, Android)
- [ ] Contributing guidelines
- [ ] License + acknowledgments

#### 6.8 Build & Deployment

- [ ] Production build: `npm run build`
- [ ] Minification, optimization verified
- [ ] Service worker caching strategy validated
- [ ] PWA offline-first behavior tested
- [ ] Build size optimization (tree-shaking, code splitting)

**Artifacts:**
- Test coverage report (>80%)
- Performance profile + optimization recommendations
- Security audit report + fixes
- Complete API documentation
- World-class README + setup guide
- Developer guide + troubleshooting
- Production build artifacts

**Validation:**
- All tests pass (>80% coverage)
- Performance targets met
- Security audit clean
- README is comprehensive and clear
- Build succeeds with no warnings

---

### Phase 7: Hive-Mind Swarm Realization & Agentic QE (Days 22-25)

**Objective:** Use Claude Flow swarm + Agentic QE to polish, validate, and finalize project.

**Depends On:** Phase 6 (all features, tests, docs complete)

**Tasks:**

#### 7.1 Hive-Mind Swarm Coordination

- [ ] Spawn specialized agents using Claude Flow:
  - **Architect Agent:** Review AFD compliance, suggest improvements
  - **Code Review Agent:** Audit codebase for best practices, security
  - **Test Agent:** Expand test coverage, identify gaps
  - **Documentation Agent:** Review docs, suggest clarity improvements
  - **Performance Agent:** Profile and optimize bottlenecks
  - **Security Agent:** Penetration test, verify safeguards

- [ ] Agents coordinate via shared memory (ClaudeFlow AgentDB)
- [ ] Agents propose improvements, create PRs
- [ ] Coordinator reviews and merges PRs
- [ ] Iterate until all agents report no issues

#### 7.2 Agentic Quality Engineering (AQE) Fleet

- [ ] Install agentic-qe globally: `npm install -g agentic-qe`
- [ ] Initialize project: `cd wanderlust && aqe init`
- [ ] Run AQE fleet: `aqe audit`
  - Error detection (linting, type checking, test failures)
  - Code quality metrics
  - Test coverage gaps
  - Performance bottlenecks
  - Security vulnerabilities
  - Architecture violations
  - Documentation gaps

- [ ] Review AQE report:
  ```
  aqe report --format json > agentic-qe-report.json
  ```

- [ ] Address AQE findings:
  - Category: **CRITICAL** → Fix immediately
  - Category: **HIGH** → Fix before release
  - Category: **MEDIUM** → Fix in maintenance
  - Category: **LOW** → Document for future

- [ ] Iterate: Fix issues, re-run `aqe audit` until no CRITICAL/HIGH issues

#### 7.3 Continuous Improvement Loop

- [ ] Set up pre-commit hooks with AQE validation
- [ ] Configure GitHub Actions for automated AQE on each push
- [ ] Document AQE workflow in README
- [ ] Create issues for MEDIUM/LOW findings

**Artifacts:**
- Hive-mind swarm coordination logs
- Agentic QE audit report (JSON)
- Pull requests from agent improvements
- Resolved issues list
- GitHub Actions workflow (AQE validation)

**Validation:**
- AQE audit: 0 CRITICAL, 0 HIGH findings
- Hive-mind agents: all report "ready for production"
- Code review score: A+ (best practices)
- Test coverage: >85%
- Security audit: clean
- Performance: all targets met

---

## Phase 8: GitHub Publishing & Release (Days 26)

**Objective:** Push to GitHub, create release, document deployment.

**Depends On:** Phase 7 (all validations complete)

**Tasks:**

- [ ] Create GitHub repository: `github.com/jjohare/driftwise`
- [ ] Push code:
  ```bash
  git add -A
  git commit -m "Initial commit: Driftwise complete implementation with AFD, DDD, full docs"
  git push -u origin main
  ```

- [ ] Create GitHub release:
  ```bash
  gh release create v1.0.0 --title "Driftwise v1.0.0" --notes "First production release..."
  ```

- [ ] Add topics: `pwa`, `voice-ai`, `local-history`, `gemini-api`, `svelte`
- [ ] Create GitHub Pages site for documentation
- [ ] Set up branch protection rules (PR reviews required)

**Artifacts:**
- Public GitHub repository
- Release published
- GitHub Pages documentation site
- Branch protection rules

---

## Critical Path & Dependencies

```
Phase 0 (Setup)
    ↓
Phase 1 (Location + Config) ←─ CRITICAL PATH STARTS
    ↓
Phase 2 (Discovery) ←─ DEPENDS ON Phase 1
    ↓
Phase 3 (Voice) ←─ DEPENDS ON Phase 2
    ↓
Phase 4 (Audio) ←─ DEPENDS ON Phase 3
    ↓
Phase 5 (Integration) ←─ DEPENDS ON Phases 1-4
    ↓
Phase 6 (Testing & Docs) ←─ DEPENDS ON Phase 5
    ↓
Phase 7 (Hive-Mind & AQE) ←─ DEPENDS ON Phase 6
    ↓
Phase 8 (GitHub Release) ←─ DEPENDS ON Phase 7
```

**Critical Path:** Phases 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8
**Parallel Work:** Within each phase, domains can be developed independently
**Blockers:** API keys (Gemini), Android environment (Phase 4)

---

## Definition of Done (Per Phase)

**Phase X is complete when:**
1. ✅ All planned tasks checked
2. ✅ All artifacts delivered
3. ✅ Unit + integration tests written and passing (>80% coverage)
4. ✅ No TypeScript errors (`npm run type-check` succeeds)
5. ✅ Linting clean (`npm run lint` succeeds)
6. ✅ No security vulnerabilities (`npm audit` clean)
7. ✅ Code reviewed by another team member or agent
8. ✅ Documentation updated
9. ✅ PR merged to main branch

---

## Risk Register & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| Gemini API quota exceeded | Blocking | Medium | Pre-allocate quota, monitor usage, cache heavily |
| Nominatim rate limiting | High latency | Medium | Respect 1 req/sec, cache results 24h |
| Android Audio API unavailable | Feature loss | Low | Fallback to silent text notification |
| GPS permission denied | Critical feature blocked | Low | Clear error message, request permission explicitly |
| Service Worker caching issues | Old code delivered | Low | Cache busting strategy, manual cache clear |

---

## Success Metrics (v1.0)

- **Code Quality:** >80% test coverage, 0 critical vulnerabilities
- **Performance:** Fact delivery < 20 seconds, <50MB total app size
- **User Experience:** 0 crashes per session, voice recognition > 90% accuracy
- **Reliability:** 99% uptime, graceful degradation on all API failures
- **Documentation:** Complete AFD, DDD, API docs, README, troubleshooting guide

---

## Next Steps (After Phase 8)

**Version 1.1 (Future):**
- Route awareness (if destination set, preview upcoming locations)
- Location memory (avoid repeating facts on familiar routes)
- Interest profiles (historical, military, literary, scientific)
- Multi-language support
- iOS PWA support

**Version 2.0 (Backend):**
- Backend proxy for secure API key management
- User authentication + cloud sync
- Shared fact database (crowdsourced)
- Analytics dashboard
- Subscription tier (premium historical sources)

---

**End of Implementation Roadmap**

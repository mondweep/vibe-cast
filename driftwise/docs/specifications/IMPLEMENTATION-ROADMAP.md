# Driftwise: 8-Phase Implementation Roadmap

**Project:** Driftwise - Voice-First Serendipitous Local History Companion
**Version:** 1.0.0
**Status:** Planning Complete
**Last Updated:** January 2026

---

## Overview

This roadmap defines the complete implementation path for Driftwise V1 (Personal Use). Each phase builds incrementally, with clear deliverables, acceptance criteria, and technical milestones.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          IMPLEMENTATION PHASES                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Phase 1: Foundation        Phase 2: Location         Phase 3: Discovery     │
│  ─────────────────         ──────────────────        ─────────────────────   │
│  • Project setup           • GPS acquisition         • Nominatim adapter     │
│  • SvelteKit scaffold      • Geolocation API         • Gemini integration    │
│  • TypeScript config       • Location store          • Fact generation       │
│  • Testing framework       • Permission handling     • Quality filtering     │
│                                                                              │
│  Phase 4: Voice            Phase 5: Audio            Phase 6: Integration    │
│  ────────────────          ────────────────          ────────────────────    │
│  • Gemini Live API         • Audio focus mgmt        • End-to-end cycle      │
│  • WebSocket handler       • Ducking behavior        • Error recovery        │
│  • Speech synthesis        • Capacitor plugin        • State orchestration   │
│  • Command recognition     • Platform testing        • User preferences      │
│                                                                              │
│  Phase 7: PWA              Phase 8: Release                                  │
│  ───────────────           ──────────────────                                │
│  • Service worker          • Production build                                │
│  • Offline support         • Performance audit                               │
│  • Install prompts         • Security review                                 │
│  • Caching strategies      • Documentation                                   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Project Foundation & Setup

**Goal:** Establish a robust, well-configured project foundation.

### Deliverables

| Item | Description | Priority |
|------|-------------|----------|
| SvelteKit Project | Initialized with TypeScript, Vite | P0 |
| Directory Structure | DDD-aligned folder organization | P0 |
| TypeScript Config | Strict mode, path aliases | P0 |
| ESLint + Prettier | Code quality enforcement | P1 |
| Vitest Setup | Unit testing framework | P0 |
| Playwright Setup | E2E testing framework | P1 |
| Environment Config | `.env` handling, Vite defines | P0 |
| Git Hooks | Pre-commit linting, testing | P1 |

### Technical Tasks

```
1.1 Initialize SvelteKit project
    └── npx sv create driftwise --template minimal --types ts

1.2 Configure TypeScript
    ├── Enable strict mode
    ├── Add path aliases (@lib, @domain, @services)
    └── Configure module resolution

1.3 Set up directory structure
    ├── src/lib/domain/{location,discovery,voice,audio,config}/
    ├── src/lib/services/
    ├── src/lib/adapters/
    ├── src/lib/stores/
    └── src/routes/

1.4 Configure build tools
    ├── Vite PWA plugin
    ├── Environment variables (VITE_*)
    └── Build optimizations

1.5 Set up testing
    ├── Vitest for unit tests
    ├── Testing-library/svelte
    ├── Playwright for E2E
    └── Coverage reporting

1.6 Configure code quality
    ├── ESLint with Svelte plugin
    ├── Prettier with Svelte plugin
    ├── Husky pre-commit hooks
    └── lint-staged
```

### Acceptance Criteria

- [ ] `npm run dev` starts development server
- [ ] `npm run build` produces production bundle
- [ ] `npm run test` runs unit tests
- [ ] `npm run lint` passes with no errors
- [ ] TypeScript compilation with zero errors
- [ ] Path aliases resolve correctly

### Files Created

```
driftwise/
├── package.json
├── svelte.config.js
├── vite.config.ts
├── tsconfig.json
├── .eslintrc.cjs
├── .prettierrc
├── .env.example
├── src/
│   ├── app.html
│   ├── app.d.ts
│   ├── lib/
│   │   └── index.ts
│   └── routes/
│       └── +page.svelte
└── tests/
    └── setup.ts
```

---

## Phase 2: Location Context Implementation

**Goal:** Implement reliable GPS acquisition and geocoding.

### Deliverables

| Item | Description | Priority |
|------|-------------|----------|
| LocationService | GPS polling with fallbacks | P0 |
| GeocodingClient | Nominatim reverse geocoding | P0 |
| Location Store | Svelte store for location state | P0 |
| Permission Handler | Location permission UX | P0 |
| IndexedDB Cache | Geocoding result caching | P1 |
| Unit Tests | Domain model tests | P0 |

### Technical Tasks

```
2.1 Implement Location domain models
    ├── GPSCoordinates value object
    ├── PlaceNames value object
    ├── Location entity
    └── LocationAggregate

2.2 Create LocationService
    ├── requestLocation() with high accuracy
    ├── startPolling() / stopPolling()
    ├── hasLocationChanged() with threshold
    └── Error handling (timeout, permission)

2.3 Implement Nominatim adapter
    ├── reverseGeocode() API call
    ├── Rate limiting (1 req/sec)
    ├── Response parsing to PlaceNames
    └── Error handling

2.4 Create IndexedDB cache
    ├── geocoding_cache store
    ├── Cache key: rounded lat_lon
    ├── TTL: 24 hours
    └── LRU eviction

2.5 Build location Svelte store
    ├── Reactive location state
    ├── Loading/error states
    └── Permission status

2.6 Create permission handler
    ├── First-time permission request
    ├── Denied permission recovery
    └── User-friendly messaging
```

### Acceptance Criteria

- [ ] GPS coordinates acquired within 3 seconds
- [ ] Network fallback works when GPS unavailable
- [ ] Nominatim returns place names correctly
- [ ] Rate limiting prevents API abuse (1 req/sec)
- [ ] Cached results returned for repeated locations
- [ ] Permission denial handled gracefully
- [ ] Unit tests pass for all domain models

### Key Code Patterns

```typescript
// LocationService interface
interface LocationService {
  requestLocation(): Promise<GPSCoordinates | null>;
  startPolling(intervalMs: number): void;
  stopPolling(): void;
  hasLocationChanged(thresholdMeters: number): boolean;
}

// Nominatim adapter usage
const places = await nominatimAdapter.reverseGeocode(51.5074, -0.1278);
// Returns: { city: "London", country: "United Kingdom", ... }
```

---

## Phase 3: Historical Discovery Context Implementation

**Goal:** Implement AI-powered fact research and quality filtering.

### Deliverables

| Item | Description | Priority |
|------|-------------|----------|
| FactGenerationService | Gemini API integration | P0 |
| QualityFilterService | Generic fact detection | P0 |
| Gemini Text Adapter | API wrapper with rate limiting | P0 |
| System Prompt | Optimized for serendipity | P0 |
| Fact Store | Delivery history tracking | P1 |
| Integration Tests | API mock testing | P0 |

### Technical Tasks

```
3.1 Implement Discovery domain models
    ├── HistoricalFact entity
    ├── QualityAssessment value object
    ├── SeasonalContext value object
    └── FactDeliveryAggregate

3.2 Create Gemini Text adapter
    ├── generateContent() API call
    ├── Rate limiting (15s minimum gap)
    ├── Web search grounding enabled
    └── Error handling (rate limit, timeout)

3.3 Build FactGenerationService
    ├── System prompt construction
    ├── Seasonal/weather context injection
    ├── NO_SUITABLE_FACT detection
    └── Response parsing

3.4 Implement QualityFilterService
    ├── Exclusion pattern matching
    ├── Inclusion pattern validation
    ├── Confidence scoring
    └── Verdict assignment

3.5 Create fact history store
    ├── Recent facts for repetition check
    ├── Text hashing for comparison
    └── Session-scoped history

3.6 Design system prompt
    ├── Prioritization rules
    ├── Exclusion examples
    ├── Output format specification
    └── NO_SUITABLE_FACT instruction
```

### Acceptance Criteria

- [ ] Gemini API returns relevant historical facts
- [ ] Web search grounding provides current data
- [ ] Generic facts filtered out (>90% accuracy)
- [ ] NO_SUITABLE_FACT handled correctly
- [ ] Rate limiting prevents 429 errors
- [ ] Facts don't repeat within session
- [ ] Quality filter catches tourism clichés

### System Prompt (Final)

```
You are a local history researcher finding fascinating, unusual facts.

PRIORITIZE (include specific details):
- Exact years, dates, and time periods (e.g., "In 1847...")
- Precise measurements and quantities (e.g., "23 meters tall")
- Named individuals with their roles (e.g., "Engineer Isambard Kingdom Brunel")
- Unusual events, firsts, and records
- Industrial, engineering, scientific, or technological history
- Connections to major historical events

EXCLUDE (these make facts generic):
- Phrases: "known for", "famous for", "renowned for"
- Descriptions: "picturesque", "charming", "quaint", "scenic"
- Clichés: "traditional cottages", "rolling hills", "historic market town"
- Vague claims without specifics

Current context: {season}, {time_of_day}
Location(s): {place_names}

Return ONE fascinating fact, 2-3 sentences maximum, ready to be spoken aloud naturally.
If no specific, interesting fact exists for this location, return exactly: NO_SUITABLE_FACT
```

---

## Phase 4: Voice Interaction Context Implementation

**Goal:** Implement bidirectional voice via Gemini Live API.

### Deliverables

| Item | Description | Priority |
|------|-------------|----------|
| VoiceDeliveryEngine | Speech synthesis via Live API | P0 |
| WebSocket Handler | Connection lifecycle management | P0 |
| CommandProcessor | Voice command parsing | P0 |
| Gemini Live Adapter | Protocol implementation | P0 |
| State Machine | Session state management | P0 |
| Audio Playback | PCM audio streaming | P0 |

### Technical Tasks

```
4.1 Implement Voice domain models
    ├── VoiceSession entity
    ├── VoiceCommand value object
    ├── DialogTurn value object
    └── VoiceSessionAggregate with state machine

4.2 Create Gemini Live adapter
    ├── WebSocket connection management
    ├── BidiGenerateContentSetup message
    ├── Audio streaming (send/receive)
    ├── Transcript parsing
    └── Session timeout handling

4.3 Build VoiceDeliveryEngine
    ├── openSession() / closeSession()
    ├── deliverFact() with text input
    ├── listenForCommands() with timeout
    └── State transitions

4.4 Implement CommandProcessor
    ├── Transcript normalization
    ├── Command pattern matching
    ├── Fuzzy matching for variants
    ├── Follow-up question detection
    └── Confidence scoring

4.5 Create audio playback handler
    ├── PCM audio decoding
    ├── Web Audio API playback
    ├── Buffer management
    └── Playback state control

4.6 Implement microphone capture
    ├── getUserMedia() with constraints
    ├── PCM encoding (16-bit 16kHz)
    ├── Streaming to WebSocket
    └── Permission handling
```

### Acceptance Criteria

- [ ] WebSocket connects to Gemini Live API
- [ ] Setup message accepted, setup complete received
- [ ] Text sent, audio streamed back successfully
- [ ] Audio plays through device speakers
- [ ] Microphone captures and streams audio
- [ ] Commands recognized (pause, skip, etc.)
- [ ] Session times out correctly (10 min)
- [ ] State machine transitions correctly

### WebSocket Message Flow

```
Client                                              Server
  │                                                    │
  │─── BidiGenerateContentSetup ─────────────────────►│
  │                                                    │
  │◄── BidiGenerateContentSetupComplete ──────────────│
  │                                                    │
  │─── BidiGenerateContentClientContent (text) ──────►│
  │                                                    │
  │◄── BidiGenerateContentServerContent (audio) ──────│
  │◄── BidiGenerateContentServerContent (audio) ──────│
  │◄── BidiGenerateContentServerContent (done) ───────│
  │                                                    │
  │─── BidiGenerateContentRealtimeInput (audio) ─────►│
  │                                                    │
  │◄── BidiGenerateContentServerContent (transcript) ─│
  │                                                    │
  │─── Close ────────────────────────────────────────►│
```

---

## Phase 5: Audio Management Context Implementation

**Goal:** Implement Android-style audio focus for navigation-like behavior.

### Deliverables

| Item | Description | Priority |
|------|-------------|----------|
| AudioFocusManager | Focus request/release | P0 |
| Capacitor Plugin | Native audio bridge | P0 |
| Ducking Handler | Volume reduction coordination | P1 |
| Focus Loss Handler | Graceful interruption | P1 |
| Platform Tests | Android/iOS verification | P0 |

### Technical Tasks

```
5.1 Implement Audio domain models
    ├── AudioFocusRequest entity
    ├── FocusType value object
    └── AudioFocusAggregate

5.2 Install and configure Capacitor
    ├── @capacitor/core
    ├── @capacitor/geolocation (if not done)
    ├── Audio focus plugin
    └── Platform configuration

5.3 Create AudioFocusManager
    ├── requestFocus(type)
    ├── releaseFocus()
    ├── onFocusLoss callback
    └── Integration with voice engine

5.4 Build Android audio adapter
    ├── Native plugin bridge
    ├── AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK
    ├── Focus change listener
    └── Volume restoration

5.5 Implement focus coordination
    ├── Request before speech
    ├── Release after delivery
    ├── Pause on temporary loss
    └── Stop on permanent loss

5.6 Test on physical devices
    ├── Audio ducking with Spotify/podcast
    ├── Focus behavior during phone calls
    ├── Navigation app interaction
    └── Multiple audio source scenarios
```

### Acceptance Criteria

- [ ] Audio focus requested before speech starts
- [ ] Other apps duck (reduce volume) during Driftwise speech
- [ ] Focus released immediately after speech ends
- [ ] Original volume restored after release
- [ ] Phone call interrupts and pauses delivery
- [ ] Navigation announcements take priority
- [ ] Works correctly on Android 10+

### Integration Pattern

```typescript
async function deliverFactWithAudioFocus(fact: HistoricalFact) {
  // 1. Request audio focus
  const focusResult = await audioFocusManager.requestFocus('transient_may_duck');

  if (focusResult !== 'granted') {
    // Another app has priority (e.g., phone call)
    return { status: 'skipped', reason: 'audio_focus_denied' };
  }

  try {
    // 2. Deliver via voice engine
    const result = await voiceDeliveryEngine.deliverFact(fact);
    return result;
  } finally {
    // 3. Always release focus
    await audioFocusManager.releaseFocus();
  }
}
```

---

## Phase 6: End-to-End Integration

**Goal:** Orchestrate all contexts into a cohesive delivery cycle.

### Deliverables

| Item | Description | Priority |
|------|-------------|----------|
| StateManager | Application orchestration | P0 |
| Delivery Cycle | Complete GPS→Speech flow | P0 |
| Error Recovery | Graceful degradation | P0 |
| User Preferences | Settings persistence | P1 |
| Event Bus | Cross-context communication | P1 |

### Technical Tasks

```
6.1 Create StateManager
    ├── Application state machine
    ├── Cycle timer management
    ├── Context coordination
    └── Error state handling

6.2 Implement delivery cycle
    ├── Timer fires → LOCATING
    ├── GPS acquired → GEOCODING
    ├── Places resolved → RESEARCHING
    ├── Fact generated → SPEAKING
    ├── Speech complete → LISTENING
    └── Timeout/command → IDLE

6.3 Build error recovery
    ├── GPS failure → skip cycle
    ├── Geocoding failure → skip cycle
    ├── Gemini failure → skip cycle
    ├── Voice failure → toast fallback
    └── Network offline → queue

6.4 Create user preferences system
    ├── Polling interval control
    ├── Interest threshold setting
    ├── Voice preset selection
    ├── IndexedDB persistence
    └── Settings UI

6.5 Implement event bus
    ├── Domain event publication
    ├── Cross-context subscription
    ├── Event logging
    └── Debugging support

6.6 Build main UI
    ├── Status indicator
    ├── Current state display
    ├── Settings panel
    ├── Permission prompts
    └── Error messages
```

### Acceptance Criteria

- [ ] Complete cycle runs end-to-end
- [ ] Timer fires at correct intervals
- [ ] All state transitions work correctly
- [ ] Errors don't crash the application
- [ ] Preferences persist across sessions
- [ ] Voice commands update state/preferences
- [ ] UI reflects current application state

### State Machine (Complete)

```
                              ┌─────────────────┐
                              │      IDLE       │
                              │  (Timer runs)   │
                              └────────┬────────┘
                                       │ timer fires
                                       ▼
                              ┌─────────────────┐
                              │    LOCATING     │
                              │  (GPS request)  │
                              └────────┬────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │ failure          │ success          │
                    ▼                  ▼                  │
               ┌─────────┐      ┌─────────────────┐       │
               │  IDLE   │      │   GEOCODING     │       │
               │ (skip)  │      │  (Nominatim)    │       │
               └─────────┘      └────────┬────────┘       │
                                         │                │
                    ┌────────────────────┼────────────────┘
                    │ failure            │ success
                    ▼                    ▼
               ┌─────────┐      ┌─────────────────┐
               │  IDLE   │      │  RESEARCHING    │
               │ (skip)  │      │  (Gemini API)   │
               └─────────┘      └────────┬────────┘
                                         │
                    ┌────────────────────┼────────────────┐
                    │ NO_FACT            │ success        │
                    ▼                    ▼                │
               ┌─────────┐      ┌─────────────────┐       │
               │  IDLE   │      │    SPEAKING     │       │
               │ (skip)  │      │  (Live API)     │       │
               └─────────┘      └────────┬────────┘       │
                                         │                │
                    ┌────────────────────┼────────────────┤
                    │ pause              │ complete       │ skip
                    ▼                    ▼                ▼
               ┌─────────┐      ┌─────────────────┐  ┌─────────┐
               │ PAUSED  │      │   LISTENING     │  │  IDLE   │
               └────┬────┘      │   (5 seconds)   │  └─────────┘
                    │           └────────┬────────┘
                    │ continue           │
                    └────────────────────┤
                                         │
                    ┌────────────────────┼────────────────┐
                    │ follow-up          │ timeout        │ skip
                    ▼                    ▼                ▼
               ┌─────────┐         ┌─────────┐      ┌─────────┐
               │SPEAKING │         │  IDLE   │      │  IDLE   │
               └─────────┘         └─────────┘      └─────────┘
```

---

## Phase 7: PWA Optimization

**Goal:** Optimize for installability, offline resilience, and performance.

### Deliverables

| Item | Description | Priority |
|------|-------------|----------|
| Service Worker | Caching and offline support | P0 |
| PWA Manifest | Install metadata | P0 |
| Install Prompt | Custom install UX | P1 |
| Offline Mode | Degraded functionality | P1 |
| Performance Audit | Lighthouse optimization | P0 |

### Technical Tasks

```
7.1 Configure Vite PWA plugin
    ├── workbox configuration
    ├── Manifest generation
    ├── Auto-update strategy
    └── Precache manifest

7.2 Define caching strategies
    ├── Static assets: Cache First
    ├── API calls: Network First
    ├── HTML shell: Stale While Revalidate
    └── Fonts/images: Cache First

7.3 Create PWA manifest
    ├── App name and icons
    ├── Theme and background colors
    ├── Display mode: standalone
    ├── Orientation: portrait
    └── Categories

7.4 Build install prompt
    ├── beforeinstallprompt capture
    ├── Custom install button
    ├── Post-install confirmation
    └── iOS Safari instructions

7.5 Implement offline mode
    ├── Detect network status
    ├── Queue failed requests
    ├── Use cached geocoding
    └── Display offline indicator

7.6 Run performance audit
    ├── Lighthouse PWA score
    ├── Bundle size optimization
    ├── Image optimization
    ├── Code splitting
    └── Tree shaking verification
```

### Acceptance Criteria

- [ ] Lighthouse PWA score ≥ 90
- [ ] Lighthouse Performance score ≥ 90
- [ ] App installable on Android Chrome
- [ ] App installable on iOS Safari
- [ ] Works offline (cached data)
- [ ] Service worker updates correctly
- [ ] Bundle size < 200KB gzipped

### Caching Strategy Table

| Resource | Strategy | Cache Name | TTL |
|----------|----------|------------|-----|
| `/`, `/index.html` | Stale While Revalidate | `shell-v1` | - |
| `*.js`, `*.css` | Cache First | `static-v1` | 1 year |
| `*.woff2`, `*.ttf` | Cache First | `fonts-v1` | 1 year |
| `*.png`, `*.svg` | Cache First | `images-v1` | 30 days |
| Nominatim API | Network First | `api-geocoding-v1` | 24h fallback |
| Gemini API | Network Only | - | - |

---

## Phase 8: Production Release

**Goal:** Prepare for deployment with security, documentation, and monitoring.

### Deliverables

| Item | Description | Priority |
|------|-------------|----------|
| Production Build | Optimized bundle | P0 |
| Security Review | Vulnerability scan | P0 |
| Documentation | User and developer docs | P0 |
| Deployment | Static hosting setup | P0 |
| Monitoring | Error tracking | P1 |

### Technical Tasks

```
8.1 Production build
    ├── Environment variables check
    ├── Source maps (external)
    ├── Bundle analysis
    ├── Asset optimization
    └── Build verification

8.2 Security review
    ├── API key exposure check
    ├── CSP headers configuration
    ├── XSS prevention verification
    ├── HTTPS enforcement
    └── Dependency audit

8.3 Documentation
    ├── User guide (README)
    ├── API documentation
    ├── Troubleshooting guide
    ├── Contributing guide
    └── Changelog

8.4 Deployment setup
    ├── Vercel/Netlify configuration
    ├── Custom domain (optional)
    ├── SSL certificate
    ├── Redirects and headers
    └── Preview deployments

8.5 Error monitoring
    ├── Client-side error capture
    ├── API failure logging
    ├── Performance metrics
    └── User feedback mechanism

8.6 Launch preparation
    ├── Final testing on devices
    ├── Documentation review
    ├── Backup and recovery plan
    └── Post-launch monitoring
```

### Acceptance Criteria

- [ ] Production build runs without errors
- [ ] No API keys exposed in client bundle
- [ ] CSP headers block inline scripts
- [ ] HTTPS enforced
- [ ] All documentation complete
- [ ] Deployed and accessible
- [ ] Error monitoring active
- [ ] Performance budgets met

### Security Checklist

```
[x] API keys loaded from environment, not hardcoded
[x] No secrets in client-side JavaScript
[x] HTTPS only (no mixed content)
[x] Content-Security-Policy header set
[x] X-Frame-Options: DENY
[x] X-Content-Type-Options: nosniff
[x] Referrer-Policy: strict-origin-when-cross-origin
[x] Permissions-Policy configured
[x] Dependencies audited (npm audit)
[x] No eval() or Function() usage
```

### Deployment Configuration (Vercel)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ],
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

---

## Phase Dependencies

```
Phase 1 (Foundation)
    │
    ├──► Phase 2 (Location) ──► Phase 3 (Discovery)
    │                                    │
    │                                    ▼
    │                           Phase 4 (Voice) ──► Phase 5 (Audio)
    │                                                      │
    │                                                      ▼
    └─────────────────────────────────────────────► Phase 6 (Integration)
                                                           │
                                                           ▼
                                                   Phase 7 (PWA)
                                                           │
                                                           ▼
                                                   Phase 8 (Release)
```

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Gemini API rate limits | High | Medium | 15s minimum gap, graceful skip |
| Nominatim unavailable | Low | Medium | 24h cache, skip on failure |
| Audio focus API limitations | Medium | High | Web Audio fallback, toast fallback |
| PWA background restrictions | High | Medium | User education, manual refresh |
| Voice recognition accuracy | Medium | Medium | Fuzzy matching, command confirmation |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Cycle completion rate | >80% | Facts delivered / cycles attempted |
| Command recognition rate | >90% | Commands recognized / commands spoken |
| Audio ducking success | >95% | Successful ducks / duck attempts |
| PWA Lighthouse score | >90 | Lighthouse audit |
| Bundle size | <200KB | Gzipped production build |
| Time to first fact | <20s | GPS poll → speech start |

---

**End of Implementation Roadmap**

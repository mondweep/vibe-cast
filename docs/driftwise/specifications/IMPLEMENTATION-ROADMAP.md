# Implementation Roadmap

**Version:** 1.0.0
**Planner:** Roadmap_Lead (Swarm Agent)

---

This roadmap breaks the development into 8 distinct phases, optimized for iterative value delivery.

## 📅 Phases

### Phase 1: Foundation & "Hello World" (Days 1-2)
*   **Goal**: A running SvelteKit PWA on localhost with TDD setup.
*   **Tasks**:
    *   Initialize SvelteKit + TypeScript + Tailwind.
    *   **TDD Setup**: Configure Vitest and Playwright.
    *   Configure Capacitor (Android platform).
    *   Set up CI/CD pipeline (GitHub Actions -> Netlify) running tests.
    *   **Deliverable**: A deployed blank app accessible on mobile, with passing "Hello World" test.

### Phase 2: Location Core (Days 3-5)
*   **Goal**: Accurate text readout of current location.
*   **Tasks**:
    *   **Red**: Write failing test for `LocationService`.
    *   Implement `LocationContext` (DDD).
    *   **Green**: Pass `LocationService` tests.
    *   Integrate `@capacitor/geolocation`.
    *   **Red**: Write failing test for `GeocodingAdapter` rate limiting.
    *   Build Nominatim (OSM) Adapter with rate limiting.
    *   **Deliverable**: Screen showing "You are in [Village Name], heading North."

### Phase 3: The Brain (Discovery Context) (Days 6-8)
*   **Goal**: Generate interesting text facts about the location.
*   **Tasks**:
    *   Integrate Google Gemini 2.5 Flash API.
    *   Design System Prompts for "Serendipity".
    *   Implement "Fact History" (deduplication).
    *   **Deliverable**: Text card appearing: "Did you know [Fact]?" when location changes.

### Phase 4: The Voice (Narrative Context) (Days 9-12)
*   **Goal**: Speak the facts using Gemini Live.
*   **Tasks**:
    *   Implement WebSocket connection handling.
    *   Connect Driftwise `Fact` output to Live API input.
    *   Handle audio output stream (PCM/AudioWorklet).
    *   **Deliverable**: App "speaks" the fact generated in Phase 3.

### Phase 5: Mobile Integration (Audio Focus) (Days 13-14)
*   **Goal**: Play nice with Spotify/Maps.
*   **Tasks**:
    *   Implement `@capacitor-community/audio-focus`.
    *   Logic: Request Focus -> Speak -> Release Focus.
    *   Handle interruptions (incoming calls).
    *   **Deliverable**: Music volume dips (ducks) when Driftwise speaks.

### Phase 6: UX Polish & Configuration (Days 15-16)
*   **Goal**: User control.
*   **Tasks**:
    *   Build Settings UI (Interest sliders, Verbosity).
    *   Add "History" view (scroll back past spoken facts).
    *   Visualizer for Voice Activity.
    *   **Deliverable**: polished UI, persistent settings.

### Phase 7: Agentic Tuning (The "Swarms") (Days 17-18)
*   **Goal**: Automated Code Review & Optimization.
*   **Tasks**:
    *   Run `agentic-qe` audit.
    *   Use Claude Flow agents to refactor code and add comments.
    *   Optimize bundle size.

### Phase 8: Release (Day 19+)
*   **Goal**: Production.
*   **Tasks**:
    *   Generate App Icons / Splash Screen.
    *   Final testing (Drive test!).
    *   Release v1.0.0 tag.

---
## 🏁 Definition of Done
A phase is done when the **Deliverable** is verified on a physical Android device, not just the browser simulator.

# Driftwise: Architecture & Framework Document (AFD)

**Version:** 1.0.0
**Status:** Approved
**Architect:** System_Architect (Swarm Agent)

---

## 1. Executive Summary

Driftwise is a client-side heavy **Progressive Web Application (PWA)** designed for zero-latency voice interaction. It minimizes server-side dependencies by leveraging local device capabilities (Geolocation, IndexedDB, Web Audio) and connecting directly to third-party APIs (Gemini, Nominatim) from the client. This "Thick Client" architecture ensures responsiveness and keeps the V1 infrastructure costs near zero.

## 2. System Components

### 2.1 Core Application (SvelteKit)
*   **Framework**: SvelteKit (Static Adapter).
*   **Responsibility**: UI rendering, State Management (Stores), Service Worker orchestration.
*   **Deployment**: Netlify / Vercel (Edge).

### 2.2 Mobile Bridge (Capacitor)
*   **Role**: Native API Access.
*   **Critical Plugins**:
    *   `@capacitor/geolocation`: Background location tracking (crucial for driving).
    *   `@capacitor-community/audio-focus`: Requesting Android Audio Focus to duck music/podcasts when Driftwise speaks.
    *   `@capacitor/keep-awake`: Preventing screen lock (optional).

### 2.3 Intelligence Layer (Gemini)
*   **Fact Generation**: `gemini-2.5-flash`. High-speed, low-latency text generation. Queries include location context, weather, and time of day.
*   **Voice Interface**: `Gemini Live API` (WebSocket). Provides real-time, interruptible, bidirectional voice communication. We do **not** use separate TTS/STT services; the Live API handles both.

### 2.4 Geocoding Service (Nominatim)
*   **Source**: OpenStreetMap.
*   **Protocol**: REST.
*   **Constraint**: Strict 1 request/second rate limiting (enforced by `RequestQueue` service).

## 3. Data Flow Architecture

### 3.1 The "Serendipity Loop"

1.  **Trigger**: `LocationService` detects significant movement (>500m) via Capacitor Background Geolocation.
2.  **Resolve**: `GeocodingService` converts lat/long to a set of entities (Town, Village, Landmark).
3.  **Filter**: `ContextManager` checks `HistoryStore` (IndexedDB) to ensure we haven't spoken about this location recently.
4.  **Generate**: `FactAgent` constructs a prompt for Gemini 2.5 Flash: *"Tell me a non-generic, historical fact about [Location] involving [Topic]. Context: [Speed], [Weather]."*
5.  **Queue**: The result is pushed to the `NarrativeQueue`.
6.  **Deliver**: `VoiceOrchestrator` checks `AudioFocus`. If clear, it opens a Gemini Live session and speaks the content.

## 4. Security Architecture

### 4.1 API Key Management (V1)
*   **Strategy**: "Bring Your Own Key" (Local-First).
*   **Implementation**: API Keys are stored in `localStorage` or `.env` during development.
*   **Risk**: Low (Personal use). Keys are never sent to a Driftwise backend (because there isn't one).

### 4.2 Data Privacy
*   **Location**: Processed entirely on-device and ephemeral. Coordinates are sent *only* to Nominatim (Geocoding) and Gemini (Context). No tracking database.
*   **Persistence**: All history is stored in `IndexedDB` on the user's device.

## 5. Technology Standards

*   **Language**: TypeScript (Strict).
*   **State**: Svelte Stores (`writable`, `derived`).
*   **Styling**: TailwindCSS (Utility-first).
*   **Testing**: Vitest (Unit), Playwright (E2E).

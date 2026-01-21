# Driftwise

**Voice-First Serendipitous Local History Companion for Drivers**

> *"Every journey has stories waiting to be discovered."*

Driftwise transforms your daily commute into an opportunity for authentic discovery. It's a Progressive Web App (PWA) that delivers fascinating, non-obvious historical facts about the places you pass through—without requiring any interaction or distraction from driving.

---

## Why Driftwise?

### The Problem

Modern navigation apps have optimized away the journey. We travel through places rich with history—sites of invention, moments of human triumph, forgotten stories—yet experience them as nothing more than GPS coordinates and ETA calculations.

Generic tourism apps compound this: they surface the same "Top 10 Attractions" and recycled travel-brochure prose. *"Known for its picturesque scenery and charming local pubs."* This isn't discovery—it's advertising.

### The Vision

**Serendipity, Not Search.** Driftwise doesn't wait for you to ask. It researches in real-time, finds edge-case facts about wherever you happen to be, and delivers them via voice—seamlessly ducking your podcast or music, like a navigation announcement.

**Specific, Not Generic.** We prioritize:
- Named individuals and their stories
- Specific dates, measurements, and quantities
- Unusual events, firsts, and records
- Industrial, engineering, and scientific history

We explicitly filter out:
- "Famous for" and "known for" tourism speak
- Regional clichés and postcard descriptions
- Vague historical references without specifics

**Voice-First, Driver-Safe.** No screens to glance at. No buttons to press. Facts arrive as natural speech, with a 5-second window to ask follow-up questions, pause, or adjust frequency—all by voice.

### Why Now?

- **Gemini Live API** enables real-time bidirectional voice interaction with native-quality speech
- **PWA + Capacitor** provides near-native device access (GPS, audio focus) without app store friction
- **Web Search Grounding** allows AI to research current, verifiable facts in real-time

---

## Quick Start

### Prerequisites

- Node.js 18+ or Bun 1.0+
- A Gemini API key ([Get one free](https://aistudio.google.com/))
- Modern browser with PWA support (Chrome, Edge, Safari)

### Installation

```bash
# Clone the repository
git clone https://github.com/mondweep/vibe-cast.git
cd vibe-cast/driftwise

# Install dependencies
npm install

# Configure your API key
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Start development server
npm run dev
```

### First Run

1. Open `http://localhost:5173` in Chrome
2. Grant location permission when prompted
3. Grant microphone permission for voice commands
4. Start driving (or simulate movement for testing)
5. Within 5 minutes, your first historical fact arrives

### Install as PWA

On Android Chrome:
1. Open the app URL
2. Tap the menu (three dots)
3. Select "Add to Home Screen"
4. Launch from your home screen for standalone experience

---

## Features

### Core Functionality

| Feature | Description |
|---------|-------------|
| **Serendipitous Facts** | AI-researched historical facts about your current location |
| **Voice Delivery** | Natural speech via Gemini Live API |
| **Audio Ducking** | Automatically lowers podcast/music volume during delivery |
| **Voice Commands** | "Pause", "Skip", "More often", "Less often" |
| **Follow-up Questions** | 5-second window to ask "Tell me more" |
| **Configurable Cadence** | 2-15 minute polling interval |
| **Offline Resilience** | Gracefully skips cycles when offline |

### V1 Limitations (By Design)

- **No Backend**: API keys stored locally (personal use only)
- **No User Accounts**: No login, no cloud sync
- **No Analytics**: No tracking, no data collection
- **Single Device**: No multi-device synchronization

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   Driftwise PWA (Client)                    │
├─────────────────────────────────────────────────────────────┤
│  Location Service    →   Geocoding Client   →   Fact Gen   │
│  (Geolocation API)      (Nominatim/OSM)       (Gemini API) │
│                                                             │
│                    Voice Delivery Engine                    │
│                    (Gemini Live API)                        │
│                           ↓                                 │
│                  Audio Focus Manager                        │
│                  (Android Audio API)                        │
└─────────────────────────────────────────────────────────────┘
```

**Tech Stack:**
- **Framework**: SvelteKit + Vite
- **Mobile**: Capacitor (Android/iOS)
- **Voice**: Gemini Live API (WebSocket)
- **Geocoding**: Nominatim (OpenStreetMap)
- **Persistence**: IndexedDB
- **PWA**: Vite PWA Plugin

See [Architecture Document](docs/architecture/AFD-ARCHITECTURE.md) for full details.

---

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture (AFD)](docs/architecture/AFD-ARCHITECTURE.md) | System components, data flow, security |
| [Domain Design (DDD)](docs/ddd/DDD-OVERVIEW.md) | Bounded contexts, aggregates, domain events |
| [Implementation Roadmap](docs/specifications/IMPLEMENTATION-ROADMAP.md) | 8-phase development plan |
| [Contributing Guide](CONTRIBUTING.md) | How to contribute |
| [Changelog](CHANGELOG.md) | Version history |

---

## Project Structure

```
driftwise/
├── .claude-flow/          # Claude Flow agentic configuration
│   ├── config.yaml        # Runtime configuration
│   ├── agents/            # Agent definitions
│   └── workflows/         # Automated workflows
├── .claude/               # Claude Code commands
├── docs/
│   ├── architecture/      # AFD and technical specs
│   ├── ddd/               # Domain-driven design
│   └── specifications/    # Roadmap and requirements
├── src/
│   ├── lib/
│   │   ├── domain/        # DDD domain models
│   │   │   ├── location/
│   │   │   ├── discovery/
│   │   │   ├── voice/
│   │   │   ├── audio/
│   │   │   └── config/
│   │   ├── services/      # Application services
│   │   ├── adapters/      # Anti-corruption layers
│   │   └── stores/        # Svelte stores
│   ├── routes/            # SvelteKit routes
│   └── components/        # UI components
├── static/                # Static assets
└── tests/                 # Test suites
```

---

## Voice Commands

| Command | Variants | Effect |
|---------|----------|--------|
| **Pause** | "pause", "wait", "hold on" | Pauses current speech |
| **Continue** | "continue", "go on", "resume" | Resumes paused speech |
| **Skip** | "skip", "next", "stop" | Ends current fact delivery |
| **More** | "more often", "more facts" | Decreases interval (min 2 min) |
| **Less** | "less often", "fewer facts", "quiet mode" | Increases interval (max 15 min) |

---

## Configuration

### Environment Variables

```bash
# Required
GEMINI_API_KEY=your_api_key_here

# Optional
NOMINATIM_USER_AGENT=Driftwise/1.0
DEFAULT_POLLING_INTERVAL_MS=300000  # 5 minutes
MIN_POLLING_INTERVAL_MS=120000       # 2 minutes
MAX_POLLING_INTERVAL_MS=900000       # 15 minutes
```

### User Preferences (In-App)

- **Polling Interval**: How often to check for new facts (2-15 min)
- **Voice**: Choose from available Gemini voice presets
- **Interest Threshold**: Filtering sensitivity (Low/Medium/High)

---

## Development

### Prerequisites for Development

```bash
# Install Claude Flow for agentic development (optional)
npx @claude-flow/cli init

# Install Claude Code (recommended)
npm install -g @anthropic/claude-code
```

### Available Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
npm run test       # Run test suite
npm run lint       # Lint code
npm run format     # Format code
```

### Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e
```

---

## Roadmap

| Phase | Focus | Status |
|-------|-------|--------|
| 1 | Project Setup & Foundation | Planned |
| 2 | Location Context Implementation | Planned |
| 3 | Historical Discovery Engine | Planned |
| 4 | Voice Interaction System | Planned |
| 5 | Audio Management & Integration | Planned |
| 6 | PWA Optimization & Polish | Planned |
| 7 | Testing & Quality Assurance | Planned |
| 8 | Production Release | Planned |

See [Implementation Roadmap](docs/specifications/IMPLEMENTATION-ROADMAP.md) for details.

---

## Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) for details on:

- Code style and conventions
- Pull request process
- Issue reporting guidelines

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- **Nominatim/OpenStreetMap** for free geocoding
- **Google Gemini** for AI capabilities
- **Svelte/SvelteKit** for the excellent framework
- **Claude Flow** for agentic development infrastructure

---

*Built with curiosity. Designed for discovery.*

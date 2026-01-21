# Driftwise - Claude Code Instructions

## Project Overview

Driftwise is a voice-first Progressive Web App (PWA) that delivers serendipitous historical facts about locations during car journeys. It uses the Gemini Live API for real-time voice interaction.

## Architecture

This project follows **Domain-Driven Design (DDD)** with five bounded contexts:

1. **Location Context** - GPS acquisition and geocoding
2. **Historical Discovery Context** - Fact generation and quality filtering
3. **Voice Interaction Context** - Gemini Live API and speech
4. **Audio Management Context** - Audio focus and ducking
5. **Configuration Context** - User preferences

## Key Documentation

- [Architecture (AFD)](docs/architecture/AFD-ARCHITECTURE.md) - System components, data flow, security
- [Domain Design (DDD)](docs/ddd/DDD-OVERVIEW.md) - Bounded contexts, aggregates, events
- [Implementation Roadmap](docs/specifications/IMPLEMENTATION-ROADMAP.md) - 8-phase development plan

## Technology Stack

- **Framework**: SvelteKit + TypeScript
- **Build**: Vite with PWA plugin
- **Mobile**: Capacitor for native APIs
- **Voice AI**: Gemini Live API (WebSocket)
- **Text AI**: Gemini 2.5 Flash with web search
- **Geocoding**: Nominatim (OpenStreetMap)
- **Storage**: IndexedDB

## Code Organization

```
src/lib/
├── domain/           # DDD domain models
│   ├── location/     # GPS, geocoding
│   ├── discovery/    # Fact generation
│   ├── voice/        # Live API, commands
│   ├── audio/        # Audio focus
│   └── config/       # Preferences
├── services/         # Application services
├── adapters/         # External API adapters
├── stores/           # Svelte stores
└── components/       # UI components
```

## Development Guidelines

### DDD Patterns

- **Aggregates**: Use for transactional consistency
- **Value Objects**: Immutable, validated data
- **Domain Events**: Cross-context communication
- **Anti-Corruption Layers**: API adapters

### Code Style

- TypeScript strict mode enabled
- No `any` types without justification
- Prefer composition over inheritance
- Use ubiquitous language from DDD docs

### Error Handling

- **Skip cycles, don't crash**: All errors should be recoverable
- **Log, don't alert**: Silent failure for missing data
- **Graceful degradation**: Fall back to simpler modes

## Commands

### Development
```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run preview    # Preview build
```

### Testing
```bash
npm run test       # Run all tests
npm run test:unit  # Unit tests only
npm run lint       # Lint code
npm run check      # TypeScript check
```

## API Keys

**Never commit API keys to the repository.**

Required environment variables:
- `VITE_GEMINI_API_KEY` - Gemini API key

Copy `.env.example` to `.env` and add your keys.

## Claude Flow Integration

This project uses Claude Flow V3 for agentic development workflows.

Configuration: `.claude-flow/config.yaml`
Agents: `.claude-flow/agents/`
Workflows: `.claude-flow/workflows/`

## Important Files

| File | Purpose |
|------|---------|
| `src/lib/domain/*/aggregates/*.ts` | Domain aggregates |
| `src/lib/adapters/*.ts` | External API adapters |
| `src/lib/services/*.ts` | Application services |
| `src/routes/+page.svelte` | Main application UI |

## Serendipity Philosophy

The core product principle is **serendipity over search**:

- Facts are delivered proactively, not on demand
- Quality over quantity (skip cycles if no good fact)
- Specific historical details, not tourism clichés
- Voice-first, zero visual attention required

When implementing features, always ask: "Does this enhance serendipitous discovery?"

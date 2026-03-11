# Agentics Foundation: Resources and Network -- From Ideation to Prototyping and Beyond

**AI Summit 2026 | Sri Karan Narendra Agricultural University (SKNAU), Jobner | RARI, Durgapura, Jaipur**

Presentation and demo materials for Mondweep Chakravorty's talk at the AI Summit, 12th March 2026.

---

## Project Overview

This repository contains two components built for the AI Summit 2026 at SKNAU:

1. **Presentation** (`/presentation`) -- A self-contained HTML slide deck covering agentic AI, the Agentics Foundation, and the journey from ideation to prototype.
2. **KrishiMitra** (`/krishimitra`) -- "The Farmer's AI Companion" -- a fully functional agriculture advisory application for Rajasthan farmers, demonstrating what can be built from idea to working prototype using agentic AI tools.

KrishiMitra provides district-specific, data-backed farming advice using real Indian government data sources, live mandi prices, weather forecasts, and optional AI-powered advisory via Claude or Gemini.

---

## Quick Start

### Static Mode (No Dependencies)

Open `krishimitra/index.html` directly in any modern browser. The app runs in offline mode with basic template responses. No server or installation required.

### Server Mode (Real Data + Database)

```bash
cd krishimitra/server
npm install
node fetch-data.js    # Fetch live mandi prices + weather data
npm start             # Start server on port 3000
```

Then open [http://localhost:3000](http://localhost:3000) in your browser. The server provides:
- SQLite database with 8 tables of agricultural data
- Live mandi prices from data.gov.in
- Real-time weather from Open-Meteo
- Template-based advisory from database context (no API key needed)

### With AI-Powered Advisory (Optional)

Create a `.env` file in `krishimitra/server/`:

```env
# For Claude (default)
ANTHROPIC_API_KEY=your-key-here
LLM_PROVIDER=anthropic

# OR for Gemini
GEMINI_API_KEY=your-key-here
LLM_PROVIDER=gemini
```

Then start the server as above. The LLM receives full database context (soil profiles, MSP prices, pest data, market prices, government schemes) and generates rich, context-aware advisory responses.

---

## Architecture Overview

```
Browser (index.html)  <-->  Express Server (port 3000)  <-->  SQLite DB
                                    |
                                    +--> Claude / Gemini API (optional)
                                    +--> Open-Meteo API (weather proxy)

fetch-data.js  -->  data.gov.in API  -->  SQLite DB (market_prices)
               -->  Open-Meteo API   -->  SQLite DB (weather_cache)
```

The application works at three levels:
1. **Offline** -- Open `index.html` directly; basic hardcoded fallback responses
2. **Database** -- Run the server without an API key; advisory built from real DB data using templates
3. **Full AI** -- Run the server with a Claude or Gemini API key; LLM generates advisory with full DB context

See [`krishimitra/ARCHITECTURE.md`](krishimitra/ARCHITECTURE.md) for detailed architecture diagrams and data flow documentation.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML/CSS/JS, Inter + Noto Sans Devanagari fonts |
| Backend | Node.js, Express 4.x |
| Database | SQLite via better-sqlite3 |
| AI (optional) | Anthropic Claude (claude-sonnet-4-20250514) or Google Gemini (gemini-2.0-flash) |
| Weather | Open-Meteo API (free, no key required) |
| Market Data | data.gov.in Agmarknet API |
| Testing | Playwright (Chromium) |

---

## Features

- **District-specific advisory** for 10 Rajasthan districts (Jaipur, Jodhpur, Udaipur, Kota, Bikaner, Ajmer, Alwar, Bharatpur, Sri Ganganagar, Sikar)
- **15 crops** with season, soil, and water requirement data
- **Crop management recommendations** tailored to soil type, farm size, and irrigation
- **Pest and disease alerts** with bio and chemical treatment options
- **Irrigation scheduling** guidance
- **Market intelligence** with live mandi prices and MSP comparison
- **Fertilizer guidance** based on soil nutrient profiles
- **Weather impact advisory** using real-time forecasts
- **Government schemes** information (PM-KISAN, PMFBY, PMKSY, Soil Health Card, e-NAM, KCC)
- **Hindi language support** -- full Devanagari UI and AI responses in Hindi

---

## Data Sources

| Source | Data | Notes |
|--------|------|-------|
| [data.gov.in](https://data.gov.in) | Live mandi prices (Agmarknet) | Rajasthan commodity prices fetched via API |
| [Open-Meteo](https://open-meteo.com) | Real-time weather + 7-day forecast | Free API, no key required |
| Agmarknet seed data | Baseline market prices | 20 records seeded for offline use |
| Government of India | MSP rates 2024-25 and 2025-26 | 25 entries covering Kharif and Rabi seasons |
| ICAR / KVK | Soil profiles, pest calendar | 10 district soil profiles, 12 pest entries |
| GoI scheme portals | Government scheme details | 6 schemes with eligibility and benefits |

---

## Hindi Language Support

KrishiMitra supports full English/Hindi bilingual operation:

- **UI toggle** -- Switch between English and Hindi with the header language buttons
- **All labels and buttons** have `data-en` and `data-hi` attributes
- **LLM responses** -- When Hindi is selected, the system prompt instructs the AI to respond entirely in Devanagari script
- **Database** -- Crop names, soil types, pest names, district names, and scheme names are stored in both English and Hindi
- **Fallback templates** -- Template-based responses also render in Hindi when the language is set

---

## Running Tests

The project uses Playwright for end-to-end testing:

```bash
cd krishimitra/server
npx playwright install chromium    # First time only
npm test                           # Runs Playwright tests against Chromium
```

---

## Project Structure

```
vibe-cast/
  README.md                         # This file
  presentation/
    index.html                      # Slide deck for AI Summit talk
  krishimitra/
    ARCHITECTURE.md                 # Detailed architecture documentation
    index.html                      # Frontend (single-page app)
    server/
      server.js                     # Express API server
      db.js                         # SQLite schema, seed data, init
      fetch-data.js                 # Live data fetcher (data.gov.in + Open-Meteo)
      krishimitra.db                # SQLite database (auto-created)
      package.json                  # Dependencies and scripts
      .env                          # API keys (create manually, not committed)
```

---

## Contents

### Presentation (`/presentation`)

A self-contained HTML slide deck covering:
- Speaker introduction
- The gap between AI promise and AI delivery
- What is the Agentics Foundation
- The Agentic AI ecosystem (MCP, Goose, AGENTS.md)
- Resources available (agentics.org, video, community)
- From ideation to prototype with agentic AI
- Agriculture + AI: Why it matters
- Live demo introduction
- Beyond prototyping -- Forge and quality gates
- Call to action

**To run:** Open `presentation/index.html` in any modern browser. Use arrow keys or click to navigate.

### KrishiMitra Demo App (`/krishimitra`)

See the [Quick Start](#quick-start) section above for running instructions.

---

## Speaker

**Mondweep Chakravorty**
- Head of AI Strategy & Delivery, DxSure Ltd., UK
- Co-Founder, Agentics Foundation London Chapter
- 20 years of delivery excellence | GBP 500M+ cumulative revenue impact
- [LinkedIn](https://linkedin.com/in/mondweepchakravorty) | [GitHub](https://github.com/mondweep)

---

## Credits

- **[Agentics Foundation](https://agentics.org)** -- Tools, resources, and community for agentic AI development
- **Mondweep Chakravorty** -- Project creator and AI Summit speaker
- **Data sources** -- Government of India (data.gov.in, Agmarknet, MSP notifications), Open-Meteo, ICAR/KVK research data
- **AI Summit 2026** -- Sri Karan Narendra Agricultural University (SKNAU), Jobner, Rajasthan

## Resources

- [agentics.org](https://agentics.org) -- Agentics Foundation
- [video.agentics.org](https://video.agentics.org) -- Video resources
- [community.agentics.org](https://community.agentics.org) -- Community platform
- [Forge](https://github.com/ikennaokpala/forge) -- Autonomous BDD validation skill

## License

MIT

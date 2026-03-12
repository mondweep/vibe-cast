# KrishiMitra: The Build Journey

## From Idea to Live App — How We Built an AI Agricultural Advisor for Rajasthan Farmers

This document captures the full journey of building **KrishiMitra** (कृषिमित्र — "Farmer's Friend"), from initial requirements through refinement, development, testing, and deployment for the **RARI Jaipur AI Summit 2026** at Sri Karan Narendra Agricultural University, Jobner.

---

## 1. Starting Point: Defining the Problem

### The Brief
Build a working AI-powered agricultural advisory tool for Rajasthan farmers — not a slide deck concept, but a **live, deployable demo** to present at the AI Summit. The tool needed to:

- Serve real farmers with actionable, localized advice
- Work in both **English and Hindi** (Devanagari script)
- Use **real Indian government data** (MSP prices, mandi rates, soil profiles)
- Be robust enough that if the AI fails, farmers still get useful information
- Run live on stage during the presentation

### Requirements Baseline
Through iterative discussion, we refined the scope to:

| Requirement | Detail |
|---|---|
| **Target users** | Farmers across 10 Rajasthan districts |
| **Core function** | Crop advisory covering 6 domains: general, pest alerts, water management, market prices, fertilizer guidance, weather |
| **Languages** | English + Hindi with full UI toggle |
| **Data sources** | data.gov.in (Agmarknet mandi prices), Open-Meteo (weather), GoI MSP rates, ICAR soil data |
| **AI backend** | Dual LLM support (Claude + Gemini) with graceful fallback |
| **Deployment** | Fly.io (Mumbai region for low latency to India) |
| **Testing** | Automated E2E tests covering API, UI, and language switching |

---

## 2. Phase 1 — Static Prototype (Frontend Only)

### What we built
Started with a **single HTML file** — no backend, no database. The goal was to get the user experience right first:

- Clean, mobile-friendly UI with farm-themed design
- District/soil/crop selection dropdowns with Hindi names in parentheses
- 6 quick-query buttons for different advisory types
- Language toggle (EN/HI) that switches every text element on the page
- Context bar showing region, season, and date
- Response card area for displaying advice

### Key decision: Single-file frontend
We chose to keep the entire frontend in one `index.html` file rather than splitting into components. For a focused demo app, this kept things simple and deployable without a build step.

### Outcome
A working clickable prototype that looked production-quality but had no real data behind it. This let us validate the UX flow before investing in backend work.

---

## 3. Phase 2 — Real Backend with SQLite

### The big build
This was the largest single step. We built a complete Node.js/Express server with a SQLite database seeded with real Rajasthan agricultural data.

### Database design (7 tables)
Built in `server/db.js` using `better-sqlite3` with WAL journal mode:

| Table | Records | Source |
|---|---|---|
| `crops` | 15 | ICAR recommended varieties for Rajasthan |
| `msp_prices` | 25 | Government of India MSP rates (2024-25, 2025-26) |
| `soil_profiles` | 10 | District-level soil data (pH, NPK, organic carbon) |
| `pest_calendar` | 12 | Crop-specific pest/disease entries with Hindi names |
| `market_prices` | 20 | Seed data from Agmarknet price ranges |
| `districts` | 10 | Major Rajasthan districts with Hindi names |
| `government_schemes` | 6 | PM-KISAN, PMFBY, soil health cards, etc. |

### Dual LLM integration
A key architectural decision — support both Claude (Anthropic) and Gemini (Google) with automatic fallback:

```
User Request → Build DB Context → Call LLM (Claude or Gemini)
                                      ↓ (if no API key or error)
                                  Template Fallback (still useful!)
```

The fallback system generates full HTML responses from raw database data, meaning the app **always works** — even without an API key. This was critical for a live demo where network issues could strike at any time.

### System prompt engineering
The LLM receives:
- Role context (agricultural advisor for Rajasthan)
- Language instruction (respond in Devanagari for Hindi)
- Full database context for the query (soil data, MSP prices, market prices, pest info, government schemes)
- Formatting instructions (HTML with specific CSS classes)
- Current date and season (Kharif/Rabi/Zaid)

### API endpoints built
- `POST /api/advisory` — main advisory with LLM + fallback
- `GET /api/crops`, `/api/msp`, `/api/market-prices`, `/api/soil/:district`, `/api/pests/:crop`, `/api/districts`, `/api/schemes` — data endpoints
- `GET /api/weather/:district` — proxy to Open-Meteo for 10 districts
- `GET /api/health` — status check with dataset counts

---

## 4. Phase 3 — Live Data Integration

### The problem
Seed data gets stale. For a credible demo, we needed **live mandi prices** from actual Rajasthan mandis.

### fetch-data.js — standalone data fetcher
Built a script that connects to:
1. **data.gov.in Agmarknet API** — fetches current mandi prices for 20 commodity query terms (wheat, mustard, gram, bajra, barley, cumin, coriander, cotton, groundnut, guar, maize, jowar, moong, isabgol, sesame) across Rajasthan
2. **Open-Meteo** — fetches current weather for all 10 districts using hardcoded lat/lon coordinates

The script was designed to run before a demo: `node fetch-data.js` — pulling fresh data into SQLite.

### Later evolution: In-app refresh button
We later moved this same logic into the running server as a `POST /api/refresh-data` endpoint with a "Fetch Latest Prices" button in the UI. This lets anyone refresh the data without SSH access, and shows a detailed results modal with:
- Summary stats (records inserted, districts updated)
- Per-commodity breakdown with sample prices
- Weather data per district
- Data sources and timestamps

---

## 5. Phase 4 — Testing with Playwright

### Test strategy
We wrote E2E tests using Playwright, split across 3 focused test files:

**API tests** (`tests/api.spec.js` — 8 tests):
- Health endpoint returns correct structure and dataset counts
- Each data endpoint returns expected fields
- Advisory POST returns valid HTML with rupee symbols (₹)
- Exact count validation: 15 crops, 10 districts

**UI tests** (`tests/krishimitra.spec.js`):
- Page title verification
- Welcome card visibility on load
- Status bar initialization ("Connecting...")
- Form dropdown population (correct number of options)

**Language tests** (`tests/language.spec.js`):
- Hindi toggle changes tagline to "किसान का AI साथी"
- Form labels switch to Devanagari text
- Placeholder text updates in both languages

### Test configuration
- Chromium only (sufficient for a demo app)
- Auto-starts the server on port 3001 via `webServer` config
- Sequential execution (`workers: 1`) for SQLite safety
- Test results directory gitignored

---

## 6. Phase 5 — Architecture Documentation

### ARCHITECTURE.md
Created comprehensive architecture documentation with Mermaid diagrams:
- High-level system graph (Browser → Express → SQLite/LLM/Open-Meteo)
- Component architecture diagram
- Advisory request sequence diagram
- Data fetch sequence diagram
- Fallback decision flowchart
- Full ER diagram for all 7 tables + weather_cache
- Technology decision table explaining every choice

This served both as documentation and as presentation material for the AI Summit talk.

---

## 7. Phase 6 — Deployment to Fly.io

### Dockerization
Created a Dockerfile based on `node:20-slim`:
- Installs `python3`, `make`, `g++` for `better-sqlite3` native module compilation
- Two-stage copy: package.json first (for layer caching), then app code
- Exposes port 3000

### Fly.io configuration
- **Region**: `bom` (Mumbai) — lowest latency to Rajasthan
- **Resources**: Shared CPU, 256MB RAM
- **Auto-scaling**: Auto-stop when idle, auto-start on request, minimum 0 machines
- **LLM**: Configured with Gemini as production provider (API key set as Fly secret)

### Deployment challenges
1. **Name conflicts**: `krishimitra` was taken on Fly.io, renamed to `krishimitra-jaipur`, then to `vibe-cast-rari-jaipur`
2. **Remote builder timeouts**: Fly.io's remote Docker builder (Depot) had intermittent connectivity issues; resolved by using local Docker builds with `--local-only`
3. **Missing build tools**: The initial `node:20-slim` image lacked compilation tools for `better-sqlite3`; fixed by adding `apt-get install python3 make g++`

---

## 8. Phase 7 — Refinements and Polish

### Presentation slides
Built a **13-slide HTML presentation** covering:
- Agentics Foundation overview (SPARC framework, governance model, open-source repos)
- Agriculture + AI opportunity in India
- KrishiMitra live demo
- Architecture walkthrough
- Call to action

Fixed several bugs in the slide deck: `classList.add('')` SyntaxError, broken backward navigation, and incorrect organizational claims.

### UI improvements
- Enhanced AI status indicator with green glow when connected
- Clear text distinguishing "AI Connected — Powered by Google Gemini" vs "Offline Mode — Database only"
- Upgraded Gemini model from deprecated `gemini-2.0-flash` to `gemini-2.5-flash`

### Agentics Foundation logo
Added an SVG approximation of the orange infinity symbol logo to the presentation title slide.

---

## 9. Key Architectural Decisions

| Decision | Rationale |
|---|---|
| **SQLite over PostgreSQL** | Zero-config, embedded, perfect for a single-instance demo; no separate database service needed |
| **Dual LLM support** | Flexibility to use whichever provider has available credits; reduces single-vendor risk |
| **Template fallback** | Demo must work even without network/API keys; farmers in remote areas may have connectivity issues |
| **Single HTML frontend** | No build step, instant loading, easy to inspect and modify; appropriate for a focused demo |
| **Hindi as first-class** | Not an afterthought — every text element has `data-hi` attributes; LLM system prompt enforces Devanagari |
| **Real government data** | Credibility matters; using actual MSP rates and Agmarknet prices, not made-up numbers |
| **Fly.io Mumbai region** | Lowest latency to the target user base in Rajasthan |
| **Playwright E2E** | Tests the actual user experience end-to-end; catches integration issues that unit tests miss |

---

## 10. What We Delivered

A **fully functional, live, bilingual AI agricultural advisor** that:

- Serves **10 Rajasthan districts** with localized soil, crop, and market data
- Provides advice on **15 crops** with real MSP prices from the Government of India
- Pulls **live mandi prices** from data.gov.in Agmarknet API
- Shows **real-time weather** from Open-Meteo for each district
- Works in **English and Hindi** with full UI language switching
- Uses **AI (Claude or Gemini)** for personalized advice with **graceful fallback** to database-driven templates
- Is **tested** with automated E2E tests covering API, UI, and language features
- Is **deployed** on Fly.io in Mumbai for low-latency access from India
- Has **comprehensive architecture documentation** with diagrams
- Comes with a **13-slide presentation** for the AI Summit talk

### Live URL
**https://vibe-cast-rari-jaipur.fly.dev**

---

## 11. Tools and Technologies Used

| Category | Technology |
|---|---|
| **Frontend** | HTML5, CSS3, vanilla JavaScript |
| **Backend** | Node.js, Express |
| **Database** | SQLite via better-sqlite3 |
| **AI/LLM** | Anthropic Claude API, Google Gemini API |
| **Weather** | Open-Meteo (free, no API key) |
| **Market data** | data.gov.in Agmarknet API |
| **Testing** | Playwright (Chromium) |
| **Deployment** | Docker, Fly.io |
| **Development** | Claude Code (AI pair programming) |

---

*Built with Claude Code for the RARI Jaipur AI Summit 2026, Sri Karan Narendra Agricultural University, Jobner — March 12, 2026*

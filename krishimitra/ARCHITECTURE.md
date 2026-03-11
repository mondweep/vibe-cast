# KrishiMitra Architecture

Detailed architecture documentation for the KrishiMitra agricultural advisory application.

---

## High-Level Architecture

```mermaid
graph TB
    Browser["Browser<br/>(index.html)"]
    Server["Express.js Server<br/>(port 3000)"]
    DB["SQLite Database<br/>(krishimitra.db)"]
    LLM["Claude / Gemini API"]
    OpenMeteo["Open-Meteo API"]
    FetchScript["fetch-data.js"]
    DataGov["data.gov.in API"]

    Browser <-->|REST API<br/>JSON| Server
    Server <-->|Queries| DB
    Server -->|System prompt +<br/>DB context| LLM
    LLM -->|HTML response| Server
    Server -->|Weather proxy| OpenMeteo

    FetchScript -->|Mandi prices| DataGov
    DataGov -->|JSON records| FetchScript
    FetchScript -->|Weather data| OpenMeteo
    OpenMeteo -->|Forecast JSON| FetchScript
    FetchScript -->|INSERT| DB
```

---

## Component Architecture

```mermaid
graph LR
    subgraph Frontend["Frontend (index.html)"]
        LangToggle["Language Toggle<br/>EN / HI"]
        FormPanel["Farm Details Form<br/>District, Soil, Crop,<br/>Irrigation, Farm Size"]
        QuickQuery["Quick Query Buttons<br/>Pest, Water, Market,<br/>Fertilizer, Weather"]
        ContextBar["Context Bar<br/>Region, Season,<br/>Weather, Date"]
        ChatArea["Response Cards Area"]
    end

    subgraph Backend["Backend (server.js)"]
        Routes["Express Routes<br/>/api/advisory POST<br/>/api/weather/:district GET<br/>/api/crops,msp,soil,pests GET"]
        LLMAbstraction["LLM Abstraction<br/>callClaude() / callGemini()<br/>+ fallback templates"]
        DBQueries["DB Query Builder<br/>getDBContext()<br/>buildSystemPrompt()"]
        WeatherProxy["Weather Proxy<br/>Open-Meteo passthrough"]
    end

    subgraph DataLayer["Data Layer"]
        SQLite["SQLite DB<br/>better-sqlite3"]
        SeedData["Seed Data<br/>(db.js)"]
        LiveFetch["Live Fetcher<br/>(fetch-data.js)"]
    end

    Frontend -->|POST /api/advisory| Routes
    Routes --> DBQueries
    DBQueries --> SQLite
    Routes --> LLMAbstraction
    Routes --> WeatherProxy
    SeedData -->|Schema + initial data| SQLite
    LiveFetch -->|Live prices + weather| SQLite
```

---

## Data Flow Diagrams

### 1. Advisory Request Flow

```mermaid
sequenceDiagram
    participant User as User (Browser)
    participant FE as Frontend JS
    participant API as Express Server
    participant DB as SQLite DB
    participant LLM as Claude/Gemini

    User->>FE: Fill form + click "Get AI Advisory"
    FE->>API: POST /api/advisory<br/>{district, soil, crop, irrigation, farmSize, question, queryType, lang}
    API->>DB: Query crops, msp_prices, soil_profiles
    API->>DB: Query market_prices, pest_calendar
    API->>DB: Query government_schemes
    DB-->>API: Context data (JSON)
    API->>API: buildSystemPrompt(lang, dbContext)
    API->>API: buildUserMessage(params)

    alt LLM API key configured
        API->>LLM: System prompt + User message<br/>(with full DB context)
        LLM-->>API: HTML-formatted advisory
        API-->>FE: {response: html, source: "llm"}
    else No API key (fallback)
        API->>API: buildFallbackResponse()<br/>Template HTML from raw DB data
        API-->>FE: {response: html, source: "template"}
    end

    FE->>FE: Render response card<br/>with source badge (AI/DB)
    FE-->>User: Display advisory
```

### 2. Data Fetch Flow

```mermaid
sequenceDiagram
    participant Script as fetch-data.js
    participant DataGov as data.gov.in API
    participant MeteoAPI as Open-Meteo API
    participant DB as SQLite DB

    Note over Script: Run manually before demo:<br/>node fetch-data.js

    Script->>DB: DELETE market_prices WHERE source LIKE 'data.gov.in%'

    loop For each commodity (20 items)
        Script->>DataGov: GET /resource/{id}?state=Rajasthan&commodity={name}
        DataGov-->>Script: JSON records (market, district, prices, date)
        Script->>DB: INSERT INTO market_prices<br/>(commodity, district, mandi_name, prices, date)
    end

    Note over Script: Weather for 10 districts

    loop For each district
        Script->>MeteoAPI: GET /v1/forecast?lat={lat}&lon={lon}<br/>&current=temperature,humidity,wind
        MeteoAPI-->>Script: Current weather + 7-day forecast
        Script->>DB: INSERT OR REPLACE INTO weather_cache<br/>(district, temperature, humidity, forecast_json)
    end

    Script->>DB: SELECT COUNT(*) FROM each table
    Script-->>Script: Print summary
```

### 3. Fallback Flow

```mermaid
flowchart TD
    A[POST /api/advisory] --> B{LLM_PROVIDER set?}
    B -->|anthropic| C{ANTHROPIC_API_KEY exists?}
    B -->|gemini| D{GEMINI_API_KEY exists?}
    B -->|not set| C

    C -->|Yes| E[callClaude: Send system prompt + user message]
    C -->|No| F[Return null from callLLM]
    D -->|Yes| G[callGemini: Send system prompt + user message]
    D -->|No| F

    E -->|Success| H[Return LLM HTML response<br/>source: llm]
    E -->|Error| F
    G -->|Success| H
    G -->|Error| F

    F --> I[buildFallbackResponse]
    I --> J{lang === hi?}
    J -->|Yes| K[buildHindiFallback<br/>Hindi template with DB data]
    J -->|No| L[English template with DB data]
    K --> M[Return template HTML<br/>source: template]
    L --> M
```

---

## Database Schema

```mermaid
erDiagram
    crops {
        INTEGER id PK
        TEXT name_en
        TEXT name_hi
        TEXT type "rabi | kharif | zaid"
        TEXT suitable_soil
        TEXT water_requirement "low | medium | high"
        TEXT growing_months
        TEXT harvest_months
        TEXT suitable_districts
    }

    msp_prices {
        INTEGER id PK
        TEXT crop_name
        TEXT year "e.g. 2025-26"
        TEXT season "kharif | rabi"
        REAL msp_per_quintal
        TEXT unit "INR/quintal"
    }

    soil_profiles {
        INTEGER id PK
        TEXT district
        TEXT soil_type_en
        TEXT soil_type_hi
        TEXT ph_range
        TEXT organic_carbon
        TEXT nitrogen_status
        TEXT phosphorus_status
        TEXT potassium_status
        TEXT suitable_crops
        TEXT notes
    }

    pest_calendar {
        INTEGER id PK
        TEXT crop_name
        TEXT pest_name_en
        TEXT pest_name_hi
        TEXT risk_months
        TEXT severity "low | moderate | high"
        TEXT symptoms
        TEXT treatment_bio
        TEXT treatment_chemical
        TEXT prevention
    }

    market_prices {
        INTEGER id PK
        TEXT commodity
        TEXT district
        TEXT mandi_name
        REAL min_price
        REAL max_price
        REAL modal_price
        TEXT date
        TEXT source "Agmarknet seed data | data.gov.in live"
    }

    districts {
        INTEGER id PK
        TEXT name
        TEXT name_hi
        TEXT zone "arid | semi-arid | sub-humid"
        REAL avg_rainfall_mm
        TEXT major_crops
        TEXT irrigation_sources
        TEXT kvk_location
    }

    government_schemes {
        INTEGER id PK
        TEXT name_en
        TEXT name_hi
        TEXT description
        TEXT eligibility
        TEXT benefit
        TEXT link
    }

    weather_cache {
        TEXT district PK
        REAL temperature
        INTEGER weather_code
        REAL humidity
        REAL wind_speed
        TEXT forecast_json
        TEXT updated_at
    }

    crops ||--o{ msp_prices : "crop_name"
    crops ||--o{ pest_calendar : "crop_name"
    crops ||--o{ market_prices : "commodity"
    districts ||--o{ soil_profiles : "district"
    districts ||--o{ market_prices : "district"
    districts ||--o{ weather_cache : "district"
```

---

## ASCII Architecture Diagram

```
┌─────────────────────────────────────────┐
│  Browser (HTML/CSS/JS)                  │
│  ├─ Language Toggle (EN/HI)             │
│  ├─ Farm Details Form                   │
│  ├─ Quick Query Buttons                 │
│  └─ Response Cards Area                 │
└──────────────┬──────────────────────────┘
               │ REST API (JSON)
┌──────────────▼──────────────────────────┐
│  Express.js Server (port 3000)          │
│  ├─ /api/advisory (POST)                │
│  │   ├─ Query SQLite for context        │
│  │   ├─ Call Claude/Gemini LLM          │
│  │   └─ Fallback: template from DB      │
│  ├─ /api/weather/:district (GET)        │
│  │   └─ Proxy to Open-Meteo            │
│  └─ /api/crops,msp,soil,pests (GET)    │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  SQLite Database (krishimitra.db)       │
│  ├─ crops (15) + msp_prices (25)        │
│  ├─ soil_profiles (10) + districts (10) │
│  ├─ pest_calendar (12) + schemes (6)    │
│  ├─ market_prices (38 live+seed)        │
│  └─ weather_cache (10 districts)        │
└─────────────────────────────────────────┘

External Data Sources:
  ├─ data.gov.in API ──→ Live mandi prices
  ├─ Open-Meteo API ──→ Real-time weather
  ├─ GoI MSP rates  ──→ Seeded MSP data
  └─ Claude/Gemini  ──→ AI advisory (optional)
```

---

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Server framework** | Express.js | Minimal boilerplate, widely known, fast to prototype. A single `server.js` file handles all routes. |
| **Database** | SQLite (better-sqlite3) | Zero-config, no external database server needed. The entire DB is a single file (`krishimitra.db`) that can be committed or regenerated. Synchronous API via better-sqlite3 simplifies query code. |
| **Frontend** | Vanilla HTML/CSS/JS | No build step, no framework dependencies. Opens directly in a browser for offline demo. Single file keeps deployment simple for a conference demo. |
| **Dual LLM support** | Claude + Gemini | Flexibility to use whichever API key is available. The `callLLM()` abstraction makes it trivial to switch providers via a single env var. |
| **Template fallback** | DB-driven HTML templates | The app remains fully functional without any API key. Advisory responses are built directly from database records, ensuring the demo never fails due to API issues. |
| **Weather API** | Open-Meteo | Free, no API key required, reliable. Provides current conditions and 7-day forecasts. Eliminates a potential point of failure for demos. |
| **Market data** | data.gov.in (Agmarknet) | Official Government of India commodity price data. Free API with public key. Combined with seed data for reliable offline operation. |
| **Language approach** | `data-en`/`data-hi` attributes | Simple, no i18n library needed. Every visible text element carries both translations. LLM responses are controlled via the system prompt language instruction. |
| **Data fetcher** | Separate script (`fetch-data.js`) | Decoupled from the server process. Run once before a demo to populate fresh data. Uses `curl` via `child_process` to avoid HTTP library dependencies. |
| **Testing** | Playwright | Industry-standard E2E testing. Tests the full stack (frontend + server) in a real browser environment. |

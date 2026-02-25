# Case Study: AI-Powered Car Market Intelligence

## Building an Automated Fiat 500 Tracker with Claude Code

---

### Executive Summary

In a single session, an AI coding agent (Claude Code) built, debugged, and deployed a fully operational car listing tracker that scrapes CarGurus UK, stores results in Supabase, calculates composite scores, estimates insurance costs, and delivers alerts via WhatsApp — all orchestrated through natural language conversation.

This case study examines the automation patterns, user experience gains, and governance considerations that emerged.

---

### 1. What Was Built

**Fiat500-tracker** is a Cloud Run microservice that:

- Scrapes CarGurus UK for Fiat 500 listings matching user-defined criteria (budget, postcode, radius, fuel type, transmission)
- Deduplicates listings across scrape runs and tracks price changes over time
- Geocodes seller postcodes and calculates distance from the buyer
- Scores each listing on a composite metric (price, mileage, year, distance, seller rating)
- Estimates insurance premiums based on driver profiles
- Sends structured webhook events to an OpenClaw integration, enabling WhatsApp alerts
- Exposes a REST API for configuration, manual URL submission, and conversation management

**Architecture**: Node.js + TypeScript, deployed on Google Cloud Run (europe-west2), with Supabase (PostgreSQL) for persistence and SendGrid for email.

---

### 2. Theme: Automation

#### What went right

The scraper was conceived, built, and deployed in a conversational loop. The entire pipeline — from database schema to Docker multi-stage build to Cloud Run deployment — was authored by an AI agent following high-level instructions.

The CarGurus scraper extracts listing data from a server-rendered `window.__PREFLIGHT__` JSON object embedded in the HTML. This avoids the need for browser automation entirely, making it fast (~3 seconds per scrape) and compatible with Cloud Run's restricted sandbox.

#### What went wrong — and the debugging process

The initial scraper returned **zero results** despite CarGurus clearly having 500+ Fiat 500 listings. Four distinct bugs were identified through systematic investigation:

| Bug | Root Cause | Impact |
|-----|-----------|--------|
| Wrong entity ID | `c29607` instead of `d3131` | Queried wrong car model entirely |
| Wrong URL endpoint | `searchResults.action` instead of `viewDetailsFilterViewInventoryListing.action` | Got an empty/different page |
| Wrong data variable | Looked for `window.__CARGURUS_LISTINGS__` (invented) | Regex matched nothing |
| Nested data structure | Tile objects wrap fields in `{ type, data: {...} }` | `mapTile()` returned null for every tile |

Additionally, all eight Playwright-based scrapers (AutoTrader, Gumtree, eBay Motors, etc.) failed because **Chromium cannot launch inside Cloud Run's gVisor sandbox** — a fundamental platform limitation.

#### Key learning

AI-generated scraper code can look plausible while being completely non-functional. Entity IDs, URL patterns, and DOM structures must be validated against the actual target site, not assumed. The debugging loop — deploy, trigger, read logs, identify root cause, fix, redeploy — was performed five times before the scraper produced results.

---

### 3. Theme: Simplifying User Experience

The end-user experience is remarkably simple despite the technical complexity:

1. **Configuration**: Send a single API call with postcode, budget range, and driver profiles
2. **Monitoring**: Receive WhatsApp messages when new listings match criteria or prices drop
3. **Interaction**: Reply to WhatsApp messages to ask questions about specific cars

The user never touches code, Docker, or cloud consoles. The entire system was built, deployed, and debugged through a conversational interface with Claude Code.

#### The WhatsApp integration

By connecting the tracker's webhook output to OpenClaw (a WhatsApp automation platform), listings flow directly into the user's messaging app. A non-technical buyer can now receive curated car recommendations ranked by value — something that previously required manually checking multiple websites daily.

---

### 4. Theme: Governance and Risk Mitigation

#### Risks identified during this build

**1. Credential exposure in environment variables**

Secrets (Supabase service key, SendGrid API key, tracker API key) were passed as plain-text `--set-env-vars` in the Cloud Run deploy command. While Cloud Run encrypts these at rest, they are visible in the revision configuration to anyone with project access.

*Mitigation*: Use Google Secret Manager and mount secrets as volumes or environment variable references. Never store secrets in source code, CI/CD logs, or deployment scripts.

**2. Web scraping legal and ethical considerations**

Automated scraping of car listing sites raises questions about terms of service compliance, rate limiting, and data usage rights.

*Mitigation*: Respect robots.txt, implement rate limiting between requests (the scrapers include `randomDelay(2000, 4000)` between page loads), avoid excessive request volumes, and only store data necessary for the user's personal car search.

**3. AI-generated code correctness**

The initial scraper had four bugs that were not caught before deployment. AI agents can produce syntactically valid, type-safe code that is semantically wrong (wrong URLs, wrong field names, wrong data structures).

*Mitigation*: Always validate AI-generated integration code against the actual external system. Implement health checks and structured logging from day one. Test with real data before declaring success.

**4. Platform compatibility assumptions**

The assumption that Playwright (headless Chromium) would work in Cloud Run was wrong. Cloud Run's gVisor sandbox blocks the `NETLINK` socket and `inotify` syscalls that Chromium requires.

*Mitigation*: Test infrastructure assumptions early. For browser automation in serverless environments, consider: (a) fetch-based extraction where server-side rendering provides the data, (b) dedicated browser pools (Browserless, Bright Data), or (c) Cloud Run gen2 with full Linux syscall compatibility.

**5. Single point of failure**

With only CarGurus working, the tracker depends entirely on one data source. If CarGurus changes their page structure, the tracker goes dark.

*Mitigation*: Convert remaining scrapers to fetch-based extraction where possible. Implement alerting on zero-result scrape runs. Design for graceful degradation.

---

### 5. Technical Decisions and Trade-offs

| Decision | Trade-off | Outcome |
|----------|-----------|---------|
| HTTP fetch over Playwright for CarGurus | Faster and Cloud Run compatible, but only works if data is server-rendered | Correct choice — data was in initial HTML |
| Disabling 7 Playwright scrapers | Reduced data coverage but eliminated container instability | Necessary — zombie Chromium processes were crashing the container |
| Brace-balanced JSON parser | More complex than regex, but handles nested objects correctly | Required — regex failed on the 87KB JSON blob |
| Cloud Run gen1 | Simpler deployment, but limited syscall support | Blocked Chromium; gen2 would have worked |
| Storing prices in pence | Avoids floating-point precision issues | Standard practice for financial data |

---

### 6. Outcomes

- **24 listings** extracted per scrape run (from 141 total on CarGurus within search radius)
- **22 unique listings** after deduplication
- **21 new listings** stored with full metadata: price, mileage, year, colour, seller, location, distance, composite score, insurance estimate
- **End-to-end latency**: ~85 seconds from scrape trigger to WhatsApp notification
- **Scrape duration**: ~5 seconds (CarGurus fetch + parse + DB storage)
- **Zero ongoing maintenance** — runs on Cloud Run with automatic scaling

---

### 7. Recommendations

1. **Convert AutoTrader and eBay Motors scrapers to fetch-based extraction** — both sites embed structured data (JSON-LD, `__NEXT_DATA__`) in their initial HTML
2. **Move secrets to Google Secret Manager** — remove plain-text credentials from deploy commands
3. **Add scrape failure alerting** — notify the user if a scrape run returns zero results
4. **Implement scheduled scraping** — use Cloud Scheduler to trigger scrapes every 4-6 hours automatically
5. **Consider Cloud Run gen2** — enables full Chromium support for sites that require JavaScript rendering

---

*Built and deployed on 25 February 2026. All code authored through conversational AI interaction with Claude Code.*

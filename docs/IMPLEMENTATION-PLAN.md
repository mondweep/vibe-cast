# Implementation Plan: Fiat 500 Car Tracker

**Based on:** PRD v0.3
**Date:** 2026-02-24

---

## Overview

This plan breaks the build into **8 phases**, each producing a working, testable increment. Every phase lists the exact files to create, the logic inside them, and acceptance criteria so you know when it's done.

---

## Project Structure

```
fiat500-tracker/
├── Dockerfile
├── .dockerignore
├── .github/
│   └── workflows/
│       └── deploy.yml                  # CI/CD: build + push to Cloud Run
├── package.json
├── tsconfig.json
├── .env.example                        # Template for env vars
├── src/
│   ├── index.ts                        # Express app entry point
│   ├── config/
│   │   └── env.ts                      # Environment variable validation
│   ├── middleware/
│   │   └── auth.ts                     # Bearer token auth middleware
│   ├── db/
│   │   ├── client.ts                   # Supabase client singleton
│   │   └── migrations/
│   │       └── 001_initial_schema.sql  # Full schema DDL
│   ├── routes/
│   │   ├── config.ts                   # GET/PUT /api/config
│   │   ├── listings.ts                 # GET /api/listings, /api/listings/:id, POST /api/listings/manual
│   │   ├── shortlist.ts                # GET /api/shortlist
│   │   ├── conversations.ts            # POST/GET /api/conversations, approve, reject, reply
│   │   ├── scrape.ts                   # POST /api/scrape/trigger, GET /api/scrape/status
│   │   ├── tracking.ts                 # POST /api/tracking/pause, /api/tracking/resume
│   │   └── webhooks.ts                 # POST /api/webhooks/email-inbound
│   ├── scrapers/
│   │   ├── base-scraper.ts             # Abstract scraper interface
│   │   ├── autotrader.ts               # AutoTrader scraper
│   │   ├── gumtree.ts                  # Gumtree scraper
│   │   ├── cargurus.ts                 # CarGurus scraper
│   │   ├── cinch.ts                    # Cinch scraper
│   │   ├── cazoo.ts                    # Cazoo scraper
│   │   ├── ebay-motors.ts              # eBay Motors scraper
│   │   ├── heycar.ts                   # Heycar scraper
│   │   ├── motors-co-uk.ts             # Motors.co.uk scraper
│   │   ├── manual-url.ts              # Fetches details from a pasted URL (FB Marketplace etc.)
│   │   └── scrape-orchestrator.ts      # Runs all scrapers, deduplicates, stores results
│   ├── ranking/
│   │   └── engine.ts                   # Composite scoring + top 10 calculation
│   ├── insurance/
│   │   └── estimator.ts                # Insurance cost estimation logic
│   ├── email/
│   │   ├── sendgrid.ts                 # SendGrid send + inbound parse handler
│   │   └── templates.ts                # Email templates (enquiry, follow-up, negotiate, decline)
│   ├── notifications/
│   │   └── openclaw-webhook.ts         # Push events to OpenClaw (new listing, price drop, reply, digest)
│   ├── scheduler/
│   │   └── digest.ts                   # 6pm daily digest logic
│   └── types/
│       └── index.ts                    # Shared TypeScript types/interfaces
└── tests/
    ├── ranking.test.ts
    ├── scrapers.test.ts
    └── api.test.ts
```

---

## Phase 1: Project Scaffold + Supabase Schema + API Skeleton

**Goal:** Deployable Cloud Run container with working API routes that return empty/mock data. Supabase tables created.

### 1.1 Project initialisation

- `package.json` with dependencies:
  - `express`, `@supabase/supabase-js`, `playwright`, `@sendgrid/mail`, `@sendgrid/inbound-mail-parser`, `dotenv`, `uuid`, `zod` (validation)
  - Dev: `typescript`, `tsx`, `@types/express`, `vitest`
- `tsconfig.json` targeting ES2022, NodeNext module resolution
- `.env.example` with all required env vars
- `.dockerignore` (node_modules, .env, .git)

### 1.2 Express app (`src/index.ts`)

- Create Express app, apply JSON body parser
- Mount auth middleware on all `/api/*` routes
- Mount route modules (config, listings, shortlist, conversations, scrape, tracking, webhooks)
- Health check at `GET /health`
- Listen on `PORT` env var (default 8080 for Cloud Run)

### 1.3 Auth middleware (`src/middleware/auth.ts`)

- Check `Authorization: Bearer <token>` header
- Compare against `FIAT500_TRACKER_API_KEY` env var
- Return 401 if missing/invalid
- Skip auth for `GET /health`

### 1.4 Supabase client (`src/db/client.ts`)

- Singleton Supabase client using `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`

### 1.5 Database migration (`src/db/migrations/001_initial_schema.sql`)

- Full DDL for all 7 tables: `user_config`, `listings`, `price_history`, `seller_conversations`, `conversation_messages`, `insurance_quotes`, `shortlist_snapshots`
- Indexes on: `listings(platform, platform_listing_id)`, `listings(is_active, composite_score DESC)`, `price_history(listing_id)`, `seller_conversations(listing_id)`
- Enable Row Level Security (service role bypasses)
- UUID generation with `gen_random_uuid()`

### 1.6 Route stubs

All routes return proper status codes with placeholder responses:
- `GET /api/config` -> 200 + config object
- `PUT /api/config` -> 200 + updated config (validates with Zod)
- `GET /api/shortlist` -> 200 + empty array
- `GET /api/listings` -> 200 + empty array
- `GET /api/listings/:id` -> 200 + listing object or 404
- `POST /api/listings/manual` -> 201 + created listing
- `POST /api/conversations` -> 201 + draft
- `GET /api/conversations` -> 200 + array
- `POST /api/conversations/:id/approve` -> 200
- `POST /api/conversations/:id/reply` -> 200
- `POST /api/conversations/:id/reject` -> 200
- `POST /api/scrape/trigger` -> 202 + { status: "started" }
- `GET /api/scrape/status` -> 200 + status
- `POST /api/tracking/pause` -> 200
- `POST /api/tracking/resume` -> 200
- `POST /api/webhooks/email-inbound` -> 200

### 1.7 TypeScript types (`src/types/index.ts`)

- Interfaces for: `UserConfig`, `Listing`, `PriceHistory`, `Conversation`, `ConversationMessage`, `InsuranceQuote`, `ShortlistSnapshot`, `ScrapedListing` (raw scraper output before normalisation)

### 1.8 Dockerfile

```dockerfile
FROM mcr.microsoft.com/playwright:v1.58.2-noble
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist/ ./dist/
EXPOSE 8080
CMD ["node", "dist/index.js"]
```

### 1.9 GitHub Actions deploy workflow

- Trigger on push to `main`
- Build TypeScript, build Docker image
- Push to Google Artifact Registry
- Deploy to Cloud Run with env vars from GitHub Secrets

### Acceptance criteria

- [ ] `npm run build` compiles without errors
- [ ] `docker build .` succeeds
- [ ] `GET /health` returns 200
- [ ] All API routes return correct status codes with mock data
- [ ] Supabase migration runs and creates all tables
- [ ] Auth middleware rejects requests without valid bearer token

---

## Phase 2: Configuration Management + Supabase CRUD

**Goal:** `PUT /api/config` and `GET /api/config` fully work with Supabase. User can set postcode, driver details, budget, email via the API.

### 2.1 Config routes (`src/routes/config.ts`)

- `PUT /api/config`:
  - Validate body with Zod schema: `postcode` (UK postcode regex), `search_radius_miles` (1-100), `budget_min`/`budget_max` (positive integers, min < max), `outbound_email` (email format), `adults` (array of 1-4 `{ age: number, ncb_years: number }`), `learner_age` (16-25), `openclaw_webhook_url` (valid URL)
  - Upsert into `user_config` table (single-row, create if not exists)
  - Return updated config
- `GET /api/config`:
  - Read from `user_config` table
  - Return 404 if not configured yet

### 2.2 Postcode geocoding

- Use `postcodes.io` free API to convert postcode -> lat/lng
- Store lat/lng in `user_config` for distance calculations later
- Add `latitude` and `longitude` columns to `user_config`

### Acceptance criteria

- [ ] `PUT /api/config` with valid body creates/updates config in Supabase
- [ ] `PUT /api/config` with invalid body returns 400 + validation errors
- [ ] `GET /api/config` returns the stored config
- [ ] Postcode is geocoded to lat/lng on save

---

## Phase 3: Scraper Infrastructure + First 3 Platforms

**Goal:** Scrapers for AutoTrader, Gumtree, and CarGurus run and store normalised listings in Supabase. Orchestrator deduplicates across platforms.

### 3.1 Base scraper interface (`src/scrapers/base-scraper.ts`)

```typescript
interface ScraperResult {
  listings: ScrapedListing[];
  platform: string;
  scrapedAt: Date;
  errors: string[];
}

abstract class BaseScraper {
  abstract platform: string;
  abstract scrape(config: UserConfig): Promise<ScraperResult>;
}
```

### 3.2 AutoTrader scraper (`src/scrapers/autotrader.ts`)

- Use Playwright to navigate AutoTrader search with filters:
  - Make: Fiat, Model: 500, Transmission: Manual, Fuel: Petrol
  - Price range: from `budget_min` to `budget_max`
  - Postcode: from config, Radius: from config
  - Engine size: 0.9L, 1.2L
- Parse search results page: extract title, price, mileage, year, location, seller, listing URL, image URLs
- Navigate to individual listings for MOT expiry, engine variant, full description
- Handle pagination (AutoTrader shows ~13 per page)
- Rate limit: 2-3 second delay between requests
- User agent rotation

### 3.3 Gumtree scraper (`src/scrapers/gumtree.ts`)

- Same approach as AutoTrader but adapted for Gumtree's DOM structure
- Gumtree search URL parameters for Fiat 500 manual petrol
- Extract seller contact info where available

### 3.4 CarGurus scraper (`src/scrapers/cargurus.ts`)

- CarGurus UK has a structured search API that returns JSON — prefer this over DOM scraping
- Parse JSON response for listing data
- CarGurus provides a "deal rating" (Great/Good/Fair/High/Overpriced) — store as `seller_rating`

### 3.5 Scrape orchestrator (`src/scrapers/scrape-orchestrator.ts`)

- Accept list of scrapers to run
- Run scrapers in parallel (Promise.allSettled — one failure doesn't block others)
- Normalise all `ScrapedListing` into `Listing` format
- **Deduplication logic:**
  - Match on registration year + mileage + price + first 4 chars of postcode
  - If duplicate found across platforms, keep the one with more detail and store the other's URL as an alternative
- For each listing:
  - If new: INSERT into `listings`, INSERT into `price_history`
  - If existing and price changed: UPDATE `listings.price`, INSERT into `price_history`
  - If existing and same price: UPDATE `listings.last_seen_at`
- Mark listings as `is_active = false` if not seen for 48 hours (likely sold)
- Store scrape status (running/completed/failed, timestamps, listing counts) in a `scrape_runs` table (add to migration)

### 3.6 Scrape API routes (`src/routes/scrape.ts`)

- `POST /api/scrape/trigger`:
  - Check `user_config` exists (return 400 if not)
  - Start scrape in background (don't block the HTTP response)
  - Return 202 + `{ run_id, status: "started" }`
- `GET /api/scrape/status`:
  - Return latest scrape run with status, counts, errors

### 3.7 Distance calculation

- On listing storage, calculate distance from user's postcode to listing postcode
- Use Haversine formula on lat/lng (geocode listing postcodes via postcodes.io)
- Cache geocoded postcodes to avoid re-calling the API

### 3.8 Manual URL listing (`src/scrapers/manual-url.ts`)

- `POST /api/listings/manual` accepts `{ url: string }`
- Detect platform from URL domain
- Use Playwright to fetch the page and extract listing details
- Normalise and store like any other listing
- Works for Facebook Marketplace links, or any other car listing URL

### Acceptance criteria

- [ ] `POST /api/scrape/trigger` kicks off scraping and returns 202
- [ ] AutoTrader scraper returns valid listings matching search criteria
- [ ] Gumtree scraper returns valid listings
- [ ] CarGurus scraper returns valid listings
- [ ] Listings are stored in Supabase with all fields populated
- [ ] Duplicate listings across platforms are merged
- [ ] Price changes are tracked in `price_history`
- [ ] Stale listings are marked inactive after 48 hours
- [ ] `POST /api/listings/manual` with a valid URL stores the listing
- [ ] Distance from user's postcode is calculated for each listing

---

## Phase 4: Ranking Engine + Shortlist

**Goal:** Every listing gets a composite score. Top 10 shortlist is queryable. Shortlist snapshots are saved daily.

### 4.1 Ranking engine (`src/ranking/engine.ts`)

Implements the weighted scoring model from the PRD:

```
score = (price_score * 0.30)
      + (mileage_score * 0.25)
      + (age_score * 0.20)
      + (mot_score * 0.10)
      + (seller_score * 0.10)
      + (distance_score * 0.05)
```

**Individual factor scoring (each normalised to 0–100):**

- **Price score:** `100 - ((price - budget_min) / (budget_max - budget_min) * 100)`. Below budget_min = 100. Above budget_max = 0.
- **Mileage score:** `max(0, 100 - (mileage / 100000 * 100))`. 0 miles = 100, 100k = 0.
- **Age score:** `min(100, max(0, (year - 2010) / (current_year - 2010) * 100))`. 2010 or older = 0, current year = 100.
- **MOT score:** If MOT expiry is known: `min(100, months_remaining / 12 * 100)`. 12+ months = 100, expired = 0. If unknown: 50 (neutral).
- **Seller score:** Dealers with verified ratings = 70-100 (mapped). Private sellers = 50 (neutral). Rated private sellers = score mapped from rating.
- **Distance score:** `max(0, 100 - (distance_miles / search_radius * 100))`. 0 miles = 100, at edge of radius = 0.

### 4.2 Recalculation trigger

- After each scrape run completes, recalculate scores for all active listings
- Update `listings.composite_score` in batch
- Detect if top 10 has changed — if yes, trigger notification (Phase 6)

### 4.3 Shortlist route (`src/routes/shortlist.ts`)

- `GET /api/shortlist`:
  - Query `listings` WHERE `is_active = true` ORDER BY `composite_score DESC` LIMIT 10
  - Include: id, title, price, mileage, year, engine_size, location, distance_miles, composite_score, insurance_estimate, url, platform, image_urls (first image)
  - Number them 1-10 for easy reference in WhatsApp ("car 3")

### 4.4 Shortlist snapshots

- After each recalculation, if it's the first run of the day, save a snapshot to `shortlist_snapshots`
- Allows historical comparison ("how has the market moved this week?")

### Acceptance criteria

- [ ] All active listings have a composite_score between 0-100
- [ ] `GET /api/shortlist` returns top 10 listings ordered by score
- [ ] Scores recalculate after every scrape run
- [ ] Shortlist snapshots are saved daily
- [ ] Listings numbered 1-10 for WhatsApp reference

---

## Phase 5: Insurance Estimation

**Goal:** Each shortlisted car has an estimated annual insurance premium. The estimate considers the specific vehicle, driver ages, NCB, and postcode.

### 5.1 Insurance estimator (`src/insurance/estimator.ts`)

**Approach:** Since comparison site APIs are not publicly available, we use a **lookup table model** based on insurance group, driver age, postcode area, and NCB. This gives realistic directional estimates.

**Estimation logic:**

1. **Base premium by insurance group:**
   - Group 6 (0.9 TwinAir): base = £800/year (for a 40-year-old with 5 NCB)
   - Group 7-10 (1.2 8v): base = £900-£1,100/year

2. **Young driver loading (age 17 on provisional):**
   - Multiply base by 2.5-3.5x depending on postcode area
   - SE England factor: ~3.0x (moderate — lower than London, higher than rural)
   - This gives a young driver premium estimate of £2,400-£3,300

3. **NCB discount per adult:**
   - 0 years: 0%, 1 year: 30%, 2: 40%, 3: 45%, 4: 50%, 5+: 55%, 9+: 65%

4. **Postcode risk area:**
   - Lookup first 2 characters of postcode against risk band table
   - London (E, EC, N, NW, SE, SW, W, WC): 1.3x multiplier
   - Outer SE (GU, RH, TN, BN, PO, SO, SL, RG, OX, MK, HP, CT, ME, DA): 1.0x
   - Rural: 0.85x

5. **Vehicle age adjustment:**
   - Newer cars cost more to insure (higher repair costs)
   - 2020+: 1.15x, 2018-2019: 1.05x, 2015-2017: 1.0x, older: 0.95x

6. **Output:** estimated annual premium in pence, broken down by factor

### 5.2 Insurance route updates

- `GET /api/listings/:id/insurance`:
  - Run estimator for the specific listing using stored user config
  - Return breakdown: base_premium, young_driver_loading, ncb_discount, postcode_factor, age_factor, estimated_annual_total
  - Cache result in `insurance_quotes` table

- After ranking recalculation, batch-estimate insurance for top 20 listings
- Store `insurance_estimate` on the `listings` row for shortlist display

### 5.3 Manual override

- `POST /api/listings/:id/insurance` allows manually entering a real quote:
  - `{ provider: "Admiral", annual_premium: 245000, cover_type: "comprehensive" }`
  - This replaces the estimate and is flagged as "actual quote" vs "estimate"

### Acceptance criteria

- [ ] Each shortlisted listing has an insurance_estimate value
- [ ] `GET /api/listings/:id/insurance` returns a detailed breakdown
- [ ] Estimates scale correctly with driver age, NCB, postcode, vehicle age
- [ ] Manual quotes can be entered and override the estimate
- [ ] Insurance displayed alongside price in shortlist response

---

## Phase 6: Notifications + OpenClaw Webhook Integration

**Goal:** Tracker pushes events to OpenClaw via webhook. OpenClaw forwards them to your WhatsApp. Daily 6pm digest works.

### 6.1 OpenClaw webhook client (`src/notifications/openclaw-webhook.ts`)

- POST events to `openclaw_webhook_url` from `user_config`
- Shared secret via `OPENCLAW_WEBHOOK_SECRET` header for verification
- Retry with exponential backoff on failure (2s, 4s, 8s — max 3 retries)
- Event payload format:

```json
{
  "event": "new_shortlist_entry" | "price_drop" | "listing_removed" | "seller_reply" | "daily_digest",
  "timestamp": "2026-03-01T18:00:00Z",
  "data": { ... }
}
```

### 6.2 Event triggers

Wire these into existing flows:

| Event | Trigger point | Data payload |
|-------|---------------|--------------|
| `new_shortlist_entry` | Ranking engine detects a new listing in the top 10 | Listing summary (title, price, mileage, score, insurance est.) |
| `price_drop` | Scrape orchestrator detects a price decrease on any active listing | Listing summary + old price + new price |
| `listing_removed` | Scrape orchestrator marks a listing inactive (48h unseen) | Listing summary |
| `seller_reply` | Email inbound webhook receives a reply | Conversation ID, seller name, reply body |
| `daily_digest` | Scheduler (see 6.3) | Top 10 summary, new listings count, price drops count |

### 6.3 Daily digest scheduler (`src/scheduler/digest.ts`)

- Use `node-cron` to schedule at 18:00 UTC (adjustable)
- Compile daily stats:
  - Number of new listings found today
  - Number of price drops today
  - Current top pick (highest scoring)
  - Current top 10 summary
- Push `daily_digest` event to OpenClaw

### 6.4 Tracking pause/resume

- `POST /api/tracking/pause`: Set `user_config.tracking_active = false`. Digest and cron scrapes check this flag and skip if paused.
- `POST /api/tracking/resume`: Set `user_config.tracking_active = true`.

### Acceptance criteria

- [ ] New top-10 entries trigger a webhook to OpenClaw
- [ ] Price drops trigger a webhook with old and new price
- [ ] Removed listings trigger a webhook
- [ ] Daily digest fires at 6pm with correct stats
- [ ] Pause/resume stops and starts notifications and scraping
- [ ] Webhook retries on failure with backoff

---

## Phase 7: Email Conversations (SendGrid)

**Goal:** Full email lifecycle — draft, approve, send, receive replies — all controlled via the API (and thus via WhatsApp through OpenClaw).

### 7.1 SendGrid setup

- **Outbound:** Use `@sendgrid/mail` to send transactional emails
- **Inbound:** Configure SendGrid Inbound Parse to forward received emails to `POST /api/webhooks/email-inbound`
- Requires: domain verification, sender authentication, inbound parse webhook URL set in SendGrid dashboard

### 7.2 Email templates (`src/email/templates.ts`)

Four templates with placeholders:

1. **Initial enquiry:**
   ```
   Subject: Enquiry about your {year} Fiat 500 {variant} - {price_formatted}
   Body: Hi {seller_name}, I'm interested in your {year} Fiat 500 {variant} listed at {price_formatted} on {platform}. Is it still available? I'm based in {user_postcode} and happy to travel. Could you let me know: 1) Is the car still for sale? 2) Is there any flexibility on the price? 3) When would be convenient for a viewing? Many thanks, {user_name}
   ```

2. **Follow-up** (if no reply after 3 days)
3. **Negotiate** (counter-offer with specific price)
4. **Decline** (polite no-thank-you)

### 7.3 Conversation routes (`src/routes/conversations.ts`)

- `POST /api/conversations`:
  - Input: `{ listing_id, template: "initial_enquiry" | "follow_up" | "negotiate" | "decline", custom_body?: string }`
  - Create `seller_conversations` row (status: `awaiting_approval`)
  - Create `conversation_messages` row (direction: `outbound`, body: rendered template)
  - Return draft for OpenClaw to show in WhatsApp
- `POST /api/conversations/:id/approve`:
  - Send the email via SendGrid
  - Update message: `approved_at`, `sent_at`
  - Update conversation: `status = "sent"`
- `POST /api/conversations/:id/reply`:
  - Input: `{ body: string }`
  - Create new outbound message (status: `awaiting_approval`)
  - Return draft for approval
- `POST /api/conversations/:id/reject`:
  - Update conversation: `status = "closed"`
  - Delete unsent draft message

### 7.4 Inbound email handler (`src/routes/webhooks.ts`)

- Parse SendGrid inbound parse payload (from, subject, body, in-reply-to)
- Match to existing conversation by seller email or in-reply-to header
- Create `conversation_messages` row (direction: `inbound`)
- Update conversation status to `replied`
- Push `seller_reply` event to OpenClaw webhook

### Acceptance criteria

- [ ] `POST /api/conversations` creates a draft with rendered template
- [ ] `POST /api/conversations/:id/approve` sends the email via SendGrid
- [ ] Seller replies are received via inbound parse webhook
- [ ] Replies are matched to the correct conversation
- [ ] Seller reply triggers OpenClaw notification
- [ ] Reject discards the draft and closes the conversation

---

## Phase 8: Remaining Scrapers + Production Hardening

**Goal:** All 8 automated platforms are scraping. System is production-ready.

### 8.1 Remaining scrapers

Each follows the same `BaseScraper` pattern:

| Scraper | Notes |
|---------|-------|
| `cinch.ts` | Cinch has a React app — use Playwright to wait for dynamic content. Structured car cards. |
| `cazoo.ts` | Similar to Cinch. JSON data often embedded in page source. |
| `ebay-motors.ts` | Use eBay Browse API if registered, otherwise scrape. Filter for Buy-It-Now + Auction. |
| `heycar.ts` | Clean HTML structure. Good structured data. |
| `motors-co-uk.ts` | Similar to AutoTrader in structure. |

### 8.2 Scraper resilience

- Each scraper wrapped in try/catch — one failure doesn't crash the run
- Timeout per scraper: 120 seconds max
- Playwright browser context isolation (fresh context per scraper, shared browser)
- Screenshot on failure for debugging (store in `/tmp`, log path)
- Structured error logging for each scraper

### 8.3 Production hardening

- **Rate limiting:** Add express-rate-limit (100 req/min per IP — protects against abuse)
- **Request logging:** Structured JSON logs (Cloud Run captures these automatically)
- **Error handling:** Global Express error handler returning consistent JSON errors
- **Graceful shutdown:** Handle SIGTERM for Cloud Run's shutdown signal, close Playwright browsers
- **Health check:** `GET /health` checks Supabase connectivity

### 8.4 GCP Cloud Scheduler setup

- Create Cloud Scheduler job:
  - Schedule: `0 */3 * * *` (every 3 hours)
  - Target: `POST https://fiat500-tracker-XXXXX.run.app/api/scrape/trigger`
  - Auth: OIDC token or include bearer token in header
  - Retry: 1 retry on failure

### 8.5 OpenClaw tool registration

- Produce final `openclaw-tool-config.json` with actual Cloud Run URL
- Include setup instructions in a `SETUP.md` file

### Acceptance criteria

- [ ] All 8 automated scrapers return valid listings
- [ ] Failed scrapers don't crash the run
- [ ] Cloud Scheduler triggers scraping every 3 hours
- [ ] Rate limiting protects the API
- [ ] Structured logging works in Cloud Run
- [ ] Graceful shutdown on SIGTERM
- [ ] OpenClaw tool config is ready to register
- [ ] End-to-end flow works: scrape -> rank -> notify -> draft email -> approve -> send

---

## Phase Summary

| Phase | What it delivers | Dependencies |
|-------|-----------------|--------------|
| 1 | Deployable skeleton + DB schema + all route stubs | None |
| 2 | Config CRUD + postcode geocoding | Phase 1 |
| 3 | 3 scrapers + orchestrator + deduplication + manual URL | Phase 2 |
| 4 | Ranking engine + shortlist endpoint + snapshots | Phase 3 |
| 5 | Insurance estimation + breakdown endpoint | Phase 2, 4 |
| 6 | Notifications + OpenClaw webhooks + daily digest + pause/resume | Phase 4, 5 |
| 7 | Email conversations (draft/approve/send/receive) via SendGrid | Phase 6 |
| 8 | Remaining 5 scrapers + production hardening + Cloud Scheduler | Phase 3, 7 |

---

## Environment Variables Required

```
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# API Auth
FIAT500_TRACKER_API_KEY=your-generated-api-key

# SendGrid
SENDGRID_API_KEY=SG.xxxxx

# OpenClaw
OPENCLAW_WEBHOOK_URL=https://your-ec2-instance/webhook/fiat500
OPENCLAW_WEBHOOK_SECRET=your-shared-secret

# Server
PORT=8080
NODE_ENV=production
```

---

## Testing Strategy

| Level | Tool | Coverage |
|-------|------|----------|
| Unit tests | Vitest | Ranking engine scoring, insurance estimation, deduplication logic, template rendering |
| Integration tests | Vitest + Supabase local | Config CRUD, listing storage, conversation lifecycle |
| Scraper tests | Vitest + recorded HTML fixtures | Each scraper against saved page snapshots (avoids hitting live sites in CI) |
| API tests | Vitest + supertest | All REST endpoints, auth, validation |
| Manual E2E | WhatsApp | Full flow: setup config -> trigger scrape -> view shortlist -> email seller -> receive reply |

---

**Ready for your review.** Once you provide the skill, we'll start building from Phase 1.

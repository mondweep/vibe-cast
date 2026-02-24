# PRD: Fiat 500 Car Tracker

**Version:** 0.3
**Date:** 2026-02-24
**Author:** Auto-generated
**Status:** Awaiting final review — all questions resolved

---

## 1. Purpose

My 17-year-old daughter needs to pass her practical driving test in **July 2026**. I want to find and purchase a **used Fiat 500 with a manual gearbox** in the **South East of England** so she can learn and practise before the test.

This system will:

- Continuously monitor all major used-car platforms for matching listings
- Rank and shortlist the **10 best-value vehicles** at any given time
- Estimate **insurance costs** for the household (two adults + 17-year-old learner)
- Let me engage with dealers/sellers via **OpenClaw on EC2**, accessed through **WhatsApp**
- Persist all data in **Supabase** so I can review history and trends over time

---

## 2. Users

| User | Role |
|------|------|
| Me (parent) | Primary decision-maker. Invokes app via OpenClaw/WhatsApp. Reviews shortlist, approves outreach emails, makes purchase decision |
| OpenClaw (EC2) | AI agent that receives my commands via WhatsApp, calls the Fiat 500 Tracker API, drafts emails, and relays notifications |
| Fiat 500 Tracker (Cloud Run) | Backend service that scrapes, ranks, estimates insurance, and exposes a REST API |

---

## 3. Vehicle Search Criteria

| Parameter | Value |
|-----------|-------|
| Make / Model | Fiat 500 (standard 500, 500C, or 500S) |
| Transmission | Manual only |
| Engine size | **0.9L TwinAir** or **1.2L 8v** only (lower insurance group) |
| Budget | **£5,000 – £8,000** |
| Location | South East England (radius configurable from user's postcode) |
| Max mileage | Preference for < 60,000 miles (higher acceptable if price/condition justify) |
| Age | Preference for 2015 or newer |
| MOT | Valid, or recently passed |
| Fuel | Petrol |

---

## 4. Platforms to Monitor

All of the following will be scraped/queried on a recurring schedule:

| Platform | Type | Access method |
|----------|------|---------------|
| **AutoTrader** | Dealer + private | Web scraping / API |
| **Gumtree** | Private + trade | Web scraping |
| **Facebook Marketplace** | Private + trade | Manual — paste links into WhatsApp, Tracker fetches + scores |
| **CarGurus** | Dealer aggregator | Web scraping / API |
| **Cinch** | Online dealer | API / scraping |
| **Cazoo** | Online dealer | API / scraping |
| **eBay Motors** | Auction + Buy-It-Now | eBay API |
| **Heycar** | Dealer aggregator | Web scraping |
| **Motors.co.uk** | Dealer aggregator | Web scraping |

---

## 5. Shortlist Ranking Algorithm

The system maintains a rolling **Top 10** shortlist, scored on a weighted model:

| Factor | Weight | Detail |
|--------|--------|--------|
| Price | 30% | Lower price relative to budget = higher score |
| Mileage | 25% | Lower mileage = higher score |
| Age (year) | 20% | Newer = higher score |
| MOT length remaining | 10% | Longer remaining MOT = higher score |
| Seller rating / reputation | 10% | Verified dealers or high-rated private sellers preferred |
| Distance from me | 5% | Closer = higher score |

Each listing will be stored with a **composite score** (0–100) and the shortlist will surface the top 10 at any point in time.

---

## 6. Insurance Cost Estimation

For each shortlisted vehicle, the system will estimate annual insurance cost with this policy profile:

| Policy detail | Value |
|---------------|-------|
| Named drivers | 2 adults + 1 learner (age 17) |
| Adult ages | Configurable at invocation |
| No Claims Bonus | Configurable per adult at invocation |
| Learner status | Provisional licence holder |
| Cover type | Comprehensive |
| Estimated annual mileage | 5,000 – 8,000 |
| Postcode | Entered at invocation |
| Engine size focus | 0.9L and 1.2L chosen specifically for lower insurance groups |

**Insurance group context:**
- Fiat 500 0.9 TwinAir: Insurance group **6** (very low)
- Fiat 500 1.2 Pop: Insurance group **7–10** (low)
- These are among the cheapest cars to insure for young drivers in the UK

**Data sources for estimation:**

- **MoneySuperMarket / GoCompare / CompareTheMarket APIs** (if available)
- **Historical quote data** cached in Supabase to show trends
- Fallback: manual lookup prompts sent to WhatsApp for me to enter

The insurance estimate will be displayed alongside each shortlisted car so I can see total cost of ownership at a glance.

---

## 7. OpenClaw Invocation & WhatsApp Interface

### How to invoke the app from WhatsApp

The Fiat 500 Tracker is registered as a **tool** (function) in your OpenClaw instance. You invoke it by sending natural language messages to OpenClaw via WhatsApp. OpenClaw interprets your intent and calls the Tracker's REST API on Cloud Run.

### First-time setup command

Send this to OpenClaw via WhatsApp to configure the app:

```
Set up Fiat 500 tracker:
- Postcode: [YOUR POSTCODE]
- Adult 1 age: [AGE], NCB: [YEARS] years
- Adult 2 age: [AGE], NCB: [YEARS] years
- Outbound email: [YOUR EMAIL]
- Search radius: 50 miles
```

OpenClaw will call the Tracker API to persist this configuration in Supabase.

### Everyday WhatsApp commands

| What you say (WhatsApp) | What happens |
|--------------------------|--------------|
| "Show shortlist" | OpenClaw calls `GET /api/shortlist` and returns the top 10 with prices, mileage, scores, and insurance estimates |
| "Tell me about car 3" | OpenClaw calls `GET /api/listings/{id}` and returns full details + images |
| "Email the seller of car 3" | OpenClaw calls `POST /api/conversations` to draft an enquiry email, sends it to you for approval |
| "Approve" / "Send it" | OpenClaw calls `POST /api/conversations/{id}/approve` and the email is sent |
| "Edit: change the offer to £6,500" | OpenClaw updates the draft and re-sends for approval |
| "Reject" / "Don't send" | Draft is discarded |
| "Update my postcode to XX1 2YY" | OpenClaw calls `PUT /api/config` to update settings |
| "Change budget to £4,000-£7,000" | OpenClaw updates search criteria |
| "Run scan now" | OpenClaw triggers `POST /api/scrape/trigger` for an immediate scrape cycle |
| "Show price history for car 5" | OpenClaw calls `GET /api/listings/{id}/price-history` |
| "Pause tracking" / "Resume tracking" | Pauses/resumes the cron schedule |
| "Show insurance breakdown for car 2" | OpenClaw calls `GET /api/listings/{id}/insurance` |
| "Add this car: [URL]" | OpenClaw calls `POST /api/listings/manual` — fetches details from the URL, scores it, adds to tracker (useful for FB Marketplace) |

### OpenClaw tool registration

The Tracker exposes itself as a tool for OpenClaw to call. This is registered in your OpenClaw instance's tool configuration:

```json
{
  "name": "fiat500_tracker",
  "description": "Search and track used Fiat 500 manual cars for sale in South East England. Manages listings, shortlists, insurance estimates, and dealer communications.",
  "base_url": "https://fiat500-tracker-XXXXX.run.app",
  "auth": {
    "type": "bearer",
    "token_env": "FIAT500_TRACKER_API_KEY"
  },
  "endpoints": [
    {
      "name": "get_shortlist",
      "method": "GET",
      "path": "/api/shortlist",
      "description": "Get the current top 10 ranked Fiat 500 listings with scores and insurance estimates"
    },
    {
      "name": "get_listing",
      "method": "GET",
      "path": "/api/listings/{id}",
      "description": "Get full details of a specific listing"
    },
    {
      "name": "get_price_history",
      "method": "GET",
      "path": "/api/listings/{id}/price-history",
      "description": "Get price change history for a listing"
    },
    {
      "name": "get_insurance",
      "method": "GET",
      "path": "/api/listings/{id}/insurance",
      "description": "Get insurance estimate breakdown for a listing"
    },
    {
      "name": "add_manual_listing",
      "method": "POST",
      "path": "/api/listings/manual",
      "description": "Manually add a listing by URL (e.g. from Facebook Marketplace)"
    },
    {
      "name": "draft_email",
      "method": "POST",
      "path": "/api/conversations",
      "description": "Draft an enquiry email to a seller for review"
    },
    {
      "name": "approve_email",
      "method": "POST",
      "path": "/api/conversations/{id}/approve",
      "description": "Approve and send a draft email"
    },
    {
      "name": "update_config",
      "method": "PUT",
      "path": "/api/config",
      "description": "Update user configuration (postcode, driver details, budget, email)"
    },
    {
      "name": "trigger_scrape",
      "method": "POST",
      "path": "/api/scrape/trigger",
      "description": "Trigger an immediate scrape cycle across all platforms"
    },
    {
      "name": "pause_tracking",
      "method": "POST",
      "path": "/api/tracking/pause",
      "description": "Pause automated scraping schedule"
    },
    {
      "name": "resume_tracking",
      "method": "POST",
      "path": "/api/tracking/resume",
      "description": "Resume automated scraping schedule"
    }
  ]
}
```

### Proactive notifications (Tracker -> OpenClaw -> WhatsApp)

The Tracker pushes events to OpenClaw via webhook. OpenClaw formats them and sends to your WhatsApp:

| Event | WhatsApp notification |
|-------|-----------------------|
| New car enters top 10 | "New entry in your Fiat 500 shortlist! 2017 Fiat 500 1.2 Pop, 34k miles, £5,995 in Guildford. Score: 87/100. Insurance est: £2,100/yr. Say 'show shortlist' for full list." |
| Price drop on tracked car | "Price drop alert! 2016 Fiat 500 0.9 TwinAir dropped from £6,200 to £5,800 on AutoTrader. Say 'tell me about car 4' for details." |
| Seller replied to your email | "Reply from Surrey Motors about the 2017 500 Pop: 'Hi, yes the car is still available. Happy to arrange a viewing this weekend.' Reply here to respond." |
| Listing removed (car sold) | "Heads up: the 2018 Fiat 500 Lounge (£7,200, CarGurus) is no longer listed — likely sold." |
| Daily digest (6pm daily) | "Daily Fiat 500 update: 3 new listings found, 1 price drop, top pick is a 2017 0.9 TwinAir at £5,450 in Brighton (score 91)." |

### Dealer email engagement flow

```
You (WhatsApp): "Email the seller of car 3"
     |
     v
OpenClaw -> POST /api/conversations { listing_id: "car-3-uuid", template: "initial_enquiry" }
     |
     v
Tracker drafts email using template + listing data, stores in Supabase (status: awaiting_approval)
     |
     v
OpenClaw <- 201 { conversation_id, draft_subject, draft_body }
     |
     v
OpenClaw (WhatsApp): "Here's the draft email to Dave's Motors about the 2017 500 Pop:
     Subject: Enquiry about Fiat 500 1.2 Pop - £5,995
     Body: Hi, I'm interested in your Fiat 500 listed at £5,995...
     Reply 'send' to approve, 'edit: [changes]' to modify, or 'reject' to cancel."
     |
     v
You (WhatsApp): "Send it"
     |
     v
OpenClaw -> POST /api/conversations/{id}/approve
     |
     v
Tracker sends email via SendGrid/Nodemailer, updates status to 'sent'
     |
     v
Seller replies -> inbound email webhook -> Tracker stores reply -> pushes event to OpenClaw
     |
     v
OpenClaw (WhatsApp): "Reply from Dave's Motors: 'Car is available, can you come Saturday?'"
     |
     v
You (WhatsApp): "Tell them Saturday 10am works"
     |
     v
OpenClaw -> POST /api/conversations/{id}/reply { body: "Saturday 10am works for me..." }
     |
     v
(Cycle continues)
```

---

## 8. System Architecture (GCP Cloud Run + Supabase)

```
┌──────────────────────────────────────────────────────────────────────┐
│                         YOUR WHATSAPP                                │
│                              │                                       │
│                              v                                       │
│                    OpenClaw (EC2 Instance)                            │
│                    - Interprets your messages                        │
│                    - Calls Tracker REST API                          │
│                    - Formats responses for WhatsApp                  │
│                    - Relays notifications to you                     │
│                              │                                       │
└──────────────────────────────┼───────────────────────────────────────┘
                               │ HTTPS (REST API)
                               v
┌──────────────────────────────────────────────────────────────────────┐
│               GCP Cloud Run: fiat500-tracker                         │
│                                                                      │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│   │  REST API    │  │  Scrapers   │  │  Ranking    │                │
│   │  /api/*      │  │  (Playwright)│  │  Engine     │                │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                │
│          │                │                │                         │
│   ┌──────┴────────────────┴────────────────┴──────┐                 │
│   │              Core Application                  │                 │
│   │  - Config management                           │                 │
│   │  - Email drafting + sending (SendGrid)         │                 │
│   │  - Insurance estimation                        │                 │
│   │  - Webhook push to OpenClaw                    │                 │
│   └──────────────────┬────────────────────────────┘                 │
│                      │                                               │
└──────────────────────┼──────────────────────────────────────────────┘
                       │ Supabase client (HTTPS)
                       v
┌──────────────────────────────────────────────────────────────────────┐
│                     Supabase                                         │
│                                                                      │
│   ┌──────────────────────────────────────────────┐                  │
│   │            PostgreSQL Database                │                  │
│   │  user_config | listings | price_history       │                  │
│   │  seller_conversations | conversation_messages │                  │
│   │  insurance_quotes | shortlist_snapshots        │                  │
│   └──────────────────────────────────────────────┘                  │
│                                                                      │
│   ┌──────────────────────────────────────────────┐                  │
│   │   Supabase Auth (API key for service role)    │                  │
│   └──────────────────────────────────────────────┘                  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

Scheduling:
  GCP Cloud Scheduler -> triggers POST /api/scrape/trigger every 3 hours
  (or Cloud Run Jobs for longer-running scrape batches)
```

---

## 9. REST API Design

Base URL: `https://fiat500-tracker-XXXXX.run.app`

All endpoints require `Authorization: Bearer <API_KEY>` header.

### Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/config` | Get current user configuration |
| PUT | `/api/config` | Update configuration |

**PUT /api/config** body:
```json
{
  "postcode": "GU1 1AA",
  "search_radius_miles": 50,
  "budget_min": 500000,
  "budget_max": 800000,
  "outbound_email": "me@example.com",
  "adults": [
    { "age": 45, "ncb_years": 9 },
    { "age": 42, "ncb_years": 5 }
  ],
  "learner_age": 17,
  "openclaw_webhook_url": "https://your-openclaw-ec2/webhook/fiat500"
}
```

### Shortlist & Listings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/shortlist` | Top 10 ranked listings |
| GET | `/api/listings` | All active listings (paginated) |
| GET | `/api/listings/{id}` | Full details of one listing |
| GET | `/api/listings/{id}/price-history` | Price changes over time |
| GET | `/api/listings/{id}/insurance` | Insurance estimate breakdown |
| POST | `/api/listings/manual` | Manually add a listing (e.g. from FB Marketplace link) |

### Conversations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/conversations` | Draft a new enquiry email |
| GET | `/api/conversations` | List all conversations |
| GET | `/api/conversations/{id}` | Get conversation with messages |
| POST | `/api/conversations/{id}/approve` | Approve and send a draft |
| POST | `/api/conversations/{id}/reply` | Send a follow-up reply |
| POST | `/api/conversations/{id}/reject` | Reject a draft |

### Scraping & Control

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/scrape/trigger` | Trigger immediate scrape cycle |
| GET | `/api/scrape/status` | Check status of last/current scrape |
| POST | `/api/tracking/pause` | Pause automated scraping |
| POST | `/api/tracking/resume` | Resume automated scraping |

### Webhooks (inbound)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhooks/email-inbound` | Receives seller email replies (from SendGrid inbound parse) |

---

## 10. Supabase Data Model

### Tables

#### `user_config`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | |
| postcode | text | User's postcode for distance + insurance |
| search_radius_miles | integer | Search radius from postcode |
| budget_min | integer | Min budget in pence |
| budget_max | integer | Max budget in pence |
| outbound_email | text | Email address for dealer enquiries |
| adults | jsonb | Array of { age, ncb_years } for insurance |
| learner_age | integer | Daughter's age |
| openclaw_webhook_url | text | URL to push events to OpenClaw |
| tracking_active | boolean | Whether cron scraping is active |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `listings`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Unique listing ID |
| platform | text | Source platform (autotrader, gumtree, etc.) |
| platform_listing_id | text | ID on the source platform |
| url | text | Direct link to listing |
| title | text | Listing title |
| price | integer | Asking price in pence |
| mileage | integer | Odometer reading |
| year | integer | Registration year |
| engine_size | text | 0.9 / 1.2 |
| engine_variant | text | TwinAir / 8v |
| mot_expiry | date | MOT expiry date |
| fuel_type | text | Petrol |
| transmission | text | Manual |
| colour | text | Vehicle colour |
| variant | text | Pop / Lounge / Sport / Convertible etc. |
| seller_name | text | Dealer or private seller name |
| seller_type | text | dealer / private |
| seller_phone | text | Contact phone |
| seller_email | text | Contact email |
| seller_rating | numeric | Rating if available |
| location | text | Postcode or town |
| distance_miles | numeric | Distance from user's postcode |
| description | text | Full listing description |
| image_urls | text[] | Array of image URLs |
| composite_score | numeric | Calculated ranking score (0-100) |
| insurance_estimate | integer | Estimated annual insurance in pence |
| first_seen_at | timestamptz | When we first scraped this listing |
| last_seen_at | timestamptz | Last time listing was live |
| is_active | boolean | Whether listing is still available |
| created_at | timestamptz | Row creation time |
| updated_at | timestamptz | Row update time |

#### `price_history`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | |
| listing_id | uuid (FK -> listings) | |
| price | integer | Price at this snapshot (pence) |
| recorded_at | timestamptz | When the price was observed |

#### `seller_conversations`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | |
| listing_id | uuid (FK -> listings) | |
| seller_email | text | Seller email address |
| status | text | draft / awaiting_approval / sent / replied / closed |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `conversation_messages`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | |
| conversation_id | uuid (FK -> seller_conversations) | |
| direction | text | outbound / inbound |
| subject | text | Email subject |
| body | text | Email body |
| approved_at | timestamptz | When user approved the outbound message |
| sent_at | timestamptz | When the email was actually sent |
| created_at | timestamptz | |

#### `insurance_quotes`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | |
| listing_id | uuid (FK -> listings) | |
| provider | text | Insurance provider name |
| annual_premium | integer | Premium in pence |
| cover_type | text | comprehensive / third_party etc. |
| quote_date | date | When the quote was obtained |
| drivers | jsonb | Driver details used for the quote |
| created_at | timestamptz | |

#### `shortlist_snapshots`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | |
| snapshot_date | date | Date of snapshot |
| listings | jsonb | Ordered array of top 10 listing IDs + scores |
| created_at | timestamptz | |

---

## 11. Tech Stack

| Component | Technology |
|-----------|-----------|
| Language | TypeScript / Node.js |
| Runtime | GCP Cloud Run (containerised) |
| Database | Supabase (PostgreSQL) |
| Scraping | Playwright (headless Chromium in container) |
| Scheduling | GCP Cloud Scheduler (triggers scrape endpoint every 3 hours) |
| Email sending | SendGrid free tier (100 emails/day — transactional API) |
| Email receiving | SendGrid Inbound Parse (webhook to Cloud Run) |
| WhatsApp | OpenClaw (existing EC2 instance) |
| Insurance data | Comparison site APIs / scraping / manual entry fallback |
| Container | Docker (Node.js 20 + Playwright) |
| CI/CD | GitHub Actions -> Cloud Run deploy |
| API auth | Bearer token (shared secret between OpenClaw and Tracker) |

---

## 12. GCP Cloud Run Deployment

### Container structure

```
Dockerfile
├── Node.js 20 base image
├── Playwright + Chromium installed
├── Application code (TypeScript compiled)
└── Env vars:
    ├── SUPABASE_URL
    ├── SUPABASE_SERVICE_KEY
    ├── SENDGRID_API_KEY
    ├── FIAT500_TRACKER_API_KEY (for auth)
    ├── OPENCLAW_WEBHOOK_URL
    └── OPENCLAW_WEBHOOK_SECRET
```

### Cloud Run settings

| Setting | Value |
|---------|-------|
| Min instances | 0 (scale to zero when idle) |
| Max instances | 2 |
| Memory | 2 GiB (Playwright needs this) |
| CPU | 2 vCPU |
| Timeout | 900s (15 min, for scrape cycles) |
| Concurrency | 10 |
| Ingress | All traffic (API is auth-protected) |

### Cost estimate

- Cloud Run: ~£5-10/month (scale-to-zero, only runs during scrapes + API calls)
- Supabase: Free tier (sufficient for this use case)
- SendGrid: Free tier (100 emails/day)
- **Total: ~£5-15/month**

---

## 13. Key Milestones

| # | Milestone | Target |
|---|-----------|--------|
| 1 | PRD approved, Supabase schema deployed | Week 1 |
| 2 | Cloud Run container + REST API skeleton deployed | Week 1 |
| 3 | Platform scrapers operational (AutoTrader, Gumtree, CarGurus) | Week 2 |
| 4 | Ranking engine + shortlist generation working | Week 2 |
| 5 | Insurance estimation integrated | Week 3 |
| 6 | OpenClaw tool registration + WhatsApp flow working | Week 3 |
| 7 | Email drafting + approval + sending flow | Week 3-4 |
| 8 | Full pipeline live: scrape -> rank -> notify -> engage | Week 4 |
| 9 | Remaining scrapers (Cinch, Cazoo, eBay, Heycar, Motors) | Week 4-5 |
| 10 | Ongoing monitoring until purchase decision | Until July 2026 |

---

## 14. Risks & Considerations

| Risk | Mitigation |
|------|-----------|
| Platform ToS may prohibit scraping | Use official APIs where available; keep scrape frequency low (every 3 hrs); rotate user agents |
| Facebook Marketplace access is restricted | Manual monitoring fallback — paste links into WhatsApp and OpenClaw will add them to the tracker |
| Insurance quotes hard to automate | Fallback to manual quotes entered via WhatsApp; cache and extrapolate from historical data |
| Listings go stale quickly (cars sell fast) | 3-hour scrape cycle + immediate WhatsApp alert for high-scoring new listings + manual "run scan now" |
| Budget pressure from insurance costs (17-year-old) | 0.9L and 1.2L engines chosen specifically for insurance groups 6-10; insurance for a 17-year-old can still be £1,500-£3,000+ |
| Fiat 500 known issues | Check for clutch wear (common on 0.9 TwinAir), steering column recalls, rust on sills |
| Cloud Run cold starts | First request after idle may take 5-10s; not an issue for cron jobs, minor for on-demand API calls |

---

## 15. OpenClaw Setup Instructions

Once the Tracker is deployed to Cloud Run, register it as a tool in OpenClaw:

1. **Get your Cloud Run URL** after deployment (e.g., `https://fiat500-tracker-abc123.run.app`)
2. **Generate an API key** and store it as `FIAT500_TRACKER_API_KEY` in both Cloud Run env vars and OpenClaw's config
3. **Add the tool definition** (Section 7, OpenClaw tool registration JSON) to your OpenClaw instance's tool configuration
4. **Configure the webhook** — set `OPENCLAW_WEBHOOK_URL` in Cloud Run to point to your OpenClaw EC2 instance's inbound webhook endpoint
5. **Test via WhatsApp** — send "Set up Fiat 500 tracker" to OpenClaw and provide your postcode, driver ages, NCB years, and email

---

## 16. All Questions Resolved

| Question | Resolution |
|----------|-----------|
| Budget | £5,000 – £8,000 |
| Engine preference | 0.9L TwinAir and 1.2L 8v only (insurance groups 6-10) |
| Daughter's age | 17 |
| Platforms | All major UK platforms (9 automated + FB Marketplace manual) |
| Facebook Marketplace | Manual — paste links into WhatsApp, Tracker fetches and scores |
| Dealer engagement mode | Auto-draft emails for review via WhatsApp |
| Hosting | GCP Cloud Run (backend) + Supabase (database) |
| Postcode, ages, NCB, email | Entered at invocation via OpenClaw/WhatsApp, stored in Supabase `user_config` |
| OpenClaw integration | Tool registration via REST API; webhook for proactive notifications |
| Email delivery | SendGrid free tier (100 emails/day), to be set up |
| Daily digest | 6pm daily via WhatsApp |

---

**All requirements captured. Next steps:** Review this PRD and approve. Once approved, I will scaffold the Cloud Run project, deploy the Supabase schema, and begin building the scraper and API infrastructure.

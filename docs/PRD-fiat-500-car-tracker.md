# PRD: Fiat 500 Car Tracker

**Version:** 0.1 (Draft for review)
**Date:** 2026-02-24
**Author:** Auto-generated
**Status:** Awaiting review

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
| Me (parent) | Primary decision-maker. Reviews shortlist, approves outreach emails, makes purchase decision |
| OpenClaw (EC2) | Agent that drafts dealer emails and sends WhatsApp notifications |

---

## 3. Vehicle Search Criteria

| Parameter | Value |
|-----------|-------|
| Make / Model | Fiat 500 |
| Transmission | Manual only |
| Budget | **£5,000 – £8,000** |
| Location | South East England (approx. 50-mile radius of the SE region) |
| Max mileage | Preference for < 60,000 miles (higher acceptable if price/condition justify) |
| Age | Preference for 2015 or newer |
| MOT | Valid, or recently passed |
| Fuel | Petrol (standard for Fiat 500 manuals) |

---

## 4. Platforms to Monitor

All of the following will be scraped/queried on a recurring schedule:

| Platform | Type | Access method |
|----------|------|---------------|
| **AutoTrader** | Dealer + private | Web scraping / API |
| **Gumtree** | Private + trade | Web scraping |
| **Facebook Marketplace** | Private + trade | Web scraping / Graph API |
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
| Named drivers | 2 adults (ages to be configured) + 1 learner (age 17) |
| Learner status | Provisional licence holder |
| Cover type | Comprehensive |
| Estimated annual mileage | 5,000 – 8,000 |
| Postcode | South East England (configurable) |
| No Claims Bonus | Configurable per adult |

**Data sources for estimation:**

- **MoneySuperMarket / GoCompare / CompareTheMarket APIs** (if available)
- **Historical quote data** cached in Supabase to show trends
- Fallback: manual lookup prompts sent to WhatsApp for me to enter

The insurance estimate will be displayed alongside each shortlisted car so I can see total cost of ownership at a glance.

---

## 7. OpenClaw + WhatsApp Integration

### Flow

```
Shortlist updated
       |
       v
OpenClaw drafts an enquiry email for any new/high-scoring listing
       |
       v
Draft sent to me via WhatsApp for review
       |
       v
I approve / edit / reject via WhatsApp reply
       |
       v
If approved -> OpenClaw sends the email to the seller
       |
       v
Seller replies -> forwarded to my WhatsApp by OpenClaw
       |
       v
I reply via WhatsApp -> OpenClaw relays to seller by email
```

### Key behaviours

- **Auto-draft, human-approve:** No email is sent without my explicit approval via WhatsApp
- **Threaded conversations:** Each seller conversation is tracked as a thread in Supabase
- **Templates:** Configurable email templates (initial enquiry, follow-up, negotiate, decline)
- **Notifications:** WhatsApp alerts for: new top-10 entry, price drops on watched vehicles, seller replies

---

## 8. Supabase Data Model

### Tables

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
| mot_expiry | date | MOT expiry date |
| fuel_type | text | Petrol / Diesel |
| transmission | text | Manual / Automatic |
| colour | text | Vehicle colour |
| seller_name | text | Dealer or private seller name |
| seller_type | text | dealer / private |
| seller_phone | text | Contact phone |
| seller_email | text | Contact email |
| seller_rating | numeric | Rating if available |
| location | text | Postcode or town |
| distance_miles | numeric | Distance from my location |
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
| approved_at | timestamptz | When I approved the outbound message |
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

## 9. System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Scheduler (cron)                  │
│          Runs scraping jobs every 2-4 hours          │
└──────────────┬──────────────────────────┬───────────┘
               │                          │
               v                          v
    ┌──────────────────┐       ┌──────────────────┐
    │  Platform Scrapers│       │  Insurance Estimator│
    │  (per-platform)   │       │                     │
    └────────┬─────────┘       └──────────┬──────────┘
             │                            │
             v                            v
    ┌──────────────────────────────────────────────┐
    │               Supabase (Postgres)             │
    │   listings | price_history | conversations    │
    │   insurance_quotes | shortlist_snapshots      │
    └──────────────┬───────────────────────────────┘
                   │
                   v
    ┌──────────────────────────────────────────────┐
    │           Ranking Engine                      │
    │   Recalculates top 10 after each scrape run   │
    └──────────────┬───────────────────────────────┘
                   │
                   v
    ┌──────────────────────────────────────────────┐
    │         OpenClaw (EC2 Instance)               │
    │   - Drafts enquiry emails                     │
    │   - Sends approved emails                     │
    │   - Relays seller replies                     │
    │   - Manages conversation threads              │
    └──────────────┬───────────────────────────────┘
                   │
                   v
    ┌──────────────────────────────────────────────┐
    │         WhatsApp (via OpenClaw)               │
    │   - Receives shortlist updates                │
    │   - Reviews & approves draft emails           │
    │   - Gets seller reply notifications           │
    │   - Replies relayed back to sellers           │
    └──────────────────────────────────────────────┘
```

---

## 10. Tech Stack

| Component | Technology |
|-----------|-----------|
| Language | TypeScript / Node.js |
| Database | Supabase (PostgreSQL + Auth + Realtime) |
| Scraping | Playwright or Puppeteer (headless browser) |
| Scheduling | Node-cron or Supabase Edge Functions (pg_cron) |
| Email sending | Nodemailer (SMTP) or SendGrid |
| Email receiving | Webhook-based inbound parse (SendGrid / Mailgun) |
| WhatsApp | OpenClaw integration (existing EC2 instance) |
| Insurance data | Comparison site APIs / scraping |
| Hosting | EC2 (alongside OpenClaw) or Supabase Edge Functions |

---

## 11. Key Milestones

| # | Milestone | Target |
|---|-----------|--------|
| 1 | PRD approved, Supabase schema deployed | Week 1 |
| 2 | Platform scrapers operational (AutoTrader, Gumtree, CarGurus) | Week 2 |
| 3 | Ranking engine + shortlist generation working | Week 2 |
| 4 | Insurance estimation integrated | Week 3 |
| 5 | OpenClaw email drafting + WhatsApp notification flow | Week 3-4 |
| 6 | Full pipeline live: scrape -> rank -> notify -> engage | Week 4 |
| 7 | Ongoing monitoring until purchase decision | Until July 2026 |

---

## 12. Risks & Considerations

| Risk | Mitigation |
|------|-----------|
| Platform ToS may prohibit scraping | Use official APIs where available; keep scrape frequency low; rotate user agents |
| Facebook Marketplace access is restricted | May need manual monitoring or browser extension approach |
| Insurance quotes hard to automate | Fallback to manual quotes entered via WhatsApp; cache and extrapolate from historical data |
| Listings go stale quickly (cars sell fast) | High scrape frequency (every 2-4 hours); immediate WhatsApp alert for high-scoring new listings |
| Budget pressure from insurance costs (17-year-old) | Insurance for a 17-year-old on a Fiat 500 can be £1,500-£3,000+; factor into total cost of ownership |
| Fiat 500 known issues | 1.2 8v engine is reliable but check for clutch wear, steering column recalls, rust on sills |

---

## 13. Open Questions for Review

1. **Exact postcode** — What is your postcode (or general area) so we can configure distance calculations and insurance estimates accurately?
2. **Adult driver details** — Ages and No Claims Bonus years for the two adults on the policy?
3. **OpenClaw access** — Can you share the EC2 endpoint / API details for the OpenClaw instance, or should we design the interface and integrate later?
4. **Email account** — Which email address should outbound dealer enquiries come from?
5. **Facebook Marketplace** — Are you happy to manually check FB Marketplace and paste links into WhatsApp, or do you want us to attempt automation (higher risk of being blocked)?
6. **Preferred Fiat 500 variant** — Any preference between the standard 500, 500C (convertible), or 500S (sport)? Engine size preference (0.9 TwinAir vs 1.2 8v vs 1.4)?

---

**Next steps:** Review this PRD and confirm / amend. Once approved, I will set up the Supabase schema and begin building the scraper and ranking infrastructure.

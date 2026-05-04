# Phase 2: On-Chain Data Mastery
## Weeks 2–4 | Building the analytical capability to find and profile institutional LPs

**Goal:** Build the ability to construct targeted LP outreach lists and understand capital flow patterns from on-chain data — the specific analytical requirement in the job description.

**Why this matters for the job:**
Phase 1 taught you *how* protocols work. Phase 2 teaches you *where the capital is and who controls it*. Your entire job is finding institutions with £millions to deploy and explaining why they should use your protocol. This phase is how you find them.

**The core skill:** You'll build Dune dashboards that answer: "Which wallets moved >£500k into lending protocols in the last 30 days?" The answer is your outreach list.

---

## Week 3: Dune Analytics — Build Your First Dashboards

### Task 3a: Complete Dune's SQL Onboarding
**What:** Learn to query decoded protocol tables (aave_v3.Supply, uniswap_v3.Swap, etc.)

**Why:** Dune is the lingua franca of on-chain analysis. If you can't write SQL on Dune, you can't find capital. Every institutional buyer uses Dune dashboards or similar tools. Speaking Dune is table stakes.

**How to execute:**
1. Go to https://dune.com/docs/learning/dune-analytics/tutorials/
2. Complete the full SQL onboarding (2–3 hours)
3. Key concepts to understand:
   - Decoded tables (how Dune parses smart contract events)
   - `aave_v3.Supply`, `aave_v3.Borrow`, `uniswap_v3.Swap` tables
   - Joins between tables (matching transactions across protocols)
   - Aggregations (SUM, COUNT, GROUP BY)
4. Write 3 practice queries:
   - "Show total USDC supplied to Aave in the last 7 days"
   - "Show the top 10 addresses by TVL in Aave v3"
   - "Show swap volume on Uniswap v3 by day"
5. Save these queries (you'll build on them)

**Output for portfolio:** 3 working practice queries in your Dune account

---

### Task 3b: Dashboard 1 — TVL Inflows/Outflows
**What:** Dashboard showing protocol TVL inflows/outflows over 90 days. Filter by wallet size (>£100k). Identify the top 20 depositors by address.

**Why:** You need to see *where capital is flowing*. If TVL is growing, it's because institutions are depositing. If it's shrinking, they're leaving. The top 20 addresses tell you who the real players are.

**How to execute:**
1. Create a new Dune dashboard
2. Write a query:
   ```sql
   SELECT
     block_time,
     SUM(amount) as daily_inflow,
     COUNT(DISTINCT from_address) as unique_depositors
   FROM aave_v3.Supply
   WHERE block_time >= NOW() - INTERVAL 90 day
   AND amount > 100000 * 1e6  -- >100k in USDC
   GROUP BY DATE_TRUNC('day', block_time)
   ```
3. Visualize as a line chart (inflows over time)
4. Create a second query for top 20 depositors:
   ```sql
   SELECT
     from_address,
     SUM(amount) as total_supplied,
     COUNT(*) as num_deposits
   FROM aave_v3.Supply
   WHERE block_time >= NOW() - INTERVAL 90 day
   AND amount > 100000 * 1e6
   GROUP BY from_address
   ORDER BY total_supplied DESC
   LIMIT 20
   ```
5. Visualize as a table
6. **Analyze:** Which addresses appear most? Are they whales or institutions?

**Output for portfolio:** Public Dune dashboard with TVL analysis + screenshot

---

### Task 3c: Dashboard 2 — Whale Wallet Movement
**What:** Track wallets that moved >£500k into/out of Aave in the last 30 days. Label any you can identify.

**Why:** Whales telegraph capital movements. If a known whale is moving half a million into Aave, that's a buy signal. If they're moving out, that's bearish. You're learning to read on-chain sentiment.

**How to execute:**
1. Write a query:
   ```sql
   WITH whale_moves AS (
     SELECT
       from_address,
       block_time,
       amount,
       'supply' as action
     FROM aave_v3.Supply
     WHERE block_time >= NOW() - INTERVAL 30 day
     AND amount > 500000 * 1e6  -- >500k
     
     UNION ALL
     
     SELECT
       from_address,
       block_time,
       amount,
       'withdraw' as action
     FROM aave_v3.Withdraw
     WHERE block_time >= NOW() - INTERVAL 30 day
     AND amount > 500000 * 1e6
   )
   SELECT
     from_address,
     action,
     SUM(amount) as total,
     COUNT(*) as num_txs,
     MIN(block_time) as first_action,
     MAX(block_time) as last_action
   FROM whale_moves
   GROUP BY from_address, action
   ORDER BY total DESC
   ```
2. Export results to a spreadsheet
3. **Investigate:** For each top address:
   - Use https://etherscan.io to check the address
   - Use https://debank.com to see their full portfolio
   - Use https://intel.arkm.com to see if they're labeled (fund, DAO, etc.)
4. Create a table:
   - Address | Label | Total Moved | Type | Follow-up Action
5. Example: "0xABC... is Celsius Treasury, moved 2.5M USDC into Aave. They're aggressively increasing stablecoin exposure."

**Output for portfolio:** Whale movement dashboard + labeled table (shows investigative skill)

---

### Task 3d: Dashboard 3 — LP Capital Flow Patterns
**What:** Which pools are gaining TVL, from which wallet cohorts, and at what times?

**Why:** You're looking for *momentum*. When 10 institutional wallets start supplying to a new pool in the same week, that's a pattern. You can predict where capital will go next and position your pitch accordingly.

**How to execute:**
1. Query pool-level inflows:
   ```sql
   SELECT
     underlying_asset,  -- USDC, ETH, DAI, etc.
     DATE_TRUNC('week', block_time) as week,
     SUM(amount) as weekly_inflow,
     COUNT(DISTINCT from_address) as unique_suppliers,
     AVG(amount) as avg_deposit_size
   FROM aave_v3.Supply
   WHERE block_time >= NOW() - INTERVAL 12 week
   GROUP BY underlying_asset, week
   ORDER BY weekly_inflow DESC
   ```
2. Visualize as a heatmap (assets on Y-axis, weeks on X-axis, color = inflow)
3. Categorize wallet cohorts:
   - "Large institutions" (deposits >1M)
   - "Mid-sized allocators" (100k–1M)
   - "Retail" (<100k)
4. Track which cohort is entering each asset
5. **Insight:** "USDC inflows are coming from institutions (>1M avg). DAI inflows are retail-led. ETH is mixed."

**Output for portfolio:** Capital flow heatmap + cohort analysis

---

### Task 3e: Make One Dashboard Public
**What:** Publish one dashboard to your Dune profile. This is a portfolio asset for interviews.

**Why:** When a hiring manager checks your Dune profile and sees a thoughtful dashboard, it proves you can do the analytical work. It's the difference between "I learned SQL" and "I built something useful."

**How to execute:**
1. Choose your best dashboard (probably Task 3b or 3d)
2. Click "Share" → "Make Public"
3. Add a title and description:
   - Title: "Aave v3 Institutional Capital Flows (90-day analysis)"
   - Description: "Tracks inflows from wallets >$100k. Identifies top 20 institutional depositors and weekly capital trends. Updated daily."
4. Add to your Dune profile bio
5. Share the link: https://dune.com/yourname/your-dashboard

**Output for portfolio:** Public Dune dashboard (this is a real hiring artifact)

---

## Week 4: Nansen, DeBank & LP Profiling

### Task 4a: Set Up Nansen & Study Smart Money Labels
**What:** Understand which wallet cohorts Nansen tracks and how they define institutional vs. retail behavior.

**Why:** Nansen is how institutional allocators track "smart money." If you're trying to outreach to institutions, you need to think like Nansen — what makes a wallet "smart"? What signals matter?

**How to execute:**
1. Go to https://www.nansen.ai and start a free trial
2. Explore the "Smart Money" labeling system:
   - What cohorts do they track? (Whales, Ape wallets, Liquidators, etc.)
   - What signals do they use? (Balance size, frequency of trades, returns, etc.)
3. Watch 2–3 of their explainer videos on cohort definitions
4. Analyze 5 wallets from your Dune dashboard in Nansen:
   - Which cohort are they?
   - What's their historical returns?
   - What assets do they favor?
5. Document:
   - "Address X is a [smart money cohort]. They've favored [asset type]. This suggests they'd be interested in [your protocol]."

**Output for portfolio:** Nansen cohort analysis of 5 target wallets

---

### Task 4b: Profile 10 High-Value Wallets Using DeBank
**What:** Use DeBank to profile 10 wallets identified from your Dune dashboard. Understand their full DeFi portfolio positions.

**Why:** You're building a *psychographic profile* of your ideal LP. What other protocols are they in? What's their yield-seeking behavior? Do they prefer stablecoin or volatile yields? This tells you how to position your pitch.

**How to execute:**
1. Go to https://debank.com
2. Search for the top 10 addresses from your Dune dashboard (Task 3b)
3. For each wallet, document:
   - Total portfolio value
   - Asset allocation (% in stables vs. volatile)
   - Which protocols are they in? (Aave, Compound, Curve, Lido, etc.)
   - Which asset classes? (Lending, AMM, Staking, Options, etc.)
   - Current yield targets (estimated annual return)
4. Create a profile template:
   ```
   Address: 0xABC...
   Portfolio Value: £2.5M
   Strategy: Yield-chasing stablecoin depositor
   Current Positions: Aave (60%), Curve (25%), Lido (15%)
   Est. Annual Return: 4–6%
   Pitch angle: "We offer 5.5% on stablecoins with lower smart contract risk"
   ```
5. Fill out for all 10

**Output for portfolio:** 10 wallet profile summaries (this is your outreach intel)

---

### Task 4c: Use Arkham Intelligence to Cross-Reference Entity Labels
**What:** Verify wallet ownership using Arkham's entity labeling (funds, DAOs, protocols).

**Why:** You need to know *who you're pitching to*. Is it a real fund manager or a whale's personal wallet? Arkham tells you.

**How to execute:**
1. Go to https://intel.arkm.com
2. Search for your top 10 wallets
3. For each, check:
   - Is it labeled as an organization? (Fund, DAO, Protocol, etc.)
   - Who owns it? (Name, company)
   - What industry? (TradFi, crypto-native, institutional, etc.)
4. Update your profile list:
   ```
   Address: 0xABC...
   Label: Lido | Entity Type: Protocol | Owner: Lido DAO
   ```
5. Wallets without labels are likely personal → different pitch strategy

**Output for portfolio:** Entity-labeled wallet list

---

### Task 4d: Build a Manual LP Target List
**What:** 20 wallets categorized as (a) institutional funds, (b) DAO treasuries, (c) on-chain whales — with current protocol allocation and estimated yield targets.

**Why:** This is your most valuable artifact. This is your actual working document for outreach. This is how you'd do the job on day 1.

**How to execute:**
1. Compile your top 20 addresses from all previous dashboards
2. Categorize each:
   - **Institutional funds:** Identified via Arkham, Nansen cohort = "smart money"
   - **DAO treasuries:** Arkham labeled them
   - **Whales:** No organizational label, but >£1M portfolio
3. For each, fill out:
   ```
   Rank | Address | Name | Category | Portfolio Value | Current Protocols | Est. Yield Target | Pitch Angle
   1    | 0xABC   | Lido | DAO      | £50M            | Aave, Curve       | 3–4%              | Low-risk stablecoin yield
   ```
4. Create a spreadsheet (Google Sheets or Excel)
5. Add a "Status" column to track outreach:
   - Not researched
   - Researched
   - Outreach sent
   - Response pending
   - Closed
6. Make it sortable by category and portfolio value

**Output for portfolio:** Master LP target list spreadsheet (this is your working tool)

---

### Task 4e: Research Token Terminal & DeFiLlama
**What:** Learn to read protocol revenue, fee generation, and LP incentive spend.

**Why:** You're competing for capital against other protocols. You need to know: "Are incentives sustainable? Does this protocol make money?" These tools answer that.

**How to execute:**
1. Go to https://tokenterminal.com
2. Compare 3 protocols (Aave, Compound, Curve):
   - Revenue (last 30 days)
   - Revenue per TVL (how efficient?)
   - Incentive spend (sustainable?)
   - P&L (do they make or lose money?)
3. Go to https://defillama.com
4. Compare:
   - TVL trend (growing or declining?)
   - TVL by chain (where is capital concentrated?)
   - Yields (are they getting better or worse?)
5. Create a competitive summary:
   ```
   Protocol | Revenue/TVL | Incentive Spend | Sustainability | Yield Trend
   Aave     | 15bps       | $2M/month       | Sustainable    | Flat
   Compound | 8bps        | $1M/month       | Tight          | Declining
   Curve    | 12bps       | $3M/month       | Aggressive      | Growing
   ```
6. Answer: "Which protocol is positioned to attract capital long-term? Why?"

**Output for portfolio:** Protocol economics competitive analysis

---

### Task 4f: Study One Real DAO Treasury
**What:** Read governance forum, treasury reports, and current DeFi yield strategy (e.g., Uniswap, Arbitrum, MakerDAO).

**Why:** DAO treasuries are your target customers. Understanding *how they make decisions* means understanding how to pitch to them.

**How to execute:**
1. Pick one major DAO: Uniswap, Arbitrum, MakerDAO, or Aave
2. Go to their governance forum (e.g., https://forum.makerdao.com)
3. Find:
   - Most recent treasury management update (usually monthly)
   - Current DeFi yield strategy
   - Recent proposals about capital allocation
4. Document:
   - Total treasury: £[X]
   - Current allocation: [Asset breakdown]
   - Yield strategy: "We're generating [Y]% on stablecoins by [doing Z]"
   - Pain points: "We'd like [A] but can't because [B]"
5. Write 300 words: "If I were pitching a new protocol to [DAO], here's what would appeal to them based on their treasury strategy..."
6. Example: "MakerDAO treasury needs 6%+ on stablecoins to cover stability fees. They're currently in Aave earning 4%. Our protocol offering 6.5% would save them £X per month."

**Output for portfolio:** DAO treasury analysis + personalized pitch

---

## Phase 2 Summary

**Skills you now have:**
- ✅ Can build SQL queries to find institutional capital
- ✅ Can read on-chain data dashboards and extract insights
- ✅ Can identify top institutional wallets
- ✅ Can profile wallets by strategy and yield targets
- ✅ Can assess protocol sustainability and competitiveness
- ✅ Can understand DAO treasury constraints and decision-making

**Portfolio pieces:**
1. Dune SQL practice queries (3)
2. TVL inflows dashboard (public)
3. Whale movement dashboard
4. Capital flow heatmap
5. Nansen cohort analysis (5 wallets)
6. DeBank portfolio profiles (10 wallets)
7. Arkham entity-labeled list
8. Master LP target list (20 wallets, spreadsheet)
9. Protocol economics competitive analysis
10. DAO treasury analysis + pitch template

**What you say at the interview:**
"I built a Dune dashboard that identified the top 20 institutional depositors into lending protocols. From there, I profiled each using DeBank and Arkham to understand their strategy. I know exactly which institutions are yield-seeking, which are risk-averse, and what each would need from a protocol to move capital. I have a working outreach list ready to go."

**What you have right now:**
- A spreadsheet of 20 target institutions
- Detailed profiles of each
- Competitive analysis showing why they'd move to your protocol
- Public portfolio pieces proving you can do the work

→ Next: **Phase 3 — Meet these people in person and build relationships.**

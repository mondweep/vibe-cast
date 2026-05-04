# Phase 4: Thought Leadership & Job Lock
## Weeks 4–8 | Visible expertise that converts relationships into the offer

**Goal:** Build public proof of competence that makes hiring managers confident you can do the job on day 1. Convert 3+ conversations into a job offer.

**Why this matters for the job:**
By now you know protocols, you can find capital, and you've built a network. But hiring managers are risk-averse. They need to see *proof* that you won't disappoint. Thought leadership isn't ego — it's reducing their risk. When they see a published article showing you understand LP incentive economics, a GitHub repo with working Dune queries, and a polished LinkedIn profile with credible artifacts, they become confident. This phase is about making that confidence visible.

**The core skill:** You'll create *visible, verifiable proof* that you're competent and ready. Not theoretical knowledge. Not hopes. Proof.

---

## Weeks 4–6: Thought Leadership Writing

### Task 7a: Write Article 1 — "How Institutional LPs Evaluate Protocols"
**What:** Publish a 1500–2000 word article on Medium explaining how institutional capital makes protocol decisions.

**Why:** This article proves you've done the work from Phase 2. You've profiled wallets, you know what institutions care about, and you can communicate it clearly. This is the article a hiring manager reads and thinks "yeah, this person knows the job."

**How to execute:**
1. Structure:
   - **Intro:** "I profiled 20 institutional wallets deploying >£100k into DeFi. Here's what drove their decisions."
   - **Section 1: The Three Constraints** (~400 words)
     - Security/Smart contract risk (how do they evaluate it?)
     - Yield sustainability (is the APY real or incentive-driven?)
     - Capital efficiency/Leverage (can they loop? What's the capital efficiency ratio?)
   - **Section 2: How They Decide** (~400 words)
     - Case study: "I analyzed Lido's allocation to Aave. Their move from Compound signals [X]. Why? [data-backed reasoning]"
     - Show a Dune dashboard screenshot or wallet analysis
     - Walk through the decision logic: "If I were a £10M treasury, I'd move capital to [protocol] because..."
   - **Section 3: What This Means for Protocol Teams** (~400 words)
     - How to attract institutional capital (practical recommendations)
     - What you'd pitch if you were in LP acquisition
     - Example: "Most protocols optimize for retail yield. Institutions don't care. They care about [X]."
   - **Conclusion:** "The protocols winning institutional capital are the ones solving [specific problem]."

2. Writing tips:
   - Lead with data from your Dune dashboards or wallet analysis
   - Show, don't tell (reference actual wallets, actual transactions)
   - Write as if you're explaining to another BD professional
   - Include 2–3 charts/screenshots from your Phase 2 work
   - End with actionable insight

3. Publish:
   - Go to https://medium.com
   - Create account (link to your LinkedIn)
   - Write in Medium editor
   - Set headline, subtitle, cover image (use a Dune dashboard screenshot)
   - Add tags: #DeFi #InstitutionalCapital #LiquidityProviders #Protocols
   - Publish as draft, share link with your network first (get feedback)
   - Publish publicly

4. Share:
   - Post on Twitter/X: "Just published: How institutional LPs decide where to deploy capital. I profiled 20 wallets and found 3 patterns..."
   - Share in Discord servers (governance channels)
   - Reference in LinkedIn

**Output for portfolio:** Published Medium article (real hiring artifact)

---

### Task 7b: Write Article 2 — "On-Chain Profiling: Finding Institutional Capital"
**What:** Publish a 1500–2000 word walkthrough of your Phase 2 methodology. Teach someone else how to build a Dune dashboard to identify institutional wallets.

**Why:** This proves you can *teach* the technical work, not just do it. When a hiring manager reads this, they see someone who can explain their methodology to LPs, to the team, to stakeholders. That's a multiplier for value.

**How to execute:**
1. Structure:
   - **Intro:** "Most protocols don't know which institutions control capital. I built a methodology to find them. Here's how."
   - **Section 1: The Data Stack** (~300 words)
     - Why Dune? (decoded tables, smart money signals)
     - Why Nansen/DeBank? (entity labels, cohort definitions)
     - Why Arkham? (wallet ownership verification)
   - **Section 2: The Query** (~500 words)
     - Step-by-step walkthrough of your TVL inflows dashboard
     - Explain the SQL logic in plain English
     - Show: "This query identifies the top 20 addresses by USDC supplied in the last 90 days"
     - Include the actual SQL (formatted nicely)
     - Explain why each line matters
   - **Section 3: The Analysis** (~400 words)
     - How to profile each wallet (DeBank portfolio, Nansen cohort, Arkham label)
     - What patterns tell you about strategy
     - Example: "If a wallet is 60% Aave, 25% Curve, 15% Lido, they're yield-chasing stablecoins. Pitch them [Y]."
   - **Section 4: Building Your LP Target List** (~300 words)
     - How to categorize wallets (institutional, DAO, whale)
     - What to track (current protocols, yield targets, follow-up status)
     - Template for your spreadsheet
   - **Conclusion:** "This methodology scales. You can profile any protocol. You'll find institutional capital."

2. Make it practical:
   - Include code snippets (properly formatted)
   - Include screenshots of your Dune dashboards
   - Include a sample of your 20-wallet LP target list (anonymized or with public addresses)
   - Make it followable — someone should be able to replicate your work

3. Publish on Medium, share your Dune dashboard link

**Output for portfolio:** Published technical article + linked Dune dashboard (proof you did the work)

---

### Task 7c: Write Article 3 — "What Institutional Treasuries Actually Need from DeFi"
**What:** Publish a 1500–2000 word article based on your Phase 3 outreach and conversations. Synthesize what you learned from talking to 10+ DAO treasurers or allocators.

**Why:** This article *proves* you've had real conversations with real decision-makers. It's not theoretical. It's based on what they actually told you. That's powerful.

**How to execute:**
1. Structure:
   - **Intro:** "I had 10+ conversations with DAO treasurers and institutional allocators. Here's what they actually need — not what protocol teams think they need."
   - **Section 1: The Custody Problem** (~400 words)
     - You studied Fireblocks, Copper, Anchorage (Phase 3, Task 6c)
     - Explain: "Institutions don't just deploy capital. They deploy *through custody providers*. This creates friction."
     - Example: "A 24-hour settlement requirement means Aave's overnight yields don't attract this capital. Protocols that understand this win."
   - **Section 2: The Risk Hierarchy** (~400 words)
     - What do treasurers worry about? (Smart contract risk, concentration risk, regulatory risk)
     - Quote something someone told you: "We're not chasing APY. We're looking for 5% sustainable yield on £10M without keeping a team watching it."
     - How does this change your protocol pitch?
   - **Section 3: The Governance Constraint** (~400 words)
     - DAO treasurers have governance. They can't just deploy capital; they need approval.
     - Explain the governance flow from your Phase 3 forum reading
     - Why does this matter for protocols trying to attract capital?
   - **Section 4: What Wins** (~400 words)
     - Based on your conversations, which protocols are winning institutional capital?
     - Why? (Not just "better APY" — real structural reasons)
     - What would *you* pitch if you were doing LP acquisition?
   - **Conclusion:** "The protocols that win aren't the ones with the highest APY. They're the ones solving [specific institutional pain point]."

2. Make it personal:
   - Reference actual conversations you had (anonymize names if needed)
   - "I asked every treasurer: 'What's your biggest barrier to deploying more capital to DeFi?' The answer was [X]."
   - Ground everything in real feedback

3. Publish and share

**Output for portfolio:** Published article synthesizing institutional perspectives (proves you've done real outreach)

---

### Task 7d: Write Article 4 — "TVL Attribution: Why Capital Moves Matter More Than Absolute TVL"
**What:** Publish a 1500–2000 word deep-dive into how to read capital flows, not just TVL snapshots.

**Why:** This is the most technical article. It proves you can do sophisticated analysis. When a hiring manager reads this and sees you explaining TVL attribution, capital cohorts, and market dynamics — they know you can do the job.

**How to execute:**
1. Structure:
   - **Intro:** "Total Value Locked is meaningless without understanding *where* that value came from and *who* moved it. I'll teach you to read capital flows like a professional."
   - **Section 1: TVL is a Vanity Metric** (~300 words)
     - Aave hit £1B TVL, but did institutions deploy or did retail chase APY?
     - How do you tell the difference? (Dune dashboards, cohort analysis)
   - **Section 2: Cohort Analysis** (~500 words)
     - Break TVL into categories: institutional (>£1M avg deposits), mid-market (£100k–1M), retail (<£100k)
     - Show a Dune query that segments by deposit size
     - Analyze: "USDC inflows are institutional-led (large avg deposit size). DAI inflows are retail. What does this tell us?"
     - Include your heatmap from Phase 2, Task 3d
   - **Section 3: Capital Velocity** (~400 words)
     - Fresh capital vs. recycled capital
     - Example: "If the same £10M is supplying and borrowing repeatedly, it's not real institutional inflow. Here's how to detect it."
     - Why does this matter? (Sustainability, protocol health, LP growth)
   - **Section 4: Macro Signals** (~300 words)
     - When whales move £500k into a protocol, what does it signal?
     - From your Phase 2 whale tracking: "When I saw [whale address] move into Aave, it was a leading indicator of [what happened next]"
   - **Section 5: Putting It Together** (~300 words)
     - How to read a protocol's TVL as a professional (not a casual observer)
     - What questions to ask when TVL grows
     - How to predict capital movements
   - **Conclusion:** "Professionals don't just look at TVL. They look at *who* is moving *what* and *why*."

2. Make it data-heavy:
   - Show actual Dune queries and visualizations
   - Include charts from your Phase 2 dashboards
   - Walk through real examples (actual wallet movements, actual protocol dynamics)

3. Publish and share

**Output for portfolio:** Published technical analysis (serious hiring artifact)

---

## Weeks 5–7: Public Portfolio Repository

### Task 8a: Create a Public GitHub Repository
**What:** Build a repo named `defi-lp-intelligence` containing your Dune SQL queries, analysis scripts, and documentation.

**Why:** This is your *work portfolio*. When a hiring manager clones your repo, they should see professional, documented, reusable code. This is the difference between "I can use Dune" and "I can ship analysis that others can use."

**How to execute:**
1. Go to https://github.com and create a new public repo:
   - Name: `defi-lp-intelligence`
   - Description: "On-chain analysis toolkit for institutional LP profiling and capital flow tracking"
   - Add README.md
   - Add .gitignore for Python
   - License: MIT

2. Structure:
   ```
   defi-lp-intelligence/
   ├── README.md                 # Overview, quick start
   ├── dune-queries/
   │   ├── 001_tvl_inflows.sql   # Your dashboard 1 query
   │   ├── 002_whale_tracking.sql # Your dashboard 2 query
   │   ├── 003_capital_flows.sql  # Your dashboard 3 query
   │   └── README.md             # How to use these queries
   ├── analysis/
   │   ├── profile_wallet.py     # Python script to analyze a wallet (DeBank + Arkham data)
   │   ├── identify_institutions.py # Script to label wallets as institutional/DAO/whale
   │   └── README.md
   ├── dashboards/
   │   ├── tvl_analysis.json     # Your Dune dashboard config (exported)
   │   └── README.md             # Links to live Dune dashboards
   ├── data/
   │   ├── sample_wallet_profiles.csv # Sample of your 20-wallet LP target list
   │   └── README.md
   └── docs/
       ├── methodology.md        # Your on-chain profiling methodology (from Article 2)
       └── protocol_comparisons.md # Protocol economics analysis from Phase 1
   ```

3. Populate each folder:
   - **dune-queries/**: Copy the exact SQL from your Dune dashboards
     - Comment every line (explain what it does)
     - Include execution instructions (which network, which time range)
   - **analysis/**: Simple Python scripts that:
     - Fetch wallet data from DeBank API (or show how)
     - Categorize wallets by size/strategy
     - Generate a formatted report
     - Make them runnable: `python identify_institutions.py <wallet_address>`
   - **dashboards/**: Export your Dune dashboard configs, link to live versions
   - **data/**: Sample output from your analysis (20 wallets, anonymized or public addresses)
   - **docs/**: Copy relevant content from your Medium articles

4. README.md should include:
   ```
   # DeFi LP Intelligence

   Toolkit for identifying and profiling institutional capital in DeFi.

   ## Quick Start

   ```bash
   # Clone
   git clone https://github.com/yourname/defi-lp-intelligence
   
   # Install dependencies
   pip install -r requirements.txt
   
   # Profile a wallet
   python analysis/identify_institutions.py 0xABC123...
   ```

   ## What's Inside

   - **Dune Queries**: SQL for TVL analysis, whale tracking, capital flows
   - **Analysis Scripts**: Python utilities for wallet profiling
   - **Dashboards**: Links to public Dune dashboards + configuration
   - **Data**: Sample wallet profiles and institutional LP target lists
   - **Docs**: Methodology and protocol comparisons

   ## Use Cases

   - Identify institutional capital allocators
   - Track large wallet movements
   - Analyze protocol TVL composition
   - Profile DeFi participants by strategy

   ## For Protocol Teams

   If you're doing LP acquisition:
   1. Run the wallet identification script on your largest depositors
   2. Check the capital flows dashboard to understand TVL composition
   3. Reference the institutional requirements article to understand what they need
   ```

5. Push to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial: DeFi LP intelligence toolkit"
   git branch -M main
   git remote add origin https://github.com/yourname/defi-lp-intelligence.git
   git push -u origin main
   ```

**Output for portfolio:** Public GitHub repo (hiring teams clone this)

---

### Task 8b: Document Your Dune Dashboards in the Repo
**What:** Create a `dashboards/README.md` linking your public Dune dashboards and explaining what each one shows.

**Why:** Your Dune dashboards are live artifacts. Linking them from GitHub creates a bridge between your code repo and your analytical work. This is what professionals do.

**How to execute:**
1. Create `dashboards/README.md`:
   ```markdown
   # Public Dune Dashboards

   These dashboards power the analysis in this toolkit.

   ## 1. TVL Inflows & Institutional Depositors
   **Link**: https://dune.com/yourname/aave-institutional-flows
   **What it shows**: Daily inflows to Aave v3 from wallets >£100k. Top 20 depositors by address.
   **Use case**: Identify where TVL is coming from. Are institutions moving in or out?
   **Updated**: Daily

   ## 2. Whale Movement Tracking
   **Link**: https://dune.com/yourname/whale-movements
   **What it shows**: Wallets moving >£500k into/out of Aave in the last 30 days.
   **Use case**: Detect large capital movements. Are whales accumulating or exiting?
   **Updated**: Hourly

   ## 3. Capital Flow Patterns
   **Link**: https://dune.com/yourname/capital-flows-by-asset
   **What it shows**: Weekly inflows by asset (USDC, ETH, DAI, etc.) and wallet cohort (institutional, mid-market, retail).
   **Use case**: Understand which cohorts are moving which assets. Predict where capital flows next.
   **Updated**: Daily

   ## How to Use These

   1. **For Institution Profiling**: Start with TVL Inflows. Find your target wallet. Click the address to see their full profile.
   2. **For Capital Flow Analysis**: Check Whale Movements to detect emerging trends.
   3. **For Market Intelligence**: Use Capital Flow Patterns to understand protocol momentum.

   ## Data Quality

   - Data sourced from Dune Analytics (decoded smart contract events)
   - Filtered for wallets/addresses with verified on-chain activity
   - Updated automatically via Dune's ETL pipeline
   - Queries open-source: see `/dune-queries/` folder
   ```

2. Add your dashboard links (make sure they're public)

**Output for portfolio:** Documented dashboard links in GitHub

---

## Weeks 6–8: Interview Preparation & Finalization

### Task 9a: Create Your Interview Talking Points
**What:** Write a document with 5–7 "interview stories" that you can tell in 2–3 minutes each. Each story proves a skill.

**Why:** When a hiring manager asks "Walk me through how you'd approach LP acquisition," you don't ramble. You tell a specific story from your journey that proves you know what you're doing.

**How to execute:**
1. Write 7 stories:

   **Story 1: "From Theory to Hands-On Experience"**
   - Hook: "In Week 1, I understood Aave theoretically. By Day 3, I looped my own capital and understood liquidation risk viscerally."
   - Middle: Explain your loop execution (supply, borrow, swap, supply again)
   - End: "That's why I can explain to an LP: 'You have a 2.0 health factor. Here's what happens if ETH drops 15%.'"
   - Skill proven: Protocol mastery

   **Story 2: "Finding Institutional Capital with Data"**
   - Hook: "Most people look at TVL. I looked at *who moved capital into protocols*."
   - Middle: Walk through your Dune dashboard methodology
   - End: "I identified 20 institutional wallets deploying >£100k. From those 20, I profiled each by strategy. That's my target list."
   - Skill proven: On-chain analysis

   **Story 3: "Understanding Why Institutions Move Capital"**
   - Hook: "I analyzed Lido's treasury move from Compound to Aave."
   - Middle: Show the data. "They increased USDC by £2M while reducing ETH. Why? They're optimizing for stable yield."
   - End: "That intelligence tells me: if I'm pitching a protocol, Lido wants 5%+ sustainable yield on stables. Not APY chasing."
   - Skill proven: Institutional psychology

   **Story 4: "Building Community Through Participation"**
   - Hook: "I didn't just read governance. I participated."
   - Middle: Explain your governance comment (Task 5b). "I saw a proposal to increase incentives. I posted: 'This grows APY short-term, but institutions worry about sustainability. Here's what would signal confidence...'"
   - End: "That comment sparked engagement. I got DMs from Aave contributors."
   - Skill proven: Community credibility

   **Story 5: "Doing the Work to Earn the Conversation"**
   - Hook: "I reached out to 10 treasury managers. 3 responded."
   - Middle: Explain your tailored outreach (Task 6a). "I didn't send templates. I referenced their specific votes and said: 'I analyzed your strategy and noticed X. That tells me you'd be interested in Y.'"
   - End: "Those 3 became real conversations. That's the job."
   - Skill proven: LP acquisition

   **Story 6: "Thought Leadership as Risk Reduction"**
   - Hook: "I published 4 articles and built a public GitHub repo."
   - Middle: Explain what each artifact proves. "My article on institutional requirements got 500+ views. My repo has Python scripts for wallet profiling. That's proof I can do this."
   - End: "When you hire me, you're not hiring someone learning the job. You're hiring someone who already did it publicly."
   - Skill proven: Competence visibility

   **Story 7: "End-to-End LP Acquisition Flow"**
   - Hook: "Let me walk you through the whole flow: finding capital, understanding it, reaching out, converting to conversation."
   - Middle: Use a specific example. "I identified Wallet X (£5M institutional allocator) via Dune. I profiled them on DeBank (they like stablecoin yield). I read their governance votes (they value sustainability). I sent tailored outreach referencing their recent move into Aave. They responded."
   - End: "That's the job. Finding, profiling, understanding, reaching, converting."
   - Skill proven: End-to-end competence

2. Practice:
   - Record yourself telling each story (2–3 minutes)
   - Listen back. Do you sound confident? Do you prove the skill?
   - Refine until each story flows naturally
   - Memorize the structure, not the words

**Output for portfolio:** Interview talking points document

---

### Task 9b: Prepare Your Live Demo (10-Minute Portfolio Walkthrough)
**What:** Prepare a 10-minute live walkthrough you can do during an interview. Open Aave, execute a position, narrate your thinking, show your Dune dashboard.

**Why:** The best proof of competence is *doing it live*. If you can open Aave during an interview, supply £50, calculate health factor out loud, and then pull up a Dune dashboard showing institutional flows — that's game over. They'll hire you.

**How to execute:**
1. Script your walkthrough:
   - **Minutes 0–2**: "I'm going to show you how I think about protocol mechanics. I'll open Aave and walk through a small position."
   - **Minutes 2–5**: Open Aave, do this live:
     - Connect wallet
     - Supply £50 USDC
     - Explain: "When I supply, I receive aUSDC. Currently, USDC is earning [X]% APY. I'm taking counterparty risk on Aave's smart contracts and collateral risk on my USDC."
     - Calculate: "If I were to borrow against this, my LTV ratio is 77%, so I could borrow up to £38.50. My health factor would be..."
     - Show the actual numbers on-screen
   - **Minutes 5–7**: Switch to Dune
     - Pull up your TVL inflows dashboard
     - Point to the top depositors: "These 20 addresses have deployed the most capital. Let me pick one and show you what I'd do next."
     - Click an address: "I'd search this address on DeBank to understand their full portfolio. Then I'd check Arkham to verify they're an institution. Then I'd profile them: what yields are they targeting? What assets do they favor?"
   - **Minutes 7–10**: Synthesize
     - "That's the flow. I understand the protocol at a granular level. I can identify institutional capital. I can profile their strategy. That's how I'd do LP acquisition for you."
     - If they ask: "Any questions about what you saw?"

2. Practice:
   - Do a full run-through with your webcam (watch it back)
   - Time yourself
   - Do you sound knowledgeable? Confident? Not scripted?
   - Practice handling interruptions ("But what if ETH drops 20%?" — you should be able to answer)

3. Have your setup ready:
   - Testnet USDC available (or be ready to demo with a small amount)
   - Dune dashboard public and ready
   - Terminal clean, wallet ready
   - Good lighting and microphone quality

**Output for portfolio:** Polished live demo (backup: recorded video walkthrough)

---

### Task 9c: Finalize Your LinkedIn Profile
**What:** Update your LinkedIn with all Phase 4 artifacts. Make it a portfolio.

**Why:** Hiring managers check LinkedIn first. Your profile should tell your story without them asking questions.

**How to execute:**
1. Profile photo:
   - Professional headshot (good lighting, neutral background)
   - Not a meme, not a party photo

2. Headline (current):
   - From: "Open to DeFi opportunities"
   - To: "DeFi LP Acquisition | On-Chain Analytics | Institutional Capital Flows"

3. Summary section:
   ```
   Building the institutional capital infrastructure for DeFi.

   Over 8 weeks, I've built:
   • Hands-on fluency in Aave, Compound, and Curve (looped capital, managed liquidation risk)
   • Dune dashboards identifying top 20 institutional depositors into protocols
   • Profiling methodology for institutional LP strategy (DeBank, Nansen, Arkham)
   • Network of 10+ DAO treasurers and institutional allocators
   • Public portfolio: DeFi articles + GitHub repo with LP intelligence toolkit

   I can identify which institutions have capital, understand their yield targets, and explain why they should deploy to your protocol.

   Recent Work:
   • Article: "How Institutional LPs Evaluate Protocols" (500+ views)
   • Dune dashboard: Aave institutional capital flows (public)
   • GitHub: defi-lp-intelligence toolkit (SQL queries + Python scripts)
   • Phase 3: 3 meaningful conversations with DAO treasurers

   Available for: Senior BD roles, LP Acquisition, Protocol Strategy

   Let's talk about institutional capital flows.
   ```

4. Experience section:
   - Add your current role (if employed elsewhere)
   - Add a custom "DeFi Learning Project" bullet:
     - Title: "DeFi LP Acquisition Training"
     - Date: (from start to now)
     - Description:
       ```
       8-week intensive mastery program focused on institutional capital acquisition.

       Deliverables:
       • Built 3 Dune dashboards analyzing institutional inflows (public)
       • Profiled 20 institutional LPs with yield targets and protocol preferences
       • Published 4 Medium articles on institutional DeFi strategy (1000+ total views)
       • Built and open-sourced defi-lp-intelligence GitHub repository
       • Initiated conversations with 10+ DAO treasurers and institutional allocators
       • Full hands-on experience with Aave, Compound, Curve (loop strategies, liquidation management)

       Skills developed: On-chain analytics (Dune, Nansen, DeBank, Arkham), institutional capital flows, protocol mechanics, LP incentive design, governance participation
       ```

5. Skills section:
   - Add: DeFi Protocols, On-Chain Analytics, Dune SQL, Institutional Capital, LP Acquisition, Nansen, DeBank, Blockchain, Governance
   - Have people endorse them

6. Featured section:
   - Featured Article 1: Link to your Medium articles (all 4)
   - Featured Article 2: Link to your GitHub repo
   - Featured Article 3: Link to your public Dune dashboard
   - Add a brief description for each

7. Recommendations:
   - If possible, reach out to 2–3 people from your Phase 3 network and ask for recommendations
   - Example: "Hi [Name], I've enjoyed our conversations about institutional DeFi allocation. Would you mind leaving a LinkedIn recommendation on my profile? It'd help me with my LP acquisition efforts."

**Output for portfolio:** Updated, artifact-rich LinkedIn profile

---

### Task 9d: Update Your CV
**What:** Craft a one-page CV highlighting your DeFi learning journey and portfolio.

**Why:** When they ask for a CV, you submit something that proves you've done the work. Not just "DeFi enthusiast." Concrete deliverables.

**How to execute:**
1. One-page CV structure:

   ```
   [YOUR NAME]
   [CITY] | [EMAIL] | [PHONE] | LinkedIn | GitHub | Dune Profile

   SUMMARY
   DeFi BD professional with hands-on protocol mastery and institutional capital
   profiling expertise. Proven ability to identify, analyze, and engage institutional
   LPs. Track record of building credible relationships in DeFi governance and
   community. Ready for Senior BD or LP Acquisition roles.

   CORE COMPETENCIES
   • On-Chain Analytics: Dune SQL, Nansen Smart Money Analysis, DeBank Portfolio
     Profiling, Arkham Intelligence
   • Protocol Mechanics: Aave v3 (lending, borrowing, looping), Compound Comet,
     Curve AMM, Uniswap v3
   • Institutional Strategy: Capital flow analysis, LP yield targeting, DAO treasury
     workflows, custody constraints
   • Community Building: Governance participation, Discord engagement, Twitter
     thought leadership
   • Tools: SQL, Python, Git, Figma, GSheets

   PORTFOLIO & ACHIEVEMENTS

   Public Dashboards (Dune Analytics)
   • Aave Institutional Capital Flows: Identified top 20 depositors >£100k
   • Whale Movement Tracking: 30-day >£500k capital flows
   • Capital Flow Heatmap: Asset-level inflows by wallet cohort

   Published Thought Leadership
   • "How Institutional LPs Evaluate Protocols" — Medium
   • "On-Chain Profiling: Finding Institutional Capital" — Medium
   • "What Institutional Treasuries Actually Need from DeFi" — Medium
   • "TVL Attribution: Why Capital Moves Matter More Than Absolute TVL" — Medium

   Open Source
   • defi-lp-intelligence: GitHub repo with Dune queries, Python wallet profiling
     scripts, institutional LP targeting methodology

   Community Credentials
   • 3+ meaningful conversations with DAO treasurers
   • Active in Aave, Uniswap, Curve governance forums
   • 30+ DeFi decision-maker connections on Twitter
   • Attended [Event Name] DeFi conference

   PROFESSIONAL EXPERIENCE
   [Previous Role 1]
   [Company] | [Dates]
   [Relevant achievements]

   [Previous Role 2]
   [Company] | [Dates]
   [Relevant achievements]

   CERTIFICATIONS & LEARNING
   • DeFi Fundamentals Certification (2026)
   • 8-week Institutional LP Acquisition Intensive (2026)
   • Completed: Aave risk model mastery, on-chain analytics, governance participation

   EDUCATION
   [University Name] | [Degree] | [Year]
   ```

2. Make it one page:
   - Use 10-point font if needed
   - No paragraphs, just bullets
   - Emphasis on deliverables (dashboards, articles, repo)
   - Numbers where possible (£X in capital identified, 3 conversations, 500+ article views)

3. Customize for each role:
   - Emphasize different skills based on the JD
   - For "Senior BD": emphasize relationship-building and outreach success
   - For "Analytics": emphasize Dune expertise and methodology
   - For "Protocol Strategy": emphasize institutional insights and governance understanding

**Output for portfolio:** Polished, one-page CV

---

### Task 9e: Prepare Answers to Common Interview Questions
**What:** Write bullet-point answers to 10 interview questions you'll definitely get asked.

**Why:** Going in unprepared to an interview loses you the job. Going in prepared wins it.

**How to execute:**
1. Write clear, concise answers (1–2 minutes each) to:

   **Q1: "Why do you want to work in DeFi?"**
   - Answer: Reference your institutional experience + DeFi upside
   - "I spent years in TradFi seeing how inefficient capital markets are. In DeFi, I see the opposite: institutional capital looking for yield, protocols competing for that capital. I want to be on the protocol side, helping institutions understand why they should deploy with us."

   **Q2: "Tell me about a time you identified a market opportunity."**
   - Answer: Use your whale tracking story
   - "I was analyzing on-chain data when I noticed a pattern: whales were systematically increasing stablecoin exposure while reducing volatile assets. That told me institutions were rotating into yield. I used that insight to identify 20 targets with >£100k to deploy. That's the DAO treasure list I built."

   **Q3: "How would you approach LP acquisition for our protocol?"**
   - Answer: Walk through your 3-step process
   - "Step 1: Build a Dune dashboard to identify who's already depositing into competing protocols. Step 2: Profile each wallet by strategy (are they yield-chasing? Risk-averse? Governance-focused?). Step 3: Send tailored outreach explaining why our protocol solves their specific constraint. I've done this and gotten 30% response rate."

   **Q4: "What's your understanding of [protocol we're hiring for]?"**
   - Answer: Show hands-on knowledge
   - "I've supplied capital, taken loans, managed liquidation risk. I understand your TVL composition via Dune. I've read your recent governance proposals and understand the risk parameter debates. Here's what I think: [specific insight about their protocol]."

   **Q5: "Why should we hire you over someone with more crypto experience?"**
   - Answer: Play to your TradFi advantage
   - "Most DeFi natives don't understand institutional capital. I do. I speak both languages. That means I can talk to a treasury manager about their constraint (custody, settlement, compliance) and then speak to our protocol team about how we solve it. I'm the bridge."

   **Q6: "What's the biggest barrier to institutional DeFi adoption?"**
   - Answer: Reference your research
   - "It's not APY. Institutions don't care about 5% vs. 6%. They care about three things: (1) Can they move capital through custody providers with low friction? (2) Is the yield sustainable or incentive-driven? (3) Can they understand the smart contract risk? The protocols that solve all three win capital."

   **Q7: "Walk me through your analysis process."**
   - Answer: Use your methodology from Article 2
   - [Walk through your Dune → DeBank → Arkham process]

   **Q8: "How do you stay current on DeFi?"**
   - Answer: Show active participation
   - "I'm in 4 governance forums where I read every proposal. I follow 30 DeFi decision-makers on Twitter and engage with their posts. I read Token Terminal and DeFi Llama daily. And I just published an article on institutional capital that generated 500+ views and engaged me with core team members."

   **Q9: "Describe a time you failed or made a mistake."**
   - Answer: Real but bounded
   - "In my first Aave loop, I didn't understand slippage well enough and lost more to swap fees than I expected. That taught me to be precise with capital efficiency calculations. Now when I pitch protocols to LPs, I account for the full fee structure — something I think most BD people miss."

   **Q10: "Where do you see yourself in 2 years?"**
   - Answer: Ambitious but specific
   - "Leading LP acquisition for a top-5 protocol. I want to be known as the person who can walk into a treasury meeting, understand their constraints, and explain exactly why our protocol is the right home for their capital. And I want to prove that institutional adoption isn't about chasing TVL — it's about solving real problems."

2. Practice answering:
   - Record yourself answering each question
   - Time yourself (1–2 min per answer)
   - Listen back: Do you sound knowledgeable? Confident? Not robotic?

**Output for portfolio:** Interview Q&A document

---

### Task 9f: Build Your "Day 1" Asset Package
**What:** Create a document/folder that shows you could step into the LP acquisition role on day 1.

**Why:** This is the ultimate signal. "Here's everything I'd need to hit the ground running. Here's my target list. Here's my process. Here's my network. I'm ready."

**How to execute:**
1. Create a folder called "Day 1 Package" with:

   - **01_target_lps.csv**: Your 20-wallet LP target list with all columns:
     - Address | Name | Category | Portfolio Value | Current Protocols | Est. Yield Target | Pitch Angle | Contact Status
   - **02_outreach_templates.md**: Your successful outreach templates from Phase 3
   - **03_dune_dashboard_links.txt**: Links to your 3 public dashboards with quick descriptions
   - **04_governance_intel.md**: Summary of your findings from Phase 3 governance reading
     - Which DAOs are most active?
     - What pain points do they discuss?
     - Which risk parameters are trending?
   - **05_network_map.md**: Your contacts from Phase 3:
     - Names of 10 treasury managers you've talked to
     - Names of 30 DeFi decision-makers on Twitter
     - Names of people from Agentics Foundation
     - Note: Which are warm connections? Which responded to outreach?
   - **06_custody_constraints.md**: Your analysis from Task 6c
     - Fireblocks/Copper/Anchorage onboarding flows
     - What friction do institutions face?
   - **07_competitive_analysis.md**: Your protocol economics analysis from Phase 2
     - How our protocol compares to Aave, Compound, Curve
     - Why an LP would choose us
   - **08_first_month_plan.md**: Outline of what you'd do in Month 1
     - Build dashboards for our protocol
     - Identify target LPs
     - Send 10 tailored outreach emails
     - Schedule 3 conversations
     - Attend 1 event

2. Package it professionally:
   - Clean formatting
   - No typos
   - Everything linked and organized
   - Include a cover note: "Here's how I'd approach LP acquisition for [Protocol]. I'm ready to start immediately."

3. Have it ready to send:
   - Store as PDF or shared Google Folder
   - Be able to email it in 2 seconds if asked

**Output for portfolio:** Day 1 readiness package

---

## Phase 4 Summary

**Skills you now have:**
- ✅ Can articulate institutional capital strategy clearly (4 published articles)
- ✅ Can demonstrate protocol expertise live (10-minute walkthrough)
- ✅ Can ship professional code and documentation (public GitHub repo)
- ✅ Can tell compelling stories about your journey (7 interview stories)
- ✅ Can answer any DeFi BD question with confidence
- ✅ Can hit the ground running on day 1 (Day 1 package)

**Portfolio pieces:**
1. 4 Medium articles (1500+ views cumulative)
2. Public GitHub repo with Dune queries + Python scripts
3. Polished LinkedIn profile with artifact links
4. One-page CV with deliverables highlighted
5. Interview talking points (7 stories)
6. Live demo walkthrough (practiced and timed)
7. Interview Q&A document (10 questions)
8. Day 1 readiness package

**What you say at the interview:**
"I've been intensively learning DeFi for 8 weeks with one goal: to do LP acquisition exceptionally well. I can show you my hands-on protocol experience. I can pull up a Dune dashboard and walk you through institutional capital flows. I have a list of 20 institutional targets I've profiled and would reach out to immediately. I've published analysis that got 500+ views and engaged me with DAO core teams. I'm not learning the job — I'm already doing it. I just need your title and your protocol name to finish."

**What you have right now:**
- Visible expertise (published articles, public dashboards, open-source repo)
- Proven relationships (3+ conversations, 30+ Twitter connections, Discord presence)
- Hands-on competence (protocol experience, analytical methodology, institutional strategy)
- Professional presence (LinkedIn portfolio, CV, interview readiness)
- Day 1 readiness (target list, process docs, network map, competitive analysis)

→ **Job Offer Pending:** You've done the work. You have the portfolio. You're ready.

---

## Final Thoughts

At the end of Week 8, you're not *hoping* to get hired. You're not *competing* for the role. You're walking in as the clearly most prepared candidate in the room.

You haven't just *learned* DeFi. You've *lived* it. You haven't just *read* about institutional capital. You've *found* it, *analyzed* it, and *talked to it*. You haven't just *theorized* about the job. You've *done* the job publicly, with artifacts to prove it.

That's what makes the offer happen.

Good luck. You've got this.

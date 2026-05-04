# Phase 1: Protocol Immersion
## Weeks 1–2 | Converting certification knowledge into hands-on protocol fluency

**Goal:** Convert DeFi certification knowledge into first-hand protocol experience. By end of Week 2 you should be able to describe a live Aave loop position from personal experience — not theory.

**Why this matters for the job:** 
You're going to sit across from institutional LPs and explain why they should deploy capital into a protocol. If you've only read whitepapers, they'll smell it. If you've actually supplied collateral, borrowed, looped, and managed liquidation risk in real time, you speak their language. The hiring panel wants someone who doesn't need to ask basic questions about how aTokens accrue.

---

## Week 1: Aave Deep Dive

### Task 1a: Read Aave v3 Risk Documentation in Full
**What:** Complete Aave risk docs covering LTV ratios, liquidation thresholds, e-mode parameters for each asset class.

**Why:** You need to internalize the risk model before you live it. Understanding *why* ETH has a 82.5% LTV but DAI has 80% isn't trivia — it's how you'll explain capital efficiency to allocators.

**How to execute:**
1. Open https://docs.aave.com/risk/
2. Read all sections: Protocol Parameters, Risk Management, Liquidation Mechanics
3. Create a one-page summary table:
   - Asset | LTV | Liquidation Threshold | E-mode Category | Why this matters
4. Example: "ETH 82.5% LTV because it's volatile but highly liquid. DAI 80% because it's less correlated to macro events."
5. Save this table — you'll reference it constantly

**Output for portfolio:** Screenshot of your summary table (shows you understand the mechanics)

---

### Task 1b: Supply USDC or ETH to Aave (Even £50–100)
**What:** Actually deposit collateral. Watch your aToken balance accrue in real time. Note the exchange rate mechanics.

**Why:** Real money changes everything. You'll notice slippage, gas fees, confirmation times, UI delays — things you can't learn from theory. When an LP asks "how quickly can I access my capital?" you'll have a real answer.

**How to execute:**
1. Go to https://app.aave.com
2. Connect your wallet (MetaMask, Ledger, etc.)
3. Supply USDC or ETH (£50–100)
4. Note the aToken you receive (aUSDC or aWETH)
5. **Check every day for 3 days:**
   - What's the aToken balance?
   - What's the exchange rate? (aToken balance / USDC supplied)
   - How much interest did you earn?
6. Calculate your APY manually: (daily interest × 365) / principal

**Output for portfolio:** Screenshot showing your position + simple math showing interest calculation

---

### Task 1c: Borrow Against Your Supplied Collateral
**What:** Take a loan using your supply as collateral. Calculate your health factor before and after.

**Why:** This is where protocol risk lives. Understanding liquidation mechanics is critical — you need to know exactly how close you are to getting wiped out, and why protocols care about this number.

**How to execute:**
1. On your Aave position, click "Borrow"
2. Borrow an amount that gives you a Health Factor of 2.0–2.5 (not below 2.0)
3. **Before borrowing:**
   - Collateral value: (your supply × asset price × LTV)
   - Borrow limit: calculate manually
   - Health Factor: (collateral value) / (total borrows × liquidation threshold)
4. Borrow 30% of your limit
5. **After borrowing:**
   - Recalculate Health Factor
   - Note the difference
6. Check your position daily — does the HF change? Why or why not?

**Output for portfolio:** Detailed screenshot + manual health factor calculations (shows risk awareness)

---

### Task 1d: Run a Single-Loop Strategy
**What:** Supply → Borrow → Swap → Supply. Document every step, fee, and rate change.

**Why:** This is how institutional LPs maximize capital efficiency. You're not just lending; you're creating leverage. Understanding the loop means understanding incentive capture and yield arbitrage.

**How to execute:**
1. Supply 100 USDC
2. Borrow 80 USDT (80% of collateral)
3. Swap USDT → ETH on Uniswap or Curve (note the swap fee)
4. Supply the ETH back to Aave
5. Document:
   - Starting capital: 100 USDC
   - Aave borrow fee: X%
   - Swap slippage/fee: Y%
   - New aETH supply rate: Z%
   - New USDT borrow rate: W%
   - **Net yield:** Can you make more from ETH appreciation + aETH yield than you pay in USDT borrow fees?
6. Hold for 5 days and track P&L

**Output for portfolio:** Full "loop execution memo" showing entry, fees, rates, exit (this is a real artifact analysts create)

---

### Task 1e: Read Aave Governance Forum
**What:** Find 3 active proposals about risk parameters or incentives. Understand what's being debated.

**Why:** Governance is where protocol strategy lives. How are incentives being allocated? Why did they change liquidation parameters? When you talk to DAO treasurers, you need to understand their governance constraints.

**How to execute:**
1. Go to https://governance.aave.com
2. Find 3 recent proposals (last 2 weeks)
3. For each, document:
   - What's being proposed?
   - Why? (What problem does it solve?)
   - Who benefits? (Which users? Which asset classes?)
   - What's the debate? (Pros/cons in the discussion)
4. Write a 100-word take: "I think this proposal is [good/bad] because..."

**Output for portfolio:** 3 governance analysis summaries (shows you understand incentive design)

---

### Task 1f: Study Aave's Revenue Model
**What:** How protocol fees, treasury, and DAO incentives interact with LP behavior.

**Why:** When you pitch to an LP, you're competing with other protocols for their capital. You need to explain: "We make money for you *and* the protocol is sustainable." Understanding the revenue model is how you make that pitch credible.

**How to execute:**
1. Go to https://tokenterminal.com/terminal/projects/aave
2. Study these metrics:
   - Revenue (where does it come from?)
   - TVL (what's the capital base?)
   - Incentive spend (how much does Aave spend to attract LPs?)
3. Answer:
   - How much does Aave keep per $1 of TVL?
   - How much do LPs earn per $1 of TVL?
   - Is this sustainable vs. Compound, Curve?
4. Write a 150-word summary: "Aave's unit economics work because..."

**Output for portfolio:** Protocol economics comparison (shows business acumen)

---

## Week 2: Compound, Curve & Comparative Mechanics

### Task 2a: Supply to Compound v3 (Comet)
**What:** Compare cToken mechanics to Aave's aTokens. Note architectural differences and what they mean for LP risk.

**Why:** You need to speak competently about alternatives. When an LP says "why not Compound?" you need a real answer based on hands-on experience, not marketing copy.

**How to execute:**
1. Go to https://app.compound.finance
2. Supply £50 USDC to Compound v3
3. Compare to your Aave position:
   - How do cTokens differ from aTokens? (Isolated markets vs. cross-collateral)
   - What's the liquidation mechanics difference?
   - Which is more capital-efficient for your scenario?
4. Create a comparison table:
   - Feature | Aave | Compound | Trade-off
5. Example: "Aave lets you loop across assets (more yield, more risk). Compound isolates risk per market (safer, less yield)."

**Output for portfolio:** Architectural comparison table (shows framework thinking)

---

### Task 2b: Study Curve Finance & Provide Liquidity
**What:** Provide liquidity to a stablecoin pool. Understand the bonding curve and why it minimizes slippage.

**Why:** Curve is how LPs generate yield on stablecoins without volatility risk. Understanding the AMM design means understanding LP incentive structures — critical for your role.

**How to execute:**
1. Go to https://curve.fi
2. Choose a stablecoin pool (USDC/USDT/DAI)
3. Provide liquidity: deposit £50 across the pair
4. Study the bonding curve:
   - Why does Curve use a different curve than Uniswap?
   - Why does it minimize slippage for stablecoins?
5. Track your LP position:
   - What's your fee APY?
   - What's the CRV incentive APY?
   - Are you exposed to impermanent loss? (Why or why not for stables?)

**Output for portfolio:** Curve LP position + yield breakdown (shows you understand LP economics)

---

### Task 2c: Read Curve's Gauge System & veCRV Voting
**What:** Understand how protocols compete for liquidity incentives (directly relevant to LP acquisition).

**Why:** This is the exact mechanism you'll use to acquire institutional capital. LPs vote on where incentives go. Understanding veCRV means understanding how to make your protocol attractive to capital allocators.

**How to execute:**
1. Go to https://resources.curve.fi/governance/understanding-gauges/
2. Understand:
   - What is a gauge? (A mechanism to direct incentive emissions)
   - How does veCRV voting work? (Lock CRV, get voting power)
   - Why do protocols care about gauge votes? (They determine fee flows)
3. Find a recent gauge vote on https://vote.curve.fi
4. Write a 150-word summary:
   - "Protocol X is appealing to gauges by [offering incentives/focusing on stablecoin pairs/etc.]. This works because..."

**Output for portfolio:** Gauge mechanics summary + protocol incentive strategy analysis

---

### Task 2d: Provide Liquidity on Uniswap v3 (Concentrated Range)
**What:** Track impermanent loss vs. fees earned.

**Why:** Uniswap v3 concentrated liquidity is the modern LP experience — you're managing a position with price ranges, not just depositing and waiting. This is what sophisticated LPs actually do.

**How to execute:**
1. Go to https://app.uniswap.org
2. Create a Uniswap v3 position in a volatile pair (ETH/USDC):
   - Deposit £50 across ETH and USDC
   - Set a concentrated range (e.g., 2500–2600 if ETH is at 2550)
3. For 7 days, track:
   - Daily price of ETH
   - Is the price still in your range?
   - Daily fee earnings
   - Impermanent loss (if price moved outside range)
4. Calculate:
   - Total fees earned
   - Total IL
   - Net P&L
5. Answer: "Given the volatility I observed, which strategy would have been better: concentrated or 10x wider range?"

**Output for portfolio:** Uniswap IL analysis + fee earnings breakdown (shows you understand LP risk/reward)

---

### Task 2e: Write a 500-Word Personal Note
**What:** Compare Aave, Compound, and Curve from an LP's perspective. What would drive capital allocation to each?

**Why:** This is how you think like an institutional allocator. You're reasoning about trade-offs, not reciting features.

**How to execute:**
1. Write 500 words answering: "I'm a £10M treasury allocator. Why would I choose Aave vs. Compound vs. Curve?"
2. Structure:
   - If I want maximum yield → [protocol], because...
   - If I want safety/simplicity → [protocol], because...
   - If I want to earn CRV/COMP/AAVE governance tokens → [protocol], because...
   - Cross-protocol strategy: "I'd allocate £X to each because..."
3. Reference your hands-on experience from this week

**Output for portfolio:** Original strategy memo (shows allocator-level thinking)

---

### Task 2f: Study One Historical Liquidation Event
**What:** Find a real liquidation transaction on Etherscan. Reverse-engineer what happened to the health factor.

**Why:** Liquidations are how protocols protect against insolvency. Understanding a real cascade teaches you more than any document. When you explain "why we need liquidations" to an LP, reference the actual event.

**How to execute:**
1. Go to https://etherscan.io
2. Search for an Aave liquidation event from the last month
3. Find a transaction labeled "liquidateERC20" or similar
4. Examine the transaction:
   - What was the original position? (collateral, borrow)
   - What was the health factor when it broke?
   - How much was liquidated?
   - Who profited? (the liquidator)
5. Document:
   - Entry: "User supplied 100 ETH, borrowed 50k USDC, HF = 1.8"
   - Trigger: "ETH dropped 15%, HF dropped to 0.95"
   - Liquidation: "Liquidator bought 50k USDC of ETH at 5% discount"
   - Outcome: "User lost £X, liquidator earned £Y"
6. Write 200 words: "This liquidation happened because... and here's what the protocol learned..."

**Output for portfolio:** Real liquidation case study (shows you understand protocol mechanics in crisis)

---

## Phase 1 Summary

**Skills you now have:**
- ✅ Can describe how aTokens, cTokens, and LP positions work from lived experience
- ✅ Understand risk parameters and health factors intuitively
- ✅ Know how to evaluate protocol trade-offs (capital efficiency vs. safety)
- ✅ Can discuss incentive mechanics (gauges, governance, fee distribution)
- ✅ Understand LP profitability at a granular level

**Portfolio pieces:**
1. Aave risk parameters summary table
2. Position screenshot + interest calculation
3. Health factor analysis with manual math
4. Loop execution memo
5. Governance analysis (3 proposals)
6. Protocol economics comparison
7. Curve gauge strategy memo
8. Uniswap IL case study
9. 500-word LP allocation strategy
10. Liquidation event analysis

**What you say at the interview:**
"I spent 2 weeks actually using these protocols. I supplied £50 to Aave and looped it. I got liquidated once and learned exactly why HF matters. I can tell you Aave beats Compound for this use case and Curve for that one — not because someone told me, because I lived it."

→ Next: **Phase 2 — Turn this experience into competitive intelligence.**

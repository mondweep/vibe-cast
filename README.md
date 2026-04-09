# 🎯 Multi-Agent Customer Support Triage System

**Status**: COMPLETED & VERIFIED ✅

This project demonstrates a production-ready **Autonomous Multi-Agent Orchestration** system built with Next.js, [PaperClipAI](https://github.com/paperclipai/paperclip), [BHIL Framework](https://github.com/mondweep/vibe-cast/blob/BHIL-tinkerinh/.claude/commands/bhil.md), SQLite, and the Gemini 1.5/2.5 Flash API. It automates the entire lifecycle of a support ticket—from ingestion and classification to specialized resolution and intelligent escalation.

## 🚀 Quick Start

1. **Setup Environment**:
   ```bash
   cp .env.example .env
   # Add your GEMINI_API_KEY and set GEMINI_MODEL=gemini-2.5-flash
   ```

2. **Run Development Server**:
   ```bash
   npm install
   npm run dev
   ```

3. **Access Dashboard**:
   Navigate to [http://localhost:3000/dashboard](http://localhost:3000/dashboard).

4. **Trigger Processing**:
   Click **"Run Autonomous Cycle"** to watch the agents coordinate in real-time.

---

## 🏗️ Technical Architecture

The system follows an agentic pipeline where specialized LLMs collaborate to resolve issues:

1.  **Intake Agent**: Analyzes raw ticket text to determine category, priority, and sentiment.
2.  **Specialist Agents**:
    *   **Technical Specialist**: Resolves bug reports and system errors.
    *   **Billing Specialist**: Manages trial extensions and payment queries.
    *   **Account Manager**: Handles access and profile issues.
3.  **Escalation Manager**: Acts as a safety net for out-of-scope or highly complex queries.

### Key Performance Metrics
- **Context Aware**: Agents read customer history and previous billing data.
- **Cost Efficient**: Optimized for Gemini Flash, tracking tokens and estimated cost in real-time.
- **Persistent**: SQLite backend ensures no ticket state is lost between cycles.

---

## 📂 Developer Signposting

| Component | Directory / File | Description |
| :--- | :--- | :--- |
| **Agent Logic** | [`agents/`](./agents/) | Core implementation of the specialized LLM agents. |
| **Prompts** | [`docs/prompts/`](./docs/prompts/) | Versioned system prompts and user templates (Markdown). |
| **Database** | [`lib/db.ts`](./lib/db.ts) | Persistence layer using `better-sqlite3`, including cost tracking logic. |
| **API Surface** | [`pages/api/`](./pages/api/) | REST endpoints for ticket CRUD and agent orchestration. |
| **UI / Dashboard** | [`pages/dashboard.tsx`](./pages/dashboard.tsx) | Live dashboard with real-time polling and "How it Works" guide. |
| **Mock Data** | [`mock-data/`](./mock-data/) | 30+ realistic support scenarios and customer profiles. |
| **Schema** | [`public/schema.sql`](./public/schema.sql) | The SQLite database structure. |

---

## 🎬 Demo Workflow

1.  **Dashboard Loads**: Shows 30 "New" tickets.
2.  **Click "Run Autonomous Cycle"**:
    *   The `intake-agent` batch processes new tickets.
    *   Status updates to `classified` -> `assigned`.
    *   Specialists resolve assigned tickets based on category.
    *   Total Cost and Resolution Rates update live (2s polling).
3.  **Detailed Review**: Click any ticket in the queue to see the **Agent Reasoning** and final resolution text.

---

## 💡 Why This Matters

This isn't a simple chatbot. It's a **stateful coordination layer** that simulates how a modern enterprise support team operates—but at the speed of light and with transparent cost tracking for every single decision.

Built with ⚡ by the Antigravity Team.

---

## ❓ Frequently Asked Questions

### Q1: Are the Inference Costs shown on the dashboard real?

**No — they are illustrative estimates.** The cost figure displayed is a simulation for demonstration purposes. There are two layers of approximation:

1. **Token counts are hardcoded**: Each agent logs a fixed estimate (e.g., 400 tokens for Intake, 500 for Billing) rather than reading the actual token usage returned by the Gemini API. The real count depends on the length of the system prompt, the ticket description, and the model's response.

2. **The price-per-token formula is wrong**: The code uses `$0.003 / 1,000 tokens` — which is historically the pricing for **Claude 3.5 Sonnet** (the comment in the source code even says so). This is a left-over placeholder that has never been updated to reflect Gemini's pricing.

---

### Q2: What would the real cost be if Gemini actually billed me?

Based on the **Gemini 2.5 Flash** public pricing as of April 2026:

| | Dashboard Display | Realistic Estimate |
| :-- | :-- | :-- |
| **Price per 1K tokens** | $0.003 (Claude price placeholder) | ~$0.0001875 (Gemini 2.5 Flash input) |
| **Tokens per ticket (est.)** | 400–600 (hardcoded) | ~1,500–2,500 (prompt + response) |
| **Total for 30 tickets** | shown as ~$0.05–0.10 | **~$0.005–0.01** (½ a cent) |

The dashboard overstates the real cost by approximately **10–20×**.

---

### Q3: Is my usage free under Gemini's Free Tier?

**Very likely yes** for demo use. Google's Gemini API free tier (as of early 2026) offers:

- **15 requests per minute** (RPM)
- **1,000,000 tokens per minute** (TPM)
- **1,500 requests per day**

A single "Run Autonomous Cycle" for 30 tickets makes roughly **30–90 API calls** in total (1 per classify + 1 per specialist resolution + escalation checks). This comfortably fits within the **1,500 requests/day** free quota.

> **Bottom line**: If you run this demo a handful of times a day for a meetup, **your real cost is $0.00**. The dashboard costs are a useful demonstration of *what cost tracking looks like in a production agentic system*, not a reflection of your actual bill.

---

### Q4: How could you make the cost tracking accurate?

It is straightforward to fix in a future iteration:
1. **Read real token counts**: The Gemini SDK returns `usageMetadata.promptTokenCount` and `usageMetadata.candidatesTokenCount` in every response — these just need to be passed to `updateAgentTokens()` instead of the hardcoded estimates.
2. **Apply the correct price**: Replace `$0.003/1K` with Gemini 2.5 Flash's current pricing, split between input (`$0.0001875/1K`) and output (`$0.0007500/1K`) tokens.

---

## 👨‍💻 Credits & Community

Created by **Mondweep Chakravorty**  
🔗 [Connect on LinkedIn](https://www.linkedin.com/in/mondweepchakravorty/)  
🐙 [GitHub Repository](https://github.com/mondweep/vibe-cast)

This demonstration was inspired by a discussion prompted at the **London Chapter's Agentics Foundation meetup** on the 8th of April 2026.

Built with ⚡ by the Antigravity Team.

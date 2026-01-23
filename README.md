# @claude-flow/browser Demo Project

**Working examples for AI-optimized browser automation with REAL websites.**

This project demonstrates `@claude-flow/browser` capabilities using **actual, working websites** - no imaginary URLs or placeholder sites.

## 🛠️ Recent Fixes & Verification (Jan 23, 2026)

We have resolved critical issues with the `@claude-flow/browser` library that were causing `browser.evaluate is not a function` errors.

### Fixes Applied:
1.  **Library Patch**: Patched `@claude-flow/browser` to:
    *   Swap `execSync` for `execFileSync` to handle complex JavaScript shell escaping correctly.
    *   Remove the unsupported `--timeout` flag injection.
2.  **API Update**: Replaced all instances of `evaluate` (conceptual) with `eval` (actual API).
3.  **Result Unwrapping**: Updated all examples to correctly unwrap the `browser.eval()` return object (using `.data.result`).

### Verification
The solution has been verified with the Hacker News scraper:
```bash
npm run real:hackernews
```
**Result**: Successfully scrapes 30 top stories and navigates categories.

## Architecture

This project uses a layered architecture to provide robust browser automation:

1.  **Application Layer (`src/*.ts`)**: High-level scripts (e.g., `real-01-hackernews.ts`) that use `BrowserService`.
2.  **Service Layer (`BrowserService`)**: Manages sessions, security/PII scanning, and trajectory recording.
3.  **Adapter Layer (`AgentBrowserAdapter`)**: Bridges the service to the underlying CLI tool.
4.  **Execution Layer (`agent-browser` CLI)**: The binary that actually controls the browser via Playwright.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browsers
npm run setup

# 3. Run a real-world example
npm run real:hackernews   # Scrape Hacker News top stories
npm run real:github       # Get GitHub trending repos
npm run real:wikipedia    # Extract Wikipedia knowledge
npm run real:news         # Aggregate tech news from multiple sites
npm run real:status       # Monitor service status pages
```

## Prerequisites

- **Node.js 18+** (check with `node --version`)
- **agent-browser CLI** (installed globally):
  ```bash
  npm install -g agent-browser@latest
  ```

## Real-World Examples

These examples work with **actual websites** and produce **real data**:

| Example | Command | What It Does |
|---------|---------|--------------|
| **Hacker News** | `npm run real:hackernews` | Scrapes top stories from news.ycombinator.com |
| **GitHub Trending** | `npm run real:github` | Extracts trending repos by language |
| **Wikipedia** | `npm run real:wikipedia` | Extracts article data and infoboxes |
| **News Aggregator** | `npm run real:news` | Aggregates from BBC, NPR, Verge, Ars Technica |
| **Status Monitor** | `npm run real:status` | Monitors GitHub, Cloudflare, Vercel, npm status |

### 1. Hacker News Scraper (`real-01-hackernews.ts`)

Scrapes real-time top stories from Hacker News.

```typescript
// Extracts: rank, title, URL, points, author, comments
const result = await scrapeHackerNews(1);  // 1 page = ~30 stories

// Also supports different sections
await scrapeHackerNewsCategory('newest');  // or 'ask', 'show', 'jobs'
```

**Use cases:**
- Tech news monitoring
- Content curation
- Trend analysis
- Research data collection

### 2. GitHub Trending Repos (`real-02-github-trending.ts`)

Extracts trending repositories with language and time range filtering.

```typescript
// Get trending for all languages
await scrapeGitHubTrending('all', 'daily');

// Filter by language
await scrapeGitHubTrending('typescript', 'weekly');
await scrapeGitHubTrending('rust', 'monthly');

// Parallel scraping multiple languages
await scrapeMultipleLanguages(['python', 'rust', 'go']);
```

**Use cases:**
- Discover new open-source projects
- Track technology trends
- Developer tooling
- Portfolio research

### 3. Wikipedia Knowledge Extractor (`real-03-wikipedia.ts`)

Extracts structured data from Wikipedia articles.

```typescript
// Extract full article with infobox, sections, categories
const article = await extractWikipediaArticle('Artificial intelligence');

// Search Wikipedia
const results = await searchWikipedia('machine learning', 5);

// Compare multiple articles in parallel
await compareArticles([
  'Python (programming language)',
  'JavaScript',
  'Rust (programming language)',
]);
```

**Use cases:**
- Knowledge base building
- Research automation
- Educational content extraction
- Data enrichment

### 4. Multi-Site News Aggregator (`real-04-news-aggregator.ts`)

Parallel scraping from 5 real tech news sources:

- **BBC Technology** - bbc.com/news/technology
- **NPR Technology** - npr.org/sections/technology
- **The Verge** - theverge.com/tech
- **Ars Technica** - arstechnica.com
- **Hacker News** - news.ycombinator.com

```typescript
// Aggregate from all sources
const news = await aggregateNews(['hackernews', 'bbc', 'ars', 'verge', 'npr']);

// Analyze trending topics
analyzeTopics(news);

// Export to JSON
const json = exportToJSON(news);
```

**Use cases:**
- News monitoring dashboards
- Content aggregation
- Media analysis
- Competitive intelligence

### 5. Service Status Monitor (`real-05-status-monitor.ts`)

Monitors real status pages for developer services:

- **GitHub Status** - githubstatus.com
- **Cloudflare Status** - cloudflarestatus.com
- **Vercel Status** - vercel-status.com
- **npm Status** - status.npmjs.org
- **Atlassian Status** - status.atlassian.com

```typescript
// Check all services
const report = await checkAllServices();

// Check specific services
const report = await checkAllServices(['github', 'cloudflare', 'npm']);

// Generate alerts
const alert = generateAlert(report);
```

**Use cases:**
- Infrastructure monitoring
- DevOps dashboards
- Incident alerting
- SLA tracking

## Original Examples (Conceptual)

The original examples demonstrate API patterns with placeholder URLs:

| Example | Command | Description |
|---------|---------|-------------|
| Basic Navigation | `npm run example:basic` | Open pages, take snapshots |
| Login Flow | `npm run example:login` | Form filling patterns |
| Data Extraction | `npm run example:scrape` | Scraping concepts |
| Parallel Swarm | `npm run example:swarm` | Multi-browser patterns |
| Form Automation | `npm run example:form` | Form handling concepts |

## Key Concepts

### Element Refs (@e1, @e2, etc.)

Instead of verbose CSS selectors, `@claude-flow/browser` uses element references:

```typescript
// Traditional (verbose, token-heavy)
await page.fill('input[name="email"][type="text"].form-control', 'user@example.com');

// @claude-flow/browser (93% smaller)
await browser.fill('@e1', 'user@example.com');
```

### Trajectory Learning

Wrap interactions in trajectories to teach the system successful patterns:

```typescript
browser.startTrajectory('Scrape Hacker News');

await browser.open('https://news.ycombinator.com/');
const stories = await browser.evaluate('...');

// Mark as successful - pattern saved for reuse
await browser.endTrajectory(true, 'Scraped 30 stories');
```

### Browser Swarm (Parallel Processing)

Process multiple URLs simultaneously:

```typescript
const swarm = createBrowserSwarm({ maxSessions: 5 });

const promises = urls.map(async (url) => {
  const browser = await swarm.spawn();
  await browser.open(url);
  const data = await browser.evaluate('...');
  await browser.close();
  return data;
});

const results = await Promise.all(promises);
```

### Security Features

Built-in protection with `enableSecurity: true`:

- URL validation and phishing detection
- PII scanning in form submissions
- XSS/SQL injection prevention
- Domain allowlisting

## API Reference

### createBrowserService(options)

```typescript
const browser = createBrowserService({
  sessionId: 'my-session',
  enableSecurity: true,
  enableMemory: true,
  allowedDomains: ['example.com'],
});
```

### Core Methods

| Method | Description |
|--------|-------------|
| `browser.open(url)` | Navigate to URL |
| `browser.snapshot(opts)` | Get AI-optimized page state |
| `browser.fill(ref, value)` | Fill input field |
| `browser.click(ref)` | Click element |
| `browser.select(ref, value)` | Select dropdown option |
| `browser.wait(opts)` | Wait for condition |
| `browser.evaluate(js)` | Run JavaScript in page |
| `browser.extractData(refs)` | Extract data from elements |
| `browser.close()` | Close browser session |

### Trajectory Methods

| Method | Description |
|--------|-------------|
| `browser.startTrajectory(name)` | Begin recording |
| `browser.endTrajectory(success, note)` | End and save pattern |

## Integration with Claude Code

Add as MCP server for Claude Code integration:

```bash
# Add to Claude Code
claude mcp add claude-flow -- npx claude-flow@v3alpha mcp start

# Verify
claude mcp list
```

Then use 59 browser MCP tools directly in Claude Code conversations.

## Project Structure

```
vibe-cast/
├── package.json
├── tsconfig.json
├── README.md
└── src/
    ├── types.ts                    # TypeScript definitions
    │
    ├── # Original conceptual examples
    ├── 01-basic-navigation.ts
    ├── 02-login-flow.ts
    ├── 03-data-extraction.ts
    ├── 04-parallel-swarm.ts
    ├── 05-form-automation.ts
    │
    └── # REAL-WORLD working examples
    ├── real-01-hackernews.ts       # Hacker News scraper
    ├── real-02-github-trending.ts  # GitHub trending repos
    ├── real-03-wikipedia.ts        # Wikipedia extractor
    ├── real-04-news-aggregator.ts  # Multi-site news
    └── real-05-status-monitor.ts   # Service status monitor
```

## Running All Real Examples

```bash
# Run all real-world examples in sequence
npm run real:all

# Or run individually
npm run real:hackernews
npm run real:github
npm run real:wikipedia
npm run real:news
npm run real:status
```

## Troubleshooting

### "agent-browser not found"

```bash
npm install -g agent-browser@latest
```

### "Playwright browsers missing"

```bash
npx playwright install chromium
```

### Rate limiting or blocked requests

Some websites may rate-limit or block automated requests. The examples include:
- Respectful delays between requests
- Standard browser user-agents
- No aggressive retry loops

### Security blocking legitimate URLs

```typescript
// Whitelist specific domains
const browser = createBrowserService({
  allowedDomains: ['trusted-domain.com'],
});

// Or skip security for specific navigation
await browser.open('http://example.com', { skipSecurityCheck: true });
```

## Links

- [claude-flow GitHub](https://github.com/ruvnet/claude-flow)
- [agent-browser](https://github.com/vercel-labs/agent-browser)
- [Claude-Flow Documentation](https://github.com/ruvnet/claude-flow/wiki)

---

Part of the Claude-Flow ecosystem

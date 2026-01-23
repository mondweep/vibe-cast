# @claude-flow/browser Demo Project

Working examples for AI-optimized browser automation with `@claude-flow/browser`.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browsers
npm run setup

# 3. Run an example
npm run example:basic
```

## Prerequisites

- **Node.js 18+** (check with `node --version`)
- **agent-browser CLI** (installed globally):
  ```bash
  npm install -g agent-browser@latest
  ```

## Examples

| Example | Command | Description |
|---------|---------|-------------|
| Basic Navigation | `npm run example:basic` | Open pages, take snapshots, use element refs |
| Login Flow | `npm run example:login` | Form filling, click actions, waiting |
| Data Extraction | `npm run example:scrape` | Extract structured data from pages |
| Parallel Swarm | `npm run example:swarm` | Multi-browser parallel scraping |
| Form Automation | `npm run example:form` | Complete form automation with security |

## Key Concepts

### Element Refs (@e1, @e2, etc.)

Instead of verbose CSS selectors, `@claude-flow/browser` uses element references:

```typescript
// Traditional (verbose, token-heavy)
await page.fill('input[name="email"][type="text"].form-control', 'user@example.com');

// @claude-flow/browser (93% smaller)
await browser.fill('@e1', 'user@example.com');
```

Element refs come from `browser.snapshot()` which analyzes the page and assigns refs to interactive elements.

### Trajectory Learning

Wrap interactions in trajectories to teach the system successful patterns:

```typescript
browser.startTrajectory('Login to dashboard');

await browser.open('https://app.example.com/login');
await browser.fill('@e1', 'user@example.com');
await browser.fill('@e2', 'password');
await browser.click('@e3');

// Mark as successful - this pattern gets saved for future use
await browser.endTrajectory(true, 'Login successful');
```

### Security Features

Built-in protection when `enableSecurity: true`:

- URL validation and phishing detection
- PII scanning in form submissions
- XSS/SQL injection prevention
- Domain allowlisting

```typescript
const browser = createBrowserService({
  enableSecurity: true,
  allowedDomains: ['myapp.com', 'api.myapp.com'],
});
```

## API Reference

### createBrowserService(options)

```typescript
const browser = createBrowserService({
  sessionId: 'my-session',      // Unique session identifier
  enableSecurity: true,         // URL/PII scanning
  enableMemory: true,           // Trajectory learning
  allowedDomains: ['...'],      // Domain whitelist
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

### createBrowserSwarm(options)

For parallel operations:

```typescript
const swarm = createBrowserSwarm({
  maxSessions: 5,  // Max concurrent browsers
});

const browser = await swarm.spawn();  // Get a browser from the pool
await browser.open('...');
await browser.close();  // Return to pool
```

## Integration with Claude Code

Add as MCP server for Claude Code integration:

```bash
# Add to Claude Code
claude mcp add claude-flow -- npx claude-flow@v3alpha mcp start

# Verify
claude mcp list
```

Then use 59 browser MCP tools directly in Claude Code conversations.

## Troubleshooting

### "agent-browser not found"

```bash
npm install -g agent-browser@latest
```

### "Playwright browsers missing"

```bash
npx playwright install chromium
```

### Security blocking legitimate URLs

```typescript
// Option 1: Whitelist domain
const browser = createBrowserService({
  allowedDomains: ['trusted-domain.com'],
});

// Option 2: Skip for specific navigation
await browser.open('http://trusted-domain.com', { skipSecurityCheck: true });
```

### Trajectories not persisting

Always `await` the endTrajectory call:

```typescript
await browser.endTrajectory(true);  // Must await!
```

## Project Structure

```
claude-flow-browser-demo/
├── package.json
├── tsconfig.json
├── README.md
└── src/
    ├── 01-basic-navigation.ts   # Simple navigation
    ├── 02-login-flow.ts         # Form login pattern
    ├── 03-data-extraction.ts    # Scraping example
    ├── 04-parallel-swarm.ts     # Multi-browser swarm
    └── 05-form-automation.ts    # Complete form handling
```

## Links

- [claude-flow GitHub](https://github.com/ruvnet/claude-flow)
- [agent-browser](https://github.com/vercel-labs/agent-browser)
- [Claude-Flow Documentation](https://github.com/ruvnet/claude-flow/wiki)

---

Part of the Claude-Flow ecosystem 🌊

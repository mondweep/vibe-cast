# OWASP Top 10 (2021) Security Audit Report

**Target**: `/home/user/vibe-cast` (Agentic QE / vibe-cast codebase)
**Date**: 2026-02-20
**Auditor**: Claude Code Security Auditor Agent (not AQE-powered)
**Scope**: Full codebase (v2/, v3/, scripts/, .claude/, .github/)
**Methodology**: Manual code-level scanning using Grep, Read, Glob tools across all source files

> **Note**: This audit was performed using Claude Code's built-in security-auditor agent, not the AQE security testing framework (`/security-testing`, `/qe-security-compliance`, `/pentest-validation`). A follow-up AQE-powered audit using the project's own security scanners would provide additional coverage.

---

## Executive Summary

| Severity | Count |
|----------|-------|
| **Critical** | 1 |
| **High** | 4 |
| **Medium** | 12 |
| **Low** | 6 |
| **Info** | 3 |
| **Total** | **26 findings** |

Additionally, **6 positive security practices** were identified already in place.

---

## A01:2021 - Broken Access Control

### Finding A01-1: REST API Endpoints Lack Authentication (HIGH)

**Files**:
- `v2/src/visualization/api/RestEndpoints.ts` (lines 178-227)
- `v2/src/edge/server/index.ts` (lines 115-248)

All REST API routes are publicly accessible without authentication middleware. The visualization API exposes event data, reasoning chains, agent histories, and session data. The Edge Server exposes agent spawning (`POST /api/agents/spawn`), agent cancellation (`DELETE /api/agents/:id`), and signaling stats — all without auth.

```typescript
// RestEndpoints.ts:178 - no auth middleware on any route
this.app.get('/api/visualization/events', this.handleGetEvents.bind(this));
this.app.get('/api/visualization/reasoning/:chainId', this.handleGetReasoningRoute.bind(this));

// EdgeServer index.ts:153 - agent spawning with no auth
this.app.post('/api/agents/spawn', async (req: Request, res: Response) => {
  const request = req.body as SpawnAgentRequest;
  // No authentication check
```

**Remediation**: Add authentication middleware (JWT/API key) to all sensitive routes. The v3 codebase already has `createJWTMiddleware()` in `v3/src/adapters/a2a/auth/middleware.ts` — apply it to v2 endpoints as well.

### Finding A01-2: OAuth Protection Disabled by Default on A2A Routes (MEDIUM)

**File**: `v3/src/mcp/http-server.ts` (line 138)

```typescript
/** Enable OAuth protection on A2A routes (default: false) */
enableOAuth?: boolean;
```

The HTTP server defaults OAuth protection to `false`, meaning all A2A task submission and discovery endpoints are unauthenticated unless explicitly configured.

**Remediation**: Set `enableOAuth` to `true` by default in production environments.

### Finding A01-3: Mock Auth Middleware Allows Wildcard Scope (LOW)

**File**: `v3/src/adapters/a2a/auth/middleware.ts` (lines 452-473)

```typescript
export function mockAuthMiddleware(
  mockUser?: { id: string; scopes?: string[] }
): ... {
  if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'development') {
    throw new Error(`mockAuthMiddleware is only available in test/development...`);
  }
  const user = mockUser ?? { id: 'mock-user', scopes: ['*'] }; // wildcard scope
```

While guarded by NODE_ENV check, a misconfiguration of NODE_ENV could grant wildcard permissions.

**Remediation**: Add a compile-time or build-time guard, not just a runtime NODE_ENV check.

---

## A02:2021 - Cryptographic Failures

### Finding A02-1: SHA-256 Used for Password Hashing (HIGH)

**File**: `v2/tests/fixtures/phase1-fixtures.ts` (line 82)

```typescript
const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
if (user.password === hashedPassword) {
  return generateToken(user);
}
```

SHA-256 is a fast hash unsuitable for passwords. Passwords should use bcrypt, scrypt, or Argon2.

**Remediation**: Use `bcrypt` or `argon2` with proper salt for all password hashing.

### Finding A02-2: Hardcoded Placeholder API Key in Example Code (MEDIUM)

**File**: `v2/examples/hybrid-router-ml-complexity.ts` (line 26)

```typescript
apiKey: process.env.ANTHROPIC_API_KEY || 'sk-ant-...'
```

The fallback pattern encourages developers to place API keys directly in code.

**Remediation**: Remove the fallback entirely. Throw an error if the environment variable is not set.

### Finding A02-3: Placeholder Credentials in .env.example (INFO)

**File**: `.env.example` (lines 9-10, 39)

```
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
RUVECTOR_PASSWORD=ruvector
PGPASSWORD=ruvector
```

**Remediation**: Use clearly non-functional placeholder values (e.g., `<YOUR_API_KEY_HERE>`).

### Finding A02-4: Math.random() Used in Non-Security Contexts (INFO)

**Files**: Multiple test files and benchmarks (e.g., `scripts/benchmark-aqe-baseline.ts` lines 37, 234, 280, 466)

`Math.random()` is used for test data generation. The JWT implementation correctly uses `crypto.randomUUID()`.

**Severity**: INFO (no security-sensitive use detected)

---

## A03:2021 - Injection

### Finding A03-1: innerHTML Used with User-Influenced Data (MEDIUM)

**File**: `v2/src/edge/vscode-extension/webview/main.ts` (lines 166-168, 274)

```typescript
elements.currentFile.innerHTML = `
  <span class="file-name" title="${escapeHtml(analysis.filePath)}">${escapeHtml(fileName)}</span>
  <span class="file-language">${escapeHtml(analysis.language)}</span>
`;

// Line 274: innerHTML with suggestion data
elements.suggestionList.innerHTML = suggestions
  .slice(0, 10)
  .map((s, i) => renderSuggestionItem(s, i))
  .join('');
```

Partially mitigated by `escapeHtml()` but inconsistently applied.

**Remediation**: Use DOM API methods (`createElement`, `textContent`) consistently instead of `innerHTML`.

### Finding A03-2: innerHTML in QEPanelProvider Without Escaping (MEDIUM)

**File**: `v2/src/edge/vscode-extension/src/views/QEPanelProvider.ts` (lines 737-772)

```typescript
functionListEl.innerHTML = analysis.functions.map(f => { ... }).join('');
suggestionsEl.innerHTML = analysis.suggestions.slice(0, 5).map(s => `...`).join('');
```

**Remediation**: Use the VS Code webview toolkit or sanitize all dynamic content before setting `innerHTML`.

### Finding A03-3: Command Injection via execSync Pattern (MEDIUM)

**Files**:
- `v3/src/init/enhancements/claude-flow-adapter.ts` (lines 101-286)
- `scripts/fetch-content.js` (line 156)
- `.claude/helpers/statusline.js` (lines 53-54, 175-213)

Multiple `execSync()` calls with shell strings. Currently hardcoded (not user-controlled), but fragile.

**Remediation**: Use `spawn()` with argument arrays instead of `execSync()` with shell strings.

### Positive Findings

- **Safe Expression Evaluator** (`v3/src/shared/utils/safe-expression-evaluator.ts`): Custom evaluator replaces `eval()` and `new Function()` with a restricted tokenizer/parser.
- **Safe JSON Parser** (`v3/src/shared/safe-json.ts`): Uses `secure-json-parse` with `protoAction: 'remove'` and `constructorAction: 'remove'`.

---

## A04:2021 - Insecure Design

### Finding A04-1: No Rate Limiting on API Endpoints (HIGH)

**Files**:
- `v2/src/visualization/api/RestEndpoints.ts`
- `v2/src/edge/server/index.ts`

Neither server implements rate limiting. `.env.example` defines `RATE_LIMIT_WINDOW` and `RATE_LIMIT_MAX` but no code reads or enforces them. The agent spawn endpoint is especially dangerous without rate limiting.

**Remediation**: Add `express-rate-limit` middleware. For agent spawn, add stricter limits (e.g., 10 requests per minute).

### Finding A04-2: No Input Validation on Agent Spawn Request (MEDIUM)

**File**: `v2/src/edge/server/index.ts` (lines 153-171)

Only basic presence checks on `agentType` and `task`. No validation of agentType against allowed types, no length limits, no content sanitization.

**Remediation**: Validate `agentType` against allowed list. Add length limits using Zod or Joi.

---

## A05:2021 - Security Misconfiguration

### Finding A05-1: CORS Wildcard in Mock/Test Servers (LOW)

**Files**: `v2/tests/n8n/mock-n8n-server.ts` (line 384), `v2/tests/n8n/n8n-agent-test-suite.test.ts` (line 83)

```typescript
res.setHeader('Access-Control-Allow-Origin', '*');
```

**Severity**: LOW (test code only)

### Finding A05-2: Server Binds to 0.0.0.0 by Default (MEDIUM)

**File**: `v2/src/edge/server/index.ts` (line 62)

```typescript
host: '0.0.0.0',  // Listens on all interfaces
```

Especially dangerous combined with the lack of authentication.

**Remediation**: Default to `127.0.0.1` for development.

### Finding A05-3: Error Messages May Expose Internal Details (LOW)

**File**: `v2/src/visualization/api/RestEndpoints.ts` (lines 207-214)

```typescript
res.status(statusCode).json({
  success: false,
  error: err.message,  // Raw error message exposed to client
});
```

**Remediation**: Return generic error messages in production.

### Finding A05-4: Missing Security Headers on API Servers (MEDIUM)

Neither server sets HSTS, X-Content-Type-Options, X-Frame-Options, or CSP headers. No `helmet` middleware used.

**Remediation**: Add `helmet` middleware to all Express servers.

### Finding A05-5: No CSRF Protection on State-Changing Endpoints (MEDIUM)

**File**: `v2/src/edge/server/index.ts` (lines 153, 210)

POST and DELETE endpoints have no CSRF protection.

**Remediation**: Implement CSRF tokens or use `SameSite` cookie attributes with Origin validation.

---

## A06:2021 - Vulnerable and Outdated Components

### Finding A06-1: 24 Known Dependency Vulnerabilities (CRITICAL)

`npm audit` reports **24 vulnerabilities** (20 high, 3 moderate, 1 low):

| Package | Severity | Issue |
|---------|----------|-------|
| `sqlite3` (via agentdb) | HIGH | Known vulnerabilities in native bindings |
| `minimatch` (multiple) | HIGH | ReDoS vulnerability |
| `ajv` | MODERATE | ReDoS with `$data` option |
| `eslint` (and ecosystem) | HIGH | Multiple transitive vulnerabilities |
| `glob` | HIGH | Via minimatch |
| `rimraf` | HIGH | Via glob |
| `cacache` | HIGH | Transitive |
| `node-gyp` | HIGH | Transitive via sqlite3 |

**Remediation**:
1. Run `npm audit fix` for auto-fixable vulnerabilities
2. Update `eslint` to v9+ (flat config)
3. Migrate from `sqlite3` to `better-sqlite3` (already primary in v3)
4. Pin `minimatch` to `>=5.0.0` via resolutions/overrides

---

## A07:2021 - Identification and Authentication Failures

### Finding A07-1: JWT Default Algorithm is HS256 (LOW)

**File**: `v3/src/adapters/a2a/auth/jwt-utils.ts` (line 173)

HS256 requires sharing the signing secret with all verifiers, increasing attack surface.

**Remediation**: For multi-service deployments, prefer RS256 or ES256 with asymmetric keys.

### Finding A07-2: No Password Policy Enforcement (INFO)

Application relies on API key/JWT authentication rather than username/password. Acceptable if no user-facing password flows exist.

---

## A08:2021 - Software and Data Integrity Failures

### Finding A08-1: CI/CD Pipeline Uses OIDC for npm Publishing (POSITIVE)

**File**: `.github/workflows/npm-publish.yml` (lines 14-17) — Uses OIDC-based npm trusted publishing. No NPM_TOKEN secret needed.

### Finding A08-2: GitHub Actions Use Pinned Major Versions (LOW)

Actions use `@v4` tags instead of full SHA pinning.

**Remediation**: Consider pinning to full commit SHAs for maximum supply chain security.

### Finding A08-3: Docker Image Uses Moving Tag (LOW)

**File**: `Dockerfile` — Uses `node:18-alpine` (moving target).

**Remediation**: Use digest-pinned images (e.g., `node:18-alpine@sha256:...`).

---

## A09:2021 - Security Logging and Monitoring Failures

### Finding A09-1: Excessive console.log Usage (MEDIUM)

**Scope**: `v3/src/` (326 files, 2,980 occurrences)

No structured logging or secret redaction. `TaskAuditLogger` exists but limited in scope.

**Remediation**: Replace with structured logger supporting log levels and redaction.

### Finding A09-2: No Security Event Alerting System (MEDIUM)

No alerting for failed auth attempts, unusual agent spawning, or unauthorized access attempts.

**Remediation**: Implement security event alerting (SIEM or webhook-based).

---

## A10:2021 - Server-Side Request Forgery (SSRF)

### Finding A10-1: Web Content Fetcher with User-Influenced URLs (HIGH)

**File**: `v3/src/integrations/browser/web-content-fetcher.ts`

Accepts URLs and fetches them with no internal IP blocking or domain allowlist.

**Remediation**:
1. Validate URLs against an allowlist of permitted domains/protocols
2. Block internal IP ranges (127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.169.254)
3. Use DNS resolution validation to prevent DNS rebinding

---

## Positive Security Practices Found

| Practice | Location |
|----------|----------|
| Safe JSON parser (prototype pollution protection) | `v3/src/shared/safe-json.ts` |
| Safe expression evaluator (no eval/Function) | `v3/src/shared/utils/safe-expression-evaluator.ts` |
| JWT auth middleware with scope validation | `v3/src/adapters/a2a/auth/middleware.ts` |
| OIDC-based npm trusted publishing | `.github/workflows/npm-publish.yml` |
| Gitleaks secret scanning config | `v3/.gitleaks.toml` |
| SQL table name validation | `v3/src/kernel/unified-memory.ts:380` |
| No .env files or private keys committed | `.gitignore` properly configured |
| Docker non-root user | `Dockerfile` |
| CSP headers in VSCode webview | VSCode extension |

---

## Severity Summary by OWASP Category

| Category | Critical | High | Medium | Low | Info |
|----------|----------|------|--------|-----|------|
| A01 - Broken Access Control | 0 | 1 | 1 | 1 | 0 |
| A02 - Cryptographic Failures | 0 | 1 | 1 | 0 | 2 |
| A03 - Injection | 0 | 0 | 3 | 0 | 0 |
| A04 - Insecure Design | 0 | 1 | 1 | 0 | 0 |
| A05 - Security Misconfiguration | 0 | 0 | 3 | 2 | 0 |
| A06 - Vulnerable Components | 1 | 0 | 0 | 0 | 0 |
| A07 - Auth Failures | 0 | 0 | 0 | 1 | 1 |
| A08 - Integrity Failures | 0 | 0 | 0 | 2 | 0 |
| A09 - Logging Failures | 0 | 0 | 2 | 0 | 0 |
| A10 - SSRF | 0 | 1 | 0 | 0 | 0 |
| **Total** | **1** | **4** | **12** | **6** | **3** |

---

## Top 5 Remediation Priorities

1. **CRITICAL**: Run `npm audit fix` and update vulnerable dependencies (sqlite3, minimatch, eslint)
2. **HIGH**: Add authentication middleware to all v2 REST API endpoints (reuse v3 JWT middleware)
3. **HIGH**: Implement rate limiting on all API servers, especially agent spawn
4. **HIGH**: Add URL validation and SSRF protection to web content fetcher
5. **MEDIUM**: Add `helmet` middleware for security headers on all Express servers

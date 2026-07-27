# ADR-0007: Static deployment on Netlify

- **Status:** Accepted
- **Date:** 2026-07-27
- **Deciders:** Architecture swarm

## Context

The user requires Netlify hosting. ADR-0004 already removed the need for a backend, so the question is not *whether* a static deployment works but how to configure it so the guarantees the rest of the architecture depends on are actually enforced in production.

## Decision

Deploy as a **pure static site**: `npm run build` → `dist/` → Netlify CDN. No Netlify Functions, no Edge Functions, no environment variables, no secrets, no build plugins.

`netlify.toml` carries four things that matter:

1. **SPA redirect** — `/*` → `/index.html` (200), so client routing survives a page refresh on a deep link.
2. **Content-Security-Policy** — `connect-src 'self'` is load-bearing: it makes NFR-5 (zero egress of bulletin content) a browser-enforced property rather than a code-review promise. `worker-src 'self' blob:` and `script-src 'wasm-unsafe-eval'` are required by pdf.js, which instantiates its worker from a blob URL and uses WebAssembly. `object-src 'none'`, `frame-ancestors 'none'`, and `form-action 'none'` close the obvious remaining holes.
3. **Immutable caching** for `/assets/*` — content-hashed by Vite, so a year-long max-age is safe and makes repeat loads instant on a bad connection.
4. **Pinned Node 22** for reproducible builds.

Deploy previews on pull requests give a reviewable URL per change.

## Consequences

**Positive**

- Free tier is sufficient: no compute, no bandwidth concerns for a tool with a small user base.
- Nothing to operate. No servers, no certificates, no patching, no on-call.
- Global CDN gives good latency from Assam without any configuration.
- Rollback is instant and atomic — a one-click revert to a previous deploy, which matters if a bad extraction ships during an active flood.
- The CSP turns the central privacy claim into something a user can verify by reading a response header.

**Negative**

- No server-side rendering, so first paint waits on the JS bundle. Mitigated by code-splitting pdf.js and recharts out of the initial chunk (NFR-4: < 300 KB gzipped excluding the pdf.js worker).
- No scheduled jobs, so bulletins cannot be fetched automatically from ASDMA. Users load PDFs manually. **This is a genuine product limitation, not merely a technical one** — see the feasibility assessment for the automation options that would lift it.
- Netlify-specific config. Mitigated by there being very little of it: the app is plain static files and moves to any CDN in minutes.

## Alternatives considered

- **Netlify Functions for server-side parsing.** Rejected under ADR-0004: forfeits offline operation.
- **GitHub Pages.** Rejected: no custom response headers, so the CSP could only be a `<meta>` tag — weaker, and `frame-ancestors` does not work in meta at all.
- **Vercel / Cloudflare Pages.** Equivalent technically. Netlify chosen because the user asked for it; the app is portable if that changes.

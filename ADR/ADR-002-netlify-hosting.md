# ADR-002: Hosting Platform — Netlify + GitHub

**Status**: Accepted  
**Date**: 2026-04-22  
**Deciders**: Mondweep, Claude  

## Context

The tutorial needs a hosting platform that:
1. Is free/low-cost (bootstrapped project)
2. Supports automatic deploys (push code → live site)
3. Allows custom domains (future: ai-safety-tutorial.com)
4. Works with static sites (MDX generates HTML)
5. Has good performance (fast page loads)
6. Provides analytics (track engagement)

## Decision

**Host the tutorial on Netlify with GitHub as the source repository.**

### Architecture
```
Local Development
       ↓ (git push)
GitHub Repository (mondweep/vibe-cast, branch: tutorial-system)
       ↓ (webhook trigger)
Netlify Build Server (runs: npm run build)
       ↓ (generates HTML)
Netlify CDN (edge locations globally)
       ↓
Users: https://ai-safety-tutorial.netlify.app
```

## Rationale

1. **Free tier unlimited**
   - No cost to host unlimited sites
   - Perfect for public educational content
   - Upgrade options available if needed (analytics, team features)

2. **Automatic deploys**
   - Push to GitHub → Netlify builds & deploys automatically
   - No manual FTP/SSH needed
   - Fast feedback loop: commit → live in 30-60 seconds

3. **Git integration**
   - Single source of truth in GitHub
   - Full version control and audit trail
   - Easy rollback if something breaks

4. **Performance**
   - CDN with edge servers globally
   - Sub-500ms page loads typical
   - Automatic image optimization

5. **Analytics built-in**
   - See traffic, bounce rates, user flow
   - No third-party tracking tool needed

6. **Preview deploys**
   - Every pull request gets a preview URL
   - Reviewers can see changes before merge
   - Example: `https://pr-42--ai-safety-tutorial.netlify.app`

7. **Custom domains**
   - Free to add custom domain later
   - Example: `tutorial.mondweep.com`
   - HTTPS automatic (Let's Encrypt)

## Alternatives Considered

### GitHub Pages
- ✅ Free, integrated with GitHub
- ❌ Slower builds (~2-3 min)
- ❌ Limited environment variables
- ❌ No preview deploys for PRs
- Decision: Netlify is more developer-friendly

### Vercel
- ✅ Excellent performance, great DX
- ✅ Similar feature set to Netlify
- ❌ Startup-focused (might add costs in future)
- Decision: Netlify is more stable for long-term educational content

### AWS S3 + CloudFront
- ✅ Very cheap (~$1/month)
- ❌ Complex to set up
- ❌ Manual deploy process
- ❌ No built-in analytics
- Decision: Too much ops overhead for content team

### Self-hosted (VPS)
- ✅ Full control
- ❌ Requires server maintenance
- ❌ Pay for uptime (~$5-10/month)
- ❌ No auto-scaling (will slow down if traffic spikes)
- Decision: Not scalable for educational content

## Consequences

### Positive ✅
- **Zero cost** to launch
- **Fast feedback**: changes live in 30 seconds
- **Reliable**: Netlify handles scaling, uptime, security
- **Analytics**: Built-in view of who uses the tutorial
- **Upgrade path**: Can add custom domain, team collaboration, etc.
- **No lock-in**: Can migrate to GitHub Pages or anywhere else (static files)

### Negative / Constraints ⚠️
- **Build times**: 2-3 minutes per deploy (acceptable for content changes)
- **Dependent on Netlify uptime**: If Netlify is down, site is down (99.9% SLA)
- **Limited customization**: Some advanced features require paid plan
- **GitHub required**: Must use GitHub (not Gitea, GitLab, etc.)

## Implementation Plan

### Setup (Day 1 of Phase 0)
1. Create `netlify.toml` in project root (build instructions)
2. Create `package.json` with dependencies (Astro, Tailwind, etc.)
3. Create GitHub webhook secret in Netlify
4. Push to GitHub → Netlify auto-deploys

### Configuration
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"
  NPM_VERSION = "10"

[[redirects]]
  from = "/docs/*"
  to = "/404.html"
  status = 404

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "SAMEORIGIN"
```

### Monitoring
- Netlify Analytics: See traffic per page
- Google Analytics (optional, Phase 2): Track user behavior
- Performance: Lighthouse score >90

## Related Decisions
- ADR-001: MDX format (requires static site generation)
- ADR-003: Modular lessons (each module = separate page)
- ADR-004: TDD assessments (assessments.json validates content)

## References
- [Netlify Documentation](https://docs.netlify.com/)
- [Netlify SLA & Uptime](https://www.netlify.com/legal/sla/)
- [Deploy preview docs](https://docs.netlify.com/site-deploys/overview/#deploy-previews)

# Architecture Decision Record (ADR)
## NavierStokes Interactive Learning Platform - Technical Architecture

**Decision Date**: 2026-09-09  
**Author**: Architecture Team  
**Status**: Proposed  
**Revisions**: 1.0  

---

## 1. Overview & Context

The NavierStokes Learning Platform requires real-time interactive fluid dynamics simulations, animated visualizations, and assessment systems running in the browser. The architecture must balance:
- **Performance**: 60 FPS animations, sub-100ms simulation updates
- **Accessibility**: Works on mid-range devices and tablets
- **Cost**: Minimal backend compute (learner-generated content is minimal)
- **Scalability**: Handle thousands of concurrent learners
- **Maintainability**: Clean separation of concerns for independent feature development

---

## ADR-001: Frontend Framework Selection

### Decision
**Use React 19 + TypeScript with Vite as build toolchain**

### Alternatives Considered
1. **Vue 3** - Simpler learning curve, excellent animation support (Pinia state)
2. **Svelte 5** - Smallest bundle size, reactive by default, poor ecosystem for scientific visualization
3. **Astro + Islands** - Static site with interactive islands (heavyweight for real-time sims)
4. **Plain Web Components + Lit** - Maximum control, verbose, harder to manage state

### Rationale
- React's ecosystem dominates for data visualization (D3, Three.js integration)
- TypeScript catches visualization bugs early (type-safe shader parameters, animation props)
- Vite provides fast dev iteration (HMR in <100ms) critical for animation tuning
- Proven community for educational applications (Storybook, accessible component libraries)
- Component encapsulation ideal for modular lessons and sandboxed simulators

### Consequences
- **Positive**: Rich ecosystem, excellent debugging tools, large hiring pool
- **Positive**: React docs + testing libraries (React Testing Library) are gold standard
- **Negative**: Bundle size (~40-50 KB gzipped + dependencies), requires optimization
- **Negative**: Higher boilerplate than Vue/Svelte for simple components

### Validation
- Benchmark React + Three.js rendering at target resolution (512x512 simulation grid)
- Confirm <50ms frame time on target device (MacBook Air 2020)

---

## ADR-002: 3D/2D Visualization Library

### Decision
**Primary: Three.js (3D scenes, GPU-accelerated rendering) + D3.js (2D data viz, SVG diagrams)**

### Alternatives Considered
1. **Babylon.js** - Excellent docs, similar performance to Three.js, smaller community
2. **Canvas API alone** - Lightweight but laborious for complex scenes
3. **Cesium.js** - Overkill, designed for geospatial data
4. **Plotly.js** - High-level but not ideal for interactive control of every pixel

### Rationale
- **Three.js**: Industry standard for WebGL. Rich ecosystem (materials, lighting, post-processing).
  - Fluid velocity fields rendered as particle systems or deformed meshes
  - Pressure fields as colored surface overlays
  - Clean separation of scene (Three.js) from control (React)
- **D3.js**: Unmatched for data-driven visualization and axis/legend control.
  - Equation annotations that scale with narrative
  - Interactive parameter sliders with data binding
  - Real-time graph updates (drag force vs. Reynolds number)

### Consequences
- **Positive**: Mature, battle-tested, extensive online tutorials
- **Positive**: Three.js WebGLRenderer is GPU-accelerated; runs at 60 FPS on older devices
- **Negative**: Large bundle (~800 KB Three.js + dependencies)
- **Negative**: Steep learning curve for advanced materials (particle systems, shaders)
- **Mitigation**: Code-split visualization modules; lazy-load Three.js only when needed

### Validation
- Profile bundle size after tree-shaking: target <1 MB total gzipped (HTML + CSS + JS)
- Benchmark 3D particle rendering: 100K+ particles at 60 FPS on Pixel 5 (mid-range Android)

---

## ADR-003: Numerical Solver & Simulation Engine

### Decision
**Primary solver in WebAssembly (Rust), fallback to precomputed solutions**

- **Rust crate**: `navier-stokes-wasm` (custom 2D incompressible solver)
- **Algorithm**: Semi-implicit finite difference scheme (stable, fast convergence)
- **Grid resolution**: 256×256 or 128×128 (user-selected for mobile)
- **Timestep**: Fixed Δt ≤ 0.01 s (CFL condition respected)

### Alternatives Considered
1. **JavaScript solver (pure)** - Simple, no compilation, 10× slower
2. **Server-side solver** - Accurate, scales to 3D, adds latency (network round-trip ~100ms)
3. **Precomputed solutions only** - No interactivity, limited parameter space
4. **TensorFlow.js** - Excellent for ML but overkill for PDE solver

### Rationale
- **WebAssembly** strikes balance: ~20× faster than JS, <100ms compile time, runs in worker thread
- **Incompressible assumption** (∇·u = 0 enforced) simplifies solver, critical for learner intuition
  - Learners adjust pressure, not density (more intuitive)
- **Pressure-Poisson solver** (iterative) converges in 20-30 iterations per step
- **Worker thread isolation** keeps UI responsive during heavy simulation
- **Fallback to precomputed** ensures app works if WASM fails (graceful degradation)

### Consequences
- **Positive**: 2D simulations run at 30-60 FPS on mid-range hardware
- **Positive**: Learners see immediate feedback (<50ms latency) to parameter changes
- **Negative**: 2D only; 3D impossible in browser (deferred to Phase 3+ via backend API)
- **Negative**: WebAssembly compilation adds ~500 ms to first simulation load
- **Mitigation**: Lazy-load WASM module; show "preparing simulation..." spinner

### Validation
- Validate solver against analytical solutions (Poiseuille flow, Taylor-Green vortex)
- Benchmark convergence: Poisson iteration count vs. grid resolution
- Smoke-test on Safari (WASM support can be quirky on iOS)

---

## ADR-004: State Management

### Decision
**React Context API + Zustand for simulation state, URL for learner progress**

### Alternatives Considered
1. **Redux** - Overkill for this domain, verbose boilerplate
2. **Zustand alone** - Perfect state management, but React Context for DI (teacher assessment scripts)
3. **MobX** - Excellent for observable state, less popular in React education space
4. **Jotai** - Minimal, atomic state model, but fewer examples in education apps

### Rationale
- **Zustand**: Simple store (JSON-like) for simulation parameters and results
  - Example: `{ viscosity: 0.01, pressure_gradient: 1.0, vx_field: Float32Array(...) }`
  - Instant state replay (save/restore via URL query params or localStorage)
- **React Context**: Dependency injection for:
  - Module configuration (which simulators are active?)
  - Assessment context (what's the learner's current score?)
  - Educator mode (show hints, timing overlays?)
- **URL state**: Shareable links (`?module=3&difficulty=hard`) for collaboration and bookmarking

### Consequences
- **Positive**: Minimal overhead; Context + Zustand is ~5 KB gzipped
- **Positive**: Learner can share simulation state via URL
- **Negative**: Manual serialization for simulation grids (Float32Array → base64 for URL)
- **Negative**: Context re-renders can be inefficient; must memoize aggressively

### Validation
- Measure Context re-render overhead: target <16ms per re-render (60 FPS)
- Test URL serialization: confirm all sim states round-trip (serialize → URL → deserialize)

---

## ADR-005: Animation & Narrative Flow

### Decision
**Framer Motion for component animations + Intersection Observer API for scroll-triggered events**

### Alternatives Considered
1. **GSAP (GreenSock)** - Industry standard, most powerful, $99/year commercial license
2. **Animate.css** - Lightweight, CSS-based, limited to predefined transitions
3. **React Spring** - Physics-based animation, excellent for natural motion, high learning curve
4. **Custom CSS Transitions** - Lightweight, limited to simple tweens

### Rationale
- **Framer Motion**: Declarative animations in React; layout animations "just work"
  - Example: Parallax scrolling via `motion.div` with `whileInView`
  - Equation annotations slide in as learner scrolls to them
  - No GSAP license fee (MIT licensed)
- **Intersection Observer**: Native API for scroll-triggered events
  - Triggers simulation start only when visible (performance optimization)
  - Fires analytics events (learner reached Module 5)
  - No external library needed

### Consequences
- **Positive**: Smooth, GPU-accelerated animations; 60 FPS on mid-range devices
- **Positive**: Minimal bundle overhead (~30 KB gzipped)
- **Negative**: Custom spring physics require tuning (damping, stiffness)
- **Negative**: Complex nested animations can be hard to orchestrate

### Validation
- Profile animation frame time: target <16ms per frame (60 FPS)
- Test scroll performance: confirm 60 FPS during parallax scroll with active simulations

---

## ADR-006: Assessment & Knowledge Tracking

### Decision
**Client-side scoring for formative assessments; backend validation for summative grades**

### Assessment Flow
1. **Formative** (low stakes, immediate feedback):
   - Concept mapping, predictive challenges scored in browser
   - Instant feedback: "Correct! Viscous forces dominate at low Re."
   - No backend call needed (instant gratification)

2. **Summative** (high stakes, final evaluation):
   - Free-form real-world analysis (LLM eval on backend)
   - Parameter tuning challenges (uploaded solution graded server-side)
   - Authenticated submissions signed with learner ID

### Alternatives Considered
1. **All client-side** - No cheating detection, no persistent record
2. **All server-side** - Laggy feedback, complex backend orchestration
3. **Hybrid**: Client formative + server summative - Best of both worlds

### Rationale
- **Client formative**: Instant feedback keeps learner engaged (psychological principle)
- **Server summative**: Prevents cheating (for educator use), creates grading record
- **Separation of concerns**: Assessment library (client) independent of backend

### Consequences
- **Positive**: Smooth UX; learner sees feedback <100ms
- **Positive**: Educator can see grading history and trends
- **Negative**: Backend adds latency for summative grades (~1-2 sec round-trip)
- **Negative**: Must validate client scores on server (prevent tampering)

### Validation
- Implement server validation for parameter-tuning solutions (compare learner solution vs. gold standard)
- Design LLM prompt for free-form real-world analysis (few-shot examples required)

---

## ADR-007: Backend Architecture

### Decision
**Lightweight Node.js/Express API + Google Cloud Run (serverless containers)**

### Endpoints
- `POST /api/assessments/submit` - Validate & grade summative assessments
- `POST /api/sessions/save` - Persist learner progress (checkpoint)
- `GET /api/sessions/:id/transcript` - Retrieve learning transcript (for educators)
- `POST /api/feedback` - Collect learner feedback (what was confusing?)

### Alternatives Considered
1. **Monolithic backend** (Django, Rails) - Overkill; most logic in frontend anyway
2. **Firebase/Firestore** - Great for real-time collab, but overkill for this use case
3. **Serverless functions only** (Cloud Functions) - Fine, but API Gateway overhead adds latency
4. **Static site only** (no backend) - Possible but limits educator features, persistence

### Rationale
- **Node.js/Express**: Lightweight, fast startup (critical for serverless cold starts <1s)
- **Cloud Run**: Scales to zero (only pay for active requests), integrates with Cloud Storage for assets
- **Minimal backend**: 95% of logic runs client-side (simulations, animations, formative assessments)
- **Stateless design**: Easy to scale horizontally; each request independent

### Consequences
- **Positive**: Scales automatically; pay only for traffic
- **Positive**: Easy to add persistence (Cloud Datastore, Firestore) later
- **Negative**: Cold start latency ~1-2 sec on first request after idle period
- **Mitigation**: Keep-alive requests every 5 min to warm container

### Validation
- Benchmark Cloud Run deployment: confirm cold start < 2 sec, warm start < 100 ms
- Load test with 100 concurrent learners; confirm no 5xx errors

---

## ADR-008: Data Persistence & Analytics

### Decision
**Google Cloud Firestore for learner sessions + Cloud Storage for simulation checkpoints**

### Data Model
```
/learners/{userId}
  /sessions/{sessionId}
    - module_id: string
    - created_at: timestamp
    - updated_at: timestamp
    - completed_modules: string[]
    - assessment_results: {
        test_id: string,
        score: number,
        submitted_at: timestamp
      }[]

/simulations/{sessionId}
  - state: string (base64-encoded Float32Array)
  - parameters: { viscosity, pressure_gradient, ... }
  - created_at: timestamp
```

### Alternatives Considered
1. **Google BigQuery** - Overkill for early stage; excellent for analytics later
2. **PostgreSQL** - Heavy; serverless doesn't work well with persistent connections
3. **MongoDB Atlas** - Document DB like Firestore but higher ops overhead
4. **localStorage only** - Adequate for MVP, doesn't survive device swap

### Rationale
- **Firestore**: Integrates seamlessly with Cloud Run, automatic scaling, real-time listeners
- **Cloud Storage**: Cheap blob storage for large simulation checkpoints (grids as binary files)
- **Automatic backup**: Google handles daily backups; GDPR-compliant deletion policies
- **No ORM overhead**: Direct JSON document storage

### Consequences
- **Positive**: Minimal backend code (Firestore libraries handle schema validation)
- **Positive**: Real-time listeners enable collaborative learning (Phase 3)
- **Negative**: Firestore costs scale with document reads; must index wisely
- **Mitigation**: Aggregate assessment results server-side (batch read, cache)

### Validation
- Calculate estimated Firestore costs: ~$0.06 per 100K document reads
- Design indexes: module_id, completed_modules, created_at

---

## ADR-009: Accessibility & Internationalization

### Decision
**WCAG 2.1 AA compliance (no exceptions); i18n framework for future localization**

### Accessibility Requirements (Non-negotiable)
- **Semantic HTML**: Proper heading hierarchy, ARIA landmarks
- **Keyboard Navigation**: Full feature accessibility via keyboard (no mouse required)
- **Color Contrast**: 4.5:1 ratio text/background, accessible color palettes (colorblind-safe)
- **Screen Reader Support**: All interactive elements have descriptive `aria-label`
- **Alt Text**: Every visualization has plain-language alt text
- **Motion**: Reduced-motion media queries respect user preferences (no flashing)
- **Testing**: Automated (axe, Lighthouse CI) + manual (NVDA, JAWS)

### Internationalization (i18n)
- **Framework**: `next-i18next` / `react-i18next`
- **Initial languages**: English (production), Spanish & Mandarin (planned)
- **Equations**: MathJax renders unchanged across languages; narrative text localized
- **Datasets**: Some simulations region-specific (e.g., hurricane case study with local data)

### Rationale
- Fluid dynamics education spans worldwide; accessibility is ethical imperative
- Early i18n infrastructure (even if unused) prevents costly refactoring

### Consequences
- **Positive**: Reaches 15%+ additional audience (Spanish/Mandarin speakers)
- **Positive**: Demonstrates commitment to equity in STEM education
- **Negative**: Translation costs (~$1-2K per language per update cycle)
- **Negative**: Some concepts hard to translate (colloquial explanations)

### Validation
- Automated accessibility audit: target 100% Lighthouse Accessibility score
- Manual testing: confirm keyboard navigation for all interactive elements
- Screen reader testing: NVDA on Windows, VoiceOver on Mac/iOS

---

## ADR-010: Deployment & DevOps

### Decision
**Google Cloud Build (CI/CD) → Cloud Run (production), GitHub Actions for testing**

### Pipeline
1. **GitHub Actions** (on push):
   - Lint (ESLint, Prettier)
   - Unit tests (Jest)
   - E2E tests (Playwright)
   - Bundle size check (target <2 MB gzipped)

2. **Cloud Build** (on merge to `main`):
   - Build Docker image
   - Push to Artifact Registry
   - Deploy to Cloud Run (blue-green deployment)
   - Health checks (verify critical endpoints)
   - Smoke tests against staging

3. **Cloud Run Configuration**:
   - Region: `us-central1` (low latency for North American users)
   - Concurrency: 50 requests per container
   - Memory: 512 MB (sufficient for Node.js + simulations cache)
   - CPU: Allocated (not shared) for predictable performance
   - Timeout: 30 sec (simulations complete in <5 sec)

### Alternatives Considered
1. **Traditional VM (Compute Engine)** - Easier debugging, but manual scaling, higher cost
2. **App Engine** - Fully managed, but less container control
3. **GitHub Actions directly** - Simple, but limited resource scaling

### Rationale
- **Cloud Run**: Scales to zero; pay only for traffic (ideal for education traffic patterns: high during evenings/weekends)
- **Cloud Build**: Native integration with GitHub; automatic deployments on push
- **Blue-green**: Zero downtime during updates; instant rollback if issues

### Consequences
- **Positive**: No infrastructure management (Google handles OS patches, scaling)
- **Positive**: Extremely cost-effective for early stage (~$10-20/month)
- **Negative**: Billed per request (tiny overhead per API call ~$0.00002)
- **Negative**: Cold starts ~1-2 sec (mitigated by keep-alive)

### Validation
- Benchmark Cloud Run deployment: confirm <5 sec deploy time
- Load test: 1000 concurrent connections don't exceed rate limits
- Cost modeling: estimate monthly bill for 10K learners

---

## ADR-011: Browser Compatibility & Progressive Enhancement

### Decision
**Support modern browsers (Chrome 120+, Firefox 121+, Safari 17+, Edge 120+); graceful degradation for older browsers**

### Progressive Enhancement Strategy
1. **Core Experience** (works on all devices):
   - Read-only module content
   - Static visualizations (no animation)
   - Text-based assessments

2. **Enhanced Experience** (modern browsers):
   - Interactive simulations (WebAssembly)
   - Smooth animations (GPU acceleration)
   - Real-time feedback

3. **Unsupported** (graceful error):
   - Show fallback message: "Your browser doesn't support simulations. Use Chrome/Firefox/Safari."
   - Offer downloadable PDF workbook instead

### Alternatives Considered
1. **Single-browser support** - Unacceptable; excludes 20%+ of users
2. **Maximum compatibility** - Too much overhead; old browsers don't support WebAssembly anyway
3. **Progressive enhancement** - Best approach; works for everyone, enhanced for most

### Rationale
- **WebAssembly support**: IE11 unsupported, but <5% of STEM education traffic from IE (2026)
- **Mobile support**: iOS Safari important (30% of users); requires careful testing

### Consequences
- **Positive**: 95%+ of target users get full experience
- **Positive**: Easy to redirect IE users to static alternative
- **Negative**: Must maintain fallback paths (adds code complexity)

### Validation
- BrowserStack testing: confirm core experience works on Safari 16, Chrome 110, Firefox 118 (older edge cases)
- Lighthouse testing: separate audits for desktop vs. mobile (target 90+ on both)

---

## ADR-012: Security Architecture

> **⚠️ Superseded (authentication only)**: The Google OAuth authentication decision below was **not implemented** for the initial production deployment and has been superseded by **[ADR-016: Interim Local/Guest Authentication](#adr-016-interim-localguest-authentication)**. CORS, encryption-in-transit/at-rest, and the other provisions of this ADR are unaffected and remain in force.

### Decision
**API authentication via Google OAuth; CORS restricted to trusted origins; data encryption in transit (HTTPS) and at rest (Google-managed)**

### Security Model
- **No user passwords**: Google OAuth delegate authentication to Google (reduces credential phishing)
- **API authentication**: Bearer token (JWT signed by Cloud Run) included in requests
- **CORS**: Only allow requests from `navierstokes.app` and `localhost:3000` (dev)
- **Rate limiting**: 100 requests/minute per IP (prevents automated abuse)
- **Data encryption**: TLS 1.3 for transit; Firestore encryption at rest (default)
- **GDPR compliance**: Auto-delete user data after 1 year of inactivity

### Alternatives Considered
1. **Custom username/password** - More control, but higher phishing risk
2. **GitHub OAuth** - Familiar to developers, but less common for general education audience
3. **No authentication** - Simpler, but enables data tampering, assessment fraud

### Rationale
- **Google OAuth**: Industry standard, highly secure, users trust Google
- **Minimal backend auth logic**: Delegate to Google; we only verify JWTs

### Consequences
- **Positive**: Learners don't manage credentials; reduced account takeover risk
- **Positive**: GDPR + CCPA compliant data deletion
- **Negative**: Dependent on Google OAuth availability (extremely rare outages)
- **Mitigation**: Cache OAuth tokens on client; allow offline-mode read-only access

### Validation
- Security audit: penetration testing on API (check for SQL injection, XSS, CSRF)
- Rate limit testing: confirm 100 req/min limit enforced

---

## ADR-013: Testing Strategy (London School TDD)

### Decision
**Outside-in TDD: Test behavior first, then implementation. Separate test layers (unit, component, e2e, accessibility)**

### Test Pyramid
```
              ▲
             /  \  E2E Tests (5%)
            /    \  - Complete learner workflows
           /      \ - Simulation accuracy vs. literature
          /________\

          /        \  Component Tests (20%)
         / React   \  - Rendering, state changes, props
        /Components \  - Animations play on cue
       /__________  \ - Assessments grade correctly

      /             \ Unit Tests (75%)
     /  Business    \  - Utility functions
    / Logic, Utils   \ - Solver convergence
   /________________ \ - Assessment scoring

   (Base = Test Infrastructure & Fixtures)
```

### Key Test Files
- **`src/__tests__/modules/Module1.test.tsx`**: Does Module 1 render correctly? Do interactives work?
- **`src/__tests__/simulators/NavierStokes2D.test.ts`**: Does solver converge on analytical solutions?
- **`src/__tests__/assessments/ConceptMapping.test.ts`**: Does grading logic work for all answer types?
- **`e2e/learner-journey.spec.ts`**: Can a complete learner finish the app without errors?

### Rationale
- **Outside-in**: Write behavior test first; implement code to pass it
  - Example: Test states "Learner can drag on canvas and see velocity field update within 50ms"
  - Then implement the canvas drag handler, field solver, visualization
- **High test coverage** (>80%): Prevents regressions; documents expected behavior
- **Accessibility tests**: Built into component tests (ARIA attributes verified)

### Consequences
- **Positive**: Tests document product requirements (living specification)
- **Positive**: Confident refactoring; know immediately if you break something
- **Negative**: TDD requires discipline; slow at first, fast after ramp-up
- **Negative**: Hard to test animation timing (requires patience, creative mocking)

### Validation
- Measure test coverage: target 80%+ lines, 100% critical paths
- Benchmark test runtime: full suite completes in <2 minutes

---

## ADR-014: Performance Optimization & Monitoring

### Decision
**Client-side performance budgets (3 sec interactive time), server-side monitoring (Google Cloud Trace)**

### Performance Budgets
- **First Contentful Paint (FCP)**: < 1.5 sec (50th percentile)
- **Largest Contentful Paint (LCP)**: < 2.5 sec (75th percentile)
- **Cumulative Layout Shift (CLS)**: < 0.1 (no jarring layout shifts)
- **Time to Interactive (TTI)**: < 3 sec
- **Simulation Response Time**: < 50 ms latency to parameter change

### Monitoring & Alerts
- **Google Cloud Monitoring**: CPU, memory, error rates on Cloud Run
- **Lighthouse CI**: Automated budgets on every PR (prevent performance regressions)
- **Real User Monitoring (RUM)**: Send metrics to Cloud Logging (Core Web Vitals)
- **Error tracking**: Rollbar or Sentry for JavaScript errors

### Optimization Tactics
- **Code splitting**: Lazy-load simulation modules (only load when needed)
- **Memoization**: Prevent unnecessary React re-renders (React.memo, useMemo)
- **Service Worker**: Cache static assets, enable offline reading (no simulations offline)
- **Image optimization**: WebP with JPEG fallback; SVG for icons
- **Bundle analysis**: Periodic audit with `webpack-bundle-analyzer`

### Rationale
- **Performance budgets**: Make trade-offs explicit (don't bloat the app unintentionally)
- **RUM**: Real users matter; synthetic lab testing misses device & network variance
- **Alerts**: Catch performance regressions before deployment

### Consequences
- **Positive**: Learners with slow connections have acceptable experience
- **Positive**: Proactive detection of issues (alerting prevents silent failures)
- **Negative**: Optimization is ongoing work (not one-time task)
- **Negative**: RUM adds small overhead (~1 KB payload per visit)

### Validation
- Measure Core Web Vitals on real devices (Pixel 5, iPhone 12, MacBook Air)
- Simulate slow networks (3G, LTE) and verify acceptable experience

---

## ADR-015: Licensing & Data Ownership

### Decision
**Educational content: CC-BY-NC-SA 4.0 (free for education, non-commercial); Code: MIT License; Data: User-owned**

### Rationale
- **CC-BY-NC-SA for content**: Educators can remix for their classrooms; prevents commercial exploitation
- **MIT for code**: Encourages contributions and forks (Raspberry Pi educational projects, etc.)
- **User data ownership**: Learners own their assessment records; can export anytime

### Licensing Detail
- **Exceptions**: Simulation visualizations (Three.js, D3.js) remain under their original licenses (MIT, GPL)
- **Attribution**: "NavierStokes Learning Platform" + link to project required on remixed content
- **Commercial exceptions**: Educators at for-profit institutions can use (non-commercial = no tuition model)

### Consequences
- **Positive**: Clear permissions for educators; no licensing confusion
- **Positive**: Encourages open-source contributions
- **Negative**: For-profit EdTech companies can't directly commercialize (but can fork + write new content)

### Validation
- Confirm licenses in all `package.json` dependencies
- Add LICENSES.md file documenting all third-party licenses

---

## ADR-016: Interim Local/Guest Authentication

**Decision Date**: 2026-09-09
**Status**: Decided (interim) — **Supersedes ADR-012's authentication provisions only**

### Context
During the initial deployment of the platform to Cloud Run (project `e-vidhayak`), the "Sign in" button shipped as a non-functional UI stub — it had no click handler, and no Firebase Authentication configuration existed on the GCP project (no Identity Platform config, no Google sign-in provider enabled, no registered Firebase Web App). ADR-012 had already specified Google OAuth as the authentication mechanism, but that work was never actually carried out, so nobody could get past the login screen to reach any course content.

Implementing real Google Sign-In requires several steps beyond application code: initializing Firebase Authentication for the project, enabling Google as a sign-in provider, registering a Firebase Web App to obtain client SDK credentials, configuring authorized domains for each deployed frontend URL, and wiring the frontend to attach ID tokens to backend requests verified by the existing `verifyFirebaseToken` middleware. Some of these are one-time console/API setup steps outside the application codebase itself.

Given the immediate need to unblock access to course content, the team chose a fast interim path over the full OAuth implementation.

### Decision
**Use the frontend's existing local, unauthenticated session logic (`useLearnerStore().loginUser`) as the "Sign in" action, instead of Google OAuth, until real Google Sign-In is implemented.**

Clicking "Sign in" creates a local Zustand-persisted session with a generated guest ID (`guest_<timestamp>`) and placeholder email/name — no identity is verified, and no credential ever leaves the browser.

### Alternatives Considered
1. **Implement full Google OAuth now** (per original ADR-012) — correct long-term answer, but blocks content access until Firebase Auth is provisioned end-to-end (GCP-side config + frontend/backend wiring); too slow for the immediate need.
2. **Leave the button non-functional** — status quo; content stays completely unreachable.
3. **Hardcode a single shared demo account** — no better than guest sessions, and implies false authentication.

### Rationale
- Unblocks learners immediately with a minimal, low-risk code change (one button handler).
- Reuses logic that already existed in `learner.ts` (`loginUser`), so no new state-management code was introduced.
- Keeps the real fix (Google OAuth) as a clearly scoped, separate follow-up rather than rushing an incomplete OAuth integration.

### Consequences
- **Positive**: Course content is reachable; no architectural work wasted (Firestore, backend session APIs, `verifyFirebaseToken` middleware all remain designed for real ID tokens and are unaffected).
- **Negative**: **No real authentication** — anyone can access the app as an anonymous guest; there is no way to verify identity, persist progress across devices/browsers, or protect the backend's `verifyFirebaseToken`-guarded routes (the frontend does not yet call them).
- **Negative**: Guest sessions are per-browser only (`localStorage` via Zustand `persist`), so progress is lost on a different device or cleared storage.
- **Negative**: Violates the "No user passwords... reduces credential phishing" and GDPR/CCPA data-deletion provisions of ADR-012, since there is no real user identity to apply them to.
- **Mitigation**: Treat this ADR as explicitly temporary. Re-open and implement ADR-012's Google OAuth decision before the platform handles any real learner data, assessment records, or multi-device progress tracking.

### Validation
- Manual check: clicking "Sign in" reaches the module content (done, 2026-09-09).
- Follow-up (tracked separately): implement Firebase Authentication + Google sign-in provider, register a Firebase Web App, and wire the frontend/backend to real ID tokens — at which point this ADR should be marked **Superseded** by the ADR that documents that implementation.

---

## Cross-Cutting Concerns

### Error Handling
- **Frontend**: Try-catch blocks on async simulation loads; graceful fallback to precomputed data
- **Backend**: Standard HTTP error codes (400 bad input, 401 unauthorized, 500 server error)
- **User-facing**: Plain-language error messages ("Simulation timed out. Try a simpler grid size.")

### Monitoring & Observability
- **Logs**: Structured JSON logs (Google Cloud Logging) for debugging
- **Traces**: Distributed tracing (Cloud Trace) to identify slow requests
- **Metrics**: Custom metrics (simulation convergence time, assessment completion rate)

### Documentation
- **Architecture docs**: This ADR
- **API docs**: OpenAPI/Swagger schema (auto-generated from code)
- **Developer guide**: Setup, build, deploy instructions (in README)
- **User guide**: Help section in-app + video tutorials (future)

---

## Decision Timeline & Dependencies

| ADR | Title | Status | Blocker | Verify By |
|-----|-------|--------|---------|-----------|
| 001 | Frontend Framework | **Decided** (React 19) | None | Week 1: Scaffold project |
| 002 | Visualization Libs | **Decided** (Three.js + D3) | ADR-001 | Week 2: Render static scene |
| 003 | Numerical Solver | **Decided** (Rust WASM) | ADR-001 | Week 3: Solver compiles & validates |
| 004 | State Management | **Decided** (Zustand + Context) | ADR-001 | Week 1: Implement simple store |
| 005 | Animation | **Decided** (Framer Motion) | ADR-001, 002 | Week 2: Parallax scrolling works |
| 006 | Assessment | **Proposed** | ADR-004 | Week 4: Client-side grading |
| 007 | Backend | **Decided** (Node.js + Cloud Run) | ADR-006 | Week 3: API deployed & reachable |
| 008 | Data Persistence | **Decided** (Firestore) | ADR-007 | Week 3: Sessions saved/restored |
| 009 | A11y & i18n | **Decided** | ADR-001, 002 | Week 2: a11y audit; Week 6: i18n framework |
| 010 | DevOps | **Decided** (Cloud Build + Run) | ADR-007 | Week 3: CI/CD pipeline operational |
| 011 | Browser Compat | **Decided** | ADR-001, 002, 003 | Week 4: BrowserStack testing |
| 012 | Security | **Superseded (auth only)** by ADR-016 (OAuth + CORS) | ADR-007 | Week 3: Security audit |
| 013 | Testing | **Decided** (London School TDD) | All | Week 1: Test infrastructure |
| 014 | Perf & Monitoring | **Decided** | ADR-010 | Week 4: Monitoring dashboards live |
| 015 | Licensing | **Decided** | None | Pre-launch: License headers in code |
| 016 | Interim Local/Guest Auth | **Decided (interim)** — supersedes ADR-012 auth | ADR-012 | Follow-up: implement real Google OAuth |

---

## Risk Mitigation

### High Risks
1. **WebAssembly compilation fails on some devices** → Fallback to precomputed solutions + analytics
2. **Numerical solver produces non-physical results** → Validate against Poiseuille flow, Taylor-Green vortex
3. **Performance bottleneck in simulation grid** → Profile with DevTools; optimize WASM hot path

### Medium Risks
1. **Screen reader users can't navigate simulations** → Dedicated testing with NVDA + VoiceOver
2. **Google Cloud costs exceed $500/month** → Auto-scaling limits, cache strategy review
3. **Learning outcomes don't improve** → Iterate based on pre/post assessments

### Low Risks
1. **GitHub Actions pipeline fails** → Keep manual deployment script as backup
2. **Third-party CDN (fonts, MathJax) unavailable** → Self-host as fallback

---

## Stakeholder Agreements

### Required Sign-Offs
- [ ] **Lead Engineer**: Confirms architecture is implementable within 12 weeks
- [ ] **DevOps Lead**: Confirms deployment pipeline (Cloud Build → Run) is viable
- [ ] **Subject Matter Expert**: Confirms numerical solver approach valid for pedagogy
- [ ] **Accessibility Reviewer**: Confirms WCAG 2.1 AA target is achievable

### Open Questions (TBD)
1. Should we pre-allocate Cloud Run instances for guaranteed uptime? (Cost vs. reliability trade-off)
2. Is 2D simulation adequate for Phase 1, or do we need 3D proof-of-concept? (Time vs. wow factor)
3. Who maintains educational content after launch? (Content refresh cycle?)

---

## References & Resources
- [Three.js Documentation](https://threejs.org/docs/)
- [D3.js Learning Path](https://d3js.org/)
- [Rust + WebAssembly Book](https://rustwasm.org/docs/book/)
- [Google Cloud Run Docs](https://cloud.google.com/run/docs)
- [WCAG 2.1 Compliance Guide](https://www.w3.org/WAI/WCAG21/quickref/)
- [React Hooks: A Complete Guide](https://react.dev/)
- [Framer Motion API Reference](https://www.framer.com/motion/)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)

---

**End of ADR**

**Next Steps**:
1. Stakeholder review & sign-off (this week)
2. Create GitHub Issues from ADR decisions (Week 1)
3. Begin TDD implementation (Week 1)
4. Deploy prototype to Cloud Run (Week 3)

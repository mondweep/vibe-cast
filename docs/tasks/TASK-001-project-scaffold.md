# TASK-001: Project Scaffold & Infrastructure Setup

**Status:** pending  
**SPEC:** SPEC-001  
**ADRs:** ADR-001, ADR-002, ADR-003  
**Depends On:** None (can start immediately)  
**Parallel:** No  
**Estimated Tokens:** 3000  

## Task Context & Purpose

Initialize the project structure with all tooling, configuration, and scaffolding needed for rapid iteration. This includes:
- Netlify Functions setup (serverless backend)
- React + Vite + TypeScript frontend
- PubNub SDK integration
- Environment variable configuration
- Build & deployment pipeline

## Session Start Instructions

1. Read SPEC-001 (architecture overview, component specs)
2. Review ADR-001 (Netlify rationale), ADR-002 (PubNub rationale), ADR-003 (React rationale)
3. Verify branch: `claude/pi-tinkering-86sN1` (should be empty)
4. All git work stays on this branch

## Scope

### Files to Create
- `.env.example` — Template for environment variables
- `netlify.toml` — Netlify Functions configuration
- `vite.config.ts` — Vite build configuration
- `tsconfig.json` — TypeScript strict configuration
- `package.json` — Dependencies and scripts
- `src/main.tsx` — React entry point
- `src/vite-env.d.ts` — Vite type definitions
- `src/App.tsx` — Root component
- `src/types/index.ts` — Shared TypeScript types
- `functions/api/search.ts` — Netlify Function stub
- `functions/api/contribute.ts` — Netlify Function stub
- `functions/api/vote.ts` — Netlify Function stub
- `.github/workflows/deploy.yml` — Auto-deployment on git push
- `README.md` — Setup and run instructions

### Files to Modify
- None (first commit)

### Files Excluded
- `node_modules/`
- `.git/` (except main commit)
- Build artifacts

## Implementation Steps

1. **Initialize npm project**
   ```bash
   npm init -y
   npm install --save-dev vite @vitejs/plugin-react typescript
   npm install --save-dev @netlify/functions
   npm install react react-dom pubnub pubnub-react
   ```

2. **Create TypeScript config** (`tsconfig.json`)
   - Enable strict mode
   - Target ES2020
   - DOM lib for React

3. **Create Vite config** (`vite.config.ts`)
   - React plugin
   - Server proxy to `/api/*` → Netlify Functions
   - Type checking in build

4. **Create directory structure**
   ```
   src/
   functions/api/
   public/
   docs/ (already exists)
   ```

5. **Create Netlify configuration** (`netlify.toml`)
   - Functions directory: `functions`
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Environment variables placeholder

6. **Create React entry point** (`src/main.tsx`)
   - Mount App component
   - Error boundary wrapper

7. **Create root component** (`src/App.tsx`)
   - Basic routing structure
   - Component placeholders

8. **Create types file** (`src/types/index.ts`)
   - SearchResult interface
   - ContributionResponse interface
   - ActivityItem interface
   - (Reference SPEC-001 data models)

9. **Create API function stubs** (`functions/api/search.ts`, etc.)
   - Netlify Function handler boilerplate
   - Receive request, return 200 OK
   - Placeholder for PubNub publish

10. **Create environment template** (`.env.example`)
    ```
    PUBNUB_PUBLISH_KEY=your_publish_key_here
    PUBNUB_SUBSCRIBE_KEY=your_subscribe_key_here
    REACT_APP_PUBNUB_SUBSCRIBE_KEY=your_subscribe_key_here
    PI_NETWORK_API_URL=https://pi.ruv.io
    ```

11. **Create .gitignore**
    - `.env` (never commit secrets)
    - `node_modules/`
    - `dist/`
    - `.netlify/`

12. **Create README.md**
    - Project description
    - Setup instructions (clone, npm install, .env setup)
    - Run local dev server: `npm run dev`
    - Deploy: `git push origin claude/pi-tinkering-86sN1`

13. **Create npm scripts** (`package.json`)
    ```json
    {
      "scripts": {
        "dev": "vite",
        "build": "tsc && vite build",
        "preview": "vite preview",
        "type-check": "tsc --noEmit"
      }
    }
    ```

14. **Test build locally**
    ```bash
    npm run build  # Should complete without errors
    npm run dev    # Should start dev server on http://localhost:5173
    ```

15. **Commit all scaffolding**
    - Clear, descriptive message
    - Reference SPEC-001

## Test Requirements

### Unit Tests
- None yet (boilerplate verification only)

### Integration Tests
- [x] `npm run build` completes without errors
- [x] `npm run dev` starts dev server without warnings
- [x] TypeScript `strict: true` enforces type safety
- [x] Netlify Functions directory detected correctly

### Manual Verification
- [x] Project structure matches diagram in SPEC-001
- [x] `src/types/index.ts` exports all required types
- [x] `.env.example` lists all required keys
- [x] README.md contains clear setup steps

## Acceptance Criteria

1. **Project compiles cleanly**
   - `npm run build` exits with status 0
   - Zero TypeScript errors with strict mode
   - Zero warnings

2. **Local dev works**
   - `npm run dev` starts without errors
   - Can navigate to `http://localhost:5173`
   - React DevTools extension detects app

3. **Structure matches spec**
   - All files from "Files to Create" exist
   - Types file exports SearchResult, ContributionResponse, ActivityItem
   - Netlify Functions directory exists at `functions/api/`

4. **Environment setup documented**
   - `.env.example` lists all required keys
   - README.md has setup instructions
   - `.gitignore` prevents committing secrets

5. **Git clean**
   - `git status` shows no untracked files (except `.env`)
   - Commit message references SPEC-001

## Definition of Done

- ✅ All files created per scope section
- ✅ No TypeScript errors or warnings
- ✅ `npm run build` succeeds
- ✅ `npm run dev` runs without errors
- ✅ Git commit pushed to `claude/pi-tinkering-86sN1`
- ✅ No `.env` file committed (only `.env.example`)
- ✅ README.md ready for developer onboarding

---

*Specifications are the source of truth, not code.* — BHIL

# ADR-003: Frontend Framework Selection (React vs Vue vs Svelte)

**Status:** approved  
**Type:** architecture  
**Date:** 2026-04-09  
**Related PRD:** PRD-001  
**Related SPEC:** SPEC-001  

## Problem Statement

We need a frontend framework that enables rapid iteration on the Pi Network Explorer UI while maintaining clean separation between component logic, API calls, and real-time subscriptions. The framework must:
- Support TypeScript for type safety
- Integrate easily with PubNub SDK
- Have strong ecosystem (UI libraries, testing tools)
- Minimize boilerplate
- Enable fast developer iteration

## Decision Drivers

| Driver | Priority | Target |
|--------|----------|--------|
| Developer velocity (time to first UI) | P0 | <4h from project init |
| TypeScript support | P0 | Native support, not afterthought |
| Component ecosystem | P1 | Rich UI library options (Material-UI, Chakra, etc.) |
| Real-time integration (PubNub) | P1 | Proven examples, good docs |
| Testing infrastructure | P1 | Vitest, React Testing Library, etc. |
| Learning curve for team | P2 | Accept React (already familiar with vibe-cast) |

## Options Evaluated

### Option A: React + TypeScript + Vite (Chosen)
- **Setup Time:** ~5 min (Vite scaffolding)
- **TypeScript:** Native, first-class support
- **Ecosystem:** Largest (PubNub React SDK, react-query, etc.)
- **Build Tool:** Vite (2-3x faster than Webpack)
- **Testing:** Vitest + React Testing Library
- **Bundle Size:** Medium (~40KB gzipped for Hello World)

**Pros:**
- ✅ Fastest dev iteration (Vite HMR <100ms)
- ✅ Largest ecosystem (easiest to find PubNub examples)
- ✅ Built-in React hooks for state management
- ✅ Already used in vibe-cast (consistent with team)
- ✅ Excellent TypeScript support
- ✅ Rich UI library ecosystem (Material-UI, Chakra, shadcn/ui)

**Cons:**
- ⚠️ Larger bundle than alternatives (mitigated: code splitting)
- ⚠️ More boilerplate than Vue/Svelte
- ⚠️ Hooks learning curve (minimal for experienced devs)

### Option B: Vue 3 + TypeScript
- **Setup Time:** ~5 min (create-vue)
- **TypeScript:** First-class support (Script Setup)
- **Ecosystem:** Growing, smaller than React
- **Build Tool:** Vite (same as React)
- **Testing:** Vitest + Vue Test Utils
- **Bundle Size:** Smallest (~13KB gzipped)

**Pros:**
- ✅ Fastest bundle size
- ✅ Gentle learning curve (template syntax clearer)
- ✅ Reactive data binding more intuitive than hooks
- ✅ Official docs are excellent

**Cons:**
- ❌ Smaller ecosystem (fewer PubNub examples)
- ❌ Fewer developers familiar with Vue (team learning curve)
- ❌ Component library options less mature than React
- ⚠️ Less common in JavaScript ecosystem

### Option C: Svelte
- **Setup Time:** ~5 min (SvelteKit)
- **TypeScript:** Full support
- **Ecosystem:** Small, emerging
- **Build Tool:** Vite-based (SvelteKit)
- **Testing:** Vitest + Playwright
- **Bundle Size:** Smallest (<8KB gzipped)

**Pros:**
- ✅ Smallest bundle size
- ✅ Most elegant syntax (compiler approach)
- ✅ True reactivity (not hooks)
- ✅ Amazing DX with SvelteKit

**Cons:**
- ❌ Tiny ecosystem (hard to find PubNub examples)
- ❌ Smaller community (learning resources sparse)
- ❌ Team unfamiliar with Svelte approach
- ❌ Less proven in production

## Chosen Option: React + TypeScript + Vite

**Rationale:**
1. **Team Velocity (P0):** Vibe-cast already uses React; leverages existing patterns and knowledge
2. **Ecosystem (P1):** Largest selection of PubNub examples, UI libraries, and community resources
3. **Build Speed (P0):** Vite enables sub-100ms HMR, critical for fast iteration on specification validation
4. **TypeScript First (P0):** Prevents entire categories of runtime bugs
5. **Proven Path:** React in production scales well; no architectural surprises

**Tradeoff:** Larger bundle than Vue/Svelte (mitigated by code splitting, lazy loading).

## Architecture Notes

### Project Structure
```
src/
  components/
    SearchView.tsx
    ContributeView.tsx
    Dashboard.tsx
    shared/
      LoadingSpinner.tsx
      ErrorBoundary.tsx
  hooks/
    usePubNubSubscription.ts     # Custom hook for PubNub
    useApiCall.ts                 # API fetch wrapper
    useSessionStorage.ts          # Session persistence
  services/
    piNetworkAPI.ts               # API client wrapper
    pubnubService.ts              # PubNub config & helpers
  types/
    index.ts                       # Shared TypeScript types
  pages/
    Home.tsx
    About.tsx
  App.tsx
  main.tsx
  vite-env.d.ts
```

### Key Patterns

#### Custom Hook: usePubNubSubscription
```typescript
function usePubNubSubscription(channel: string) {
  const [message, setMessage] = useState(null);
  
  useEffect(() => {
    pubnub.addListener({
      message: (event) => setMessage(event.message),
    });
    
    pubnub.subscribe({ channels: [channel] });
    
    return () => pubnub.unsubscribe({ channels: [channel] });
  }, [channel]);
  
  return message;
}
```

#### Component: SearchView
```typescript
export function SearchView({ apiKey }: SearchViewProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const results = usePubNubSubscription(`search_results_${sessionId}`);
  
  const handleSearch = async () => {
    await fetch('/api/search', {
      method: 'POST',
      headers: { 'x-api-key': apiKey },
      body: JSON.stringify({ query }),
    });
  };
  
  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <button onClick={handleSearch}>Search</button>
      <SearchResults results={results} />
    </div>
  );
}
```

## Consequences

**Positive:**
- Team can iterate quickly (familiar patterns)
- Rich ecosystem (PubNub docs, UI libraries, examples)
- TypeScript prevents categories of bugs
- Proven production patterns
- Easy to onboard new developers

**Negative:**
- Slightly larger bundle than Vue/Svelte (mitigated by code splitting)
- More boilerplate than alternatives (tradeoff for familiarity)
- Hooks require discipline (mitigated by custom hooks pattern)

## Acceptance Criteria
- [x] Dev server starts in <5s (Vite)
- [x] HMR feedback <100ms
- [x] TypeScript strict mode enabled
- [x] PubNub SDK integrates cleanly (custom hooks)
- [x] UI library selected and integrated (<1h)

## Review Triggers
- If bundle size exceeds 100KB gzipped → implement route-based code splitting
- If team wants smaller bundle → migrate to Vue 3 or Svelte (low risk due to modular structure)
- If PubNub integration becomes complex → refactor into custom hooks abstraction

---

*Specifications are the source of truth, not code.* — BHIL

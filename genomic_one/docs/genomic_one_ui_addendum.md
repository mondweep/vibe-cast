# genomic_one — UI/UX Addendum
# Apply after core functionality is complete
# Pass this as a follow-up to Claude Code once enhancements 1-7 are stable

---

## DESIGN INTENT

Audience: Senior pharma executives and AI leaders (Novo Nordisk interview context).
Tone: Precision science meets frontier technology. Think mission control meets
clinical research lab — dark, data-dense, authoritative, with moments of elegant
animation that reward attention. NOT generic SaaS. NOT a startup landing page.

The one thing an interviewer should remember: "This looks like it belongs inside
a real drug discovery operation."

---

## VISUAL IDENTITY

### Colour Palette (CSS variables — apply globally)

```css
:root {
  /* Primary surfaces */
  --bg-base:        #090E1A;   /* Deep navy black — main background */
  --bg-surface:     #0D1526;   /* Card / panel background */
  --bg-elevated:    #111E35;   /* Elevated elements, hover states */
  --bg-border:      #1C2D4A;   /* Borders, dividers */

  /* Brand */
  --accent-teal:    #00C9B1;   /* Primary action, live indicators, PASSED states */
  --accent-blue:    #3D8EFF;   /* Secondary accent, links, layer highlights */
  --accent-gold:    #F0B429;   /* WARNING states, amber flags, epigenetic clock */
  --accent-red:     #FF4D4D;   /* FLAGGED states, poor metabolizer, high risk */
  --accent-purple:  #8B5CF6;   /* Molecule generation, Agentic Diffusion panels */

  /* Typography */
  --text-primary:   #E8F0FF;   /* Main text */
  --text-secondary: #7A9CC7;   /* Labels, metadata, secondary info */
  --text-muted:     #3D5A80;   /* Placeholder, disabled */

  /* Special */
  --safla-green:    #00E5A0;   /* SAFLA passed badge */
  --streaming-pulse:#00C9B1;   /* MidStream live indicator */
  --federation-node:#3D8EFF;   /* Node graph points */
}
```

### Typography

```
Display / Headers:  "DM Mono" or "JetBrains Mono" (monospace — scientific precision)
                    Import from Google Fonts CDN
Body text:          "IBM Plex Sans" (clean, technical, readable at small sizes)
Data / Numbers:     "DM Mono" — tabular numbers, variant scores, coordinates
Code snippets:      "JetBrains Mono"

Sizes:
  Page title:       2.5rem, weight 300 (light monospace reads as authoritative)
  Panel headers:    0.75rem, uppercase, letter-spacing: 0.15em, --text-secondary
  Body:             0.875rem, --text-primary
  Data values:      1.25rem, weight 600, --accent-teal or relevant accent
  Labels:           0.7rem, uppercase, letter-spacing: 0.1em, --text-muted
```

---

## LAYOUT

### Global Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER — fixed, full width                                      │
│  Logo · "GENOMIC ONE" · status badges · Demo Environment banner │
├───────────────┬─────────────────────────────────────────────────┤
│               │                                                  │
│  LEFT SIDEBAR │   MAIN CONTENT AREA                             │
│  (240px)      │   (flexible, scrollable)                        │
│               │                                                  │
│  Navigation   │   Panel grid — data-dense, card-based          │
│  Brain routes │   Recharts visualisations                       │
│  Layer status │   Three.js 3D panels                            │
│  Node status  │                                                  │
│               │                                                  │
└───────────────┴─────────────────────────────────────────────────┘
```

### Header (fixed, 56px height)

```
Left:   [○] GENOMIC ONE  (○ = animated DNA helix SVG, 24px)
Center: [◉ MidStream Live] [✓ SAFLA Active] [⬡ 5/5 Nodes] [FACT-Augmented]
Right:  [⚠ DEMO ENVIRONMENT — Simulated Data]
```

Status badge styles:
- MidStream Live: pulsing green dot + "LIVE" in --accent-teal, subtle glow
- SAFLA Active: checkmark + text in --safla-green
- Nodes: hexagon icon + count in --accent-blue
- Demo banner: amber background (#2A1F00), gold text — always visible, never dismissible

### Left Sidebar

Dark panel, --bg-surface background. Navigation items:

```
  ◎  Overview
  ⬡  K-mer Similarity
  ◈  Protein Contact Graph
  ◉  Variant Calling
  ⏱  Epigenetic Clock
  ⬤  Pharmacogenomics        ← NEW — highlight with accent dot
  ──────────────────
  BRAIN
  ◎  Memories
  ◈  Learning
  ◉  Pathways
  ◎  Advisory
  ⬡  Federation              ← NEW
  ◈  Architecture            ← NEW
```

Active state: left border 2px --accent-teal, text --text-primary, bg --bg-elevated
Hover state: bg --bg-elevated, transition 150ms

### Layer Status Panel (bottom of sidebar)

Show all 7 layers with live status:
```
INTELLIGENCE LAYERS
L1  Genomic Core     ● ACTIVE
L2  Vector + FACT    ● ACTIVE
L3  Neural + Diff    ● ACTIVE
L4  Bayesian + Temp  ● ACTIVE
L5  Advisory         ● ACTIVE
L6  SAFLA            ✓ VALIDATED
    Federated MCP    ⬡ 5/5 NODES
```

---

## PANEL COMPONENTS

### Standard Panel Card

```css
.panel-card {
  background: var(--bg-surface);
  border: 1px solid var(--bg-border);
  border-radius: 8px;
  padding: 20px 24px;
  position: relative;
}

/* Accent top border per panel type */
.panel-card.genomic    { border-top: 2px solid var(--accent-teal); }
.panel-card.neural     { border-top: 2px solid var(--accent-blue); }
.panel-card.molecule   { border-top: 2px solid var(--accent-purple); }
.panel-card.warning    { border-top: 2px solid var(--accent-gold); }
.panel-card.safla      { border-top: 2px solid var(--safla-green); }
.panel-card.flagged    { border-top: 2px solid var(--accent-red); }

.panel-label {
  font-family: 'DM Mono', monospace;
  font-size: 0.7rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.panel-value {
  font-family: 'DM Mono', monospace;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--accent-teal);
}
```

### SAFLA Validation Badge Component

```
┌─────────────────────────────────────────────────┐
│  ✓ SAFLA VALIDATED                  [L6]        │
│                                                  │
│  Safety Check:    ████████████ PASSED           │
│  Confidence:      94.2%                          │
│  Audit ID:        GEN-2026-03-17-CYP2D6-001     │
│  Regulatory:      CPIC Level A · PharmGKB 1A    │
│                                                  │
│  [Clinical Override →]                           │
└─────────────────────────────────────────────────┘
```

Styling: --safla-green border-top, dark background, monospace font throughout.
The audit ID should look like a real system identifier — fixed-width, code font.
"Clinical Override" button: ghost style, --accent-gold border, only appears on WARNING state.

### CYP2D6 Metabolizer Status Card

```
┌─────────────────────────────────────────────────┐
│  CYP2D6 PHARMACOGENOMICS         FACT-Augmented │
│                                                  │
│  Star Allele:  *1/*4                            │
│                                                  │
│  ██████████░░░░░░░░░  INTERMEDIATE METABOLIZER  │
│  (amber filled progress bar)                     │
│                                                  │
│  SEMAGLUTIDE (OZEMPIC / WEGOVY)                 │
│  ─────────────────────────────────────────────  │
│  Dosing:       Standard — no adjustment          │
│  Monitor:      Plasma concentration at init.     │
│  Interaction:  ● LOW                            │
│  Evidence:     PharmGKB Level 2A                │
│                                                  │
│  ▼ Reasoning Chain                              │
│  ▼ Evidence Base (3 sources)                    │
└─────────────────────────────────────────────────┘
```

Metabolizer status colours:
- Poor:          --accent-red filled bar
- Intermediate:  --accent-gold filled bar
- Normal:        --accent-teal filled bar
- Rapid/Ultrarapid: --accent-blue filled bar

### MidStream Live Streaming Indicator

When analysis is running:
- Pulsing green dot (CSS keyframe animation, 1.5s ease-in-out infinite)
- "STREAMING ACTIVE" label in --accent-teal
- Each gene panel (HBB, TP53, BRCA1, CYP2D6, INS) has its own progress bar
  that fills left-to-right as analysis completes
- Results fade in with a 200ms opacity transition as they arrive
- Subtle scanline animation on the panel background while streaming

```css
@keyframes pulse-live {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.5; transform: scale(0.85); }
}

@keyframes scanline {
  0%   { background-position: 0 0; }
  100% { background-position: 0 100%; }
}
```

### Disease Trajectory Chart (Recharts)

Use AreaChart with:
- Dark background: --bg-surface
- Line colour: --accent-teal for primary, --accent-blue for confidence bands
- Fill: teal at 15% opacity for confidence area
- X-axis: age decades (30, 40, 50, 60, 70)
- Y-axis: risk % (0-100)
- Inflection point markers: vertical dashed line in --accent-gold at risk threshold
- Tooltip: dark card, monospace font, shows risk % + confidence interval
- Animated on mount: line draws from left to right over 1.2s

### Federated Node Graph (Three.js / D3)

5 nodes arranged in a constellation pattern (not a grid):
- Node size: proportional to data volume processed
- Node colour: --federation-node (blue) when active, --text-muted when inactive
- Edges: animated particle flow along connections, direction = data flow
- Central orchestration node: larger, --accent-teal, always active
- Hover: node expands, shows tooltip with location + compliance framework
- Pulse animation on active nodes: 2s sine wave opacity

### Molecule Generation Cards (Agentic Diffusion)

```
┌─────────────────────────────────────────────────┐
│  CANDIDATE 1              [Agentic Diffusion]   │
│                                                  │
│  SMILES: CC(=O)Nc1ccc(O)cc1                    │
│                                                  │
│  [Molecule structure ASCII or SVG render]        │
│                                                  │
│  Binding Affinity:  ████████░░  8.2 kcal/mol    │
│  Toxicity Risk:     ● LOW                       │
│  Drug Similarity:   34% (Metformin)             │
│  Target:            BRCA1 repair pathway        │
│                                                  │
│  [View full structure →]                         │
└─────────────────────────────────────────────────┘
```

Three cards displayed in a horizontal row, each with --accent-purple top border.

### FACT Evidence Base (collapsible)

```
▼ Evidence Base  (3 sources · FACT-Augmented)
  ┌────────────────────────────────────────────┐
  │ [1] ★★★★★  PharmGKB CYP2D6 annotation    │
  │            PharmGKB · 2024 · Level 1A     │
  │ [2] ★★★★   CYP2D6 pharmacogenomics of    │
  │            GLP-1 receptor agonists        │
  │            PMID 38291045 · 2024           │
  │ [3] ★★★    Semaglutide metabolism in T2D  │
  │            NEJM · 2023                    │
  └────────────────────────────────────────────┘
```

Stars in --accent-gold. Source labels in --text-muted monospace.
Collapse animation: 300ms height transition.

---

## ANIMATION PRINCIPLES

**Page load sequence (staggered reveals):**
1. Header fades in: 0ms
2. Sidebar slides in from left: 100ms delay
3. Panel cards fade + translate up (20px → 0): 200ms delay, 50ms stagger per card
4. Data values count up from 0: 400ms delay, 600ms duration (use requestAnimationFrame)
5. Charts animate in: 600ms delay

**Ongoing animations (subtle, not distracting):**
- MidStream pulse: continuous when streaming active
- Node graph particles: continuous, slow (4s loop)
- Layer status dots: slow breathing pulse (3s, subtle)
- Background: very faint grid pattern with 0.03 opacity, static (no animation)

**Hover states:**
- Cards: border-color transitions to relevant accent, 150ms
- Navigation items: bg transition, 150ms
- Buttons: scale(1.02) + brightness(1.1), 100ms

**No:**
- Spinning loaders (use progress bars or skeleton screens)
- Bounce animations
- Parallax scrolling
- Auto-playing videos or GIFs

---

## RESPONSIVE BEHAVIOUR

This app is designed for a 1440px+ desktop screen (interview demo context).
Minimum supported: 1280px wide.
Do NOT invest time in mobile responsiveness — not needed for the demo.

At 1280px: sidebar collapses to icon-only (64px), tooltip labels on hover.
At 1440px+: full sidebar visible.

---

## ARCHITECTURE PANEL (/brain/architecture)

Render the full architecture diagram from the spec as an interactive panel:

- Use D3.js or SVG to render the layer stack vertically
- Each layer is a clickable row — click expands to show sub-components
- Data flow arrows animate downward (particle flow, slow, --accent-teal)
- The feedback loop arrow (bottom → L4) is a curved path, animated
- Federated nodes shown as a mini version of the constellation graph
- Export button: "Copy Architecture Diagram" → copies ASCII version to clipboard

---

## HEADER DEMO BANNER

Always visible. Cannot be dismissed.

```
┌────────────────────────────────────────────────────────────────┐
│  ⚠  DEMO ENVIRONMENT  ·  All data is simulated  ·             │
│     No real patient data is used or stored                     │
└────────────────────────────────────────────────────────────────┘
```

Style: 32px height, background #1A1200, border-bottom 1px solid --accent-gold,
text in --accent-gold, 0.75rem monospace. Sits above the main header.

---

## IMPLEMENTATION NOTES FOR CLAUDE CODE

1. Apply CSS variables globally in globals.css or tailwind.config.js
2. Google Fonts CDN imports go in _document.tsx or layout.tsx:
   - DM Mono: weights 400, 500
   - IBM Plex Sans: weights 400, 500, 600
   - JetBrains Mono: weight 400

3. Use Tailwind for layout/spacing, CSS variables for colours — don't hardcode hex values

4. The demo banner goes ABOVE the main header in the DOM, full width

5. Panel cards should use the .panel-card pattern with appropriate colour modifier

6. All Recharts components: background="transparent", use CSS variables for colours

7. Three.js scenes: background transparent, renderer.setClearColor(0x000000, 0)

8. Animations: prefer CSS transitions over JS where possible for performance

9. The architecture /brain/architecture panel is the LAST thing to implement —
   do all functional panels first, then add the architecture view

10. Target viewport: 1440 x 900 (MacBook Pro 14" — likely interview machine)

---

## WHAT "KILLER" LOOKS LIKE

When an interviewer opens this on a screen share during a demo:

- First 2 seconds: dark, authoritative, data-dense — immediately feels real
- Scrolling down: smooth, data reveals with subtle animation
- Clicking a panel: instant response, data expands cleanly
- The CYP2D6 panel: they recognise their own drug (semaglutide) — that's the moment
- The SAFLA badge: they ask "what's that?" — you explain responsible AI in 30 seconds
- The federation diagram: they see Copenhagen, Princeton, Oxford — their own geography
- Close the laptop: they remember the audit ID. GEN-2026-03-17-CYP2D6-001.
  That specificity is what serious systems look like.

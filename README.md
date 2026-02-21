# 🎸 RSD Guitar Internalizer

A web app for **internalizing guitar patterns** — chord progressions, timing, finger placements, and rhythm — so they become second nature, even when you're away from your instrument.

> **Live Demo:** Deploy to Netlify or run locally with `npm run dev`

---

## Why This App Exists

This app was inspired by an **Assamese guitar lesson** from [RSD Guitar Stories](https://www.youtube.com/@RSDGuitarStories), where the instructor teaches a specific chord progression with precise timing, silence techniques, and fingerstyle patterns.

The core idea is **"internalization on the go"** — being able to practice and recall guitar patterns during a commute, during a break, or anywhere without an instrument. The app digitizes this philosophy using proven learning techniques:

- **Spaced Repetition** (Anki-style) for technique recall
- **Interactive Visualization** (Yousician-style) for fretboard drills
- **Rhythmic Training** with real audio synthesis
- **Gamification** with daily streak tracking

---

## Features

### 🎵 Practice Mode
Synchronized metronome + chord progression from the RSD lesson:
- **Audio metronome** with accented beat 1 and subdivision ticks
- **Chord audio synthesis** — plays actual chord tones (Am, Am9, C, D, Fmaj7, G) using Web Audio API with real guitar note frequencies
- **Visual chord diagrams** showing finger positions on mini fretboard grids
- Progression: Bar 1 (Am → Am9) → Bar 2 (C → D) → Bar 3 (Fmaj7 with silence) → Bar 4 (G → Am transition)

### 🎸 Fretboard Drill
- Virtual fretboard to practice finger placements
- Choose a chord, tap the frets, and submit to check correctness
- Color-coded feedback: ✅ correct, ❌ incorrect, ⚠️ missed positions

### 🥁 Rhythm Tapper
- Tap in time with the metronome to internalize rhythmic patterns
- Accuracy tracking: perfect, good, miss, and silence violation detection
- Statistics display for ongoing accuracy

### 🃏 Technique Flashcards
- Spaced repetition deck covering slides, finger substitution, arpeggio patterns
- Confidence rating (Again / Hard / Good / Easy) adjusts review intervals
- Flip-to-reveal card interface

### 📊 Stats
- Current and longest practice streaks
- Daily progress tracking

### ℹ️ About
- Context and motivation behind the app

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React 19 + TypeScript |
| **Build** | Vite 7 |
| **Audio** | Web Audio API (oscillator synthesis) |
| **Routing** | React Router v7 |
| **Testing** | Vitest (unit) + Playwright (E2E) |
| **Architecture** | Domain-Driven Design with feature contexts |
| **Styling** | Vanilla CSS with design tokens |

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Install & Run

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Run Tests

```bash
# Unit tests
npm test

# E2E tests (49 tests across 6 spec files)
npm run test:e2e
```

### Build for Production

```bash
npm run build
```

Output goes to `dist/` — ready for static hosting (Netlify, Vercel, etc).

---

## Project Structure

```
src/
├── app/                          # Page components
│   ├── PracticePage.tsx          # Metronome + chord progression
│   ├── FretboardPage.tsx         # Virtual fretboard drills
│   ├── RhythmPage.tsx            # Rhythm tapping game
│   ├── FlashcardsPage.tsx        # Technique flashcards
│   ├── StatsPage.tsx             # Streak & daily progress
│   ├── AboutPage.tsx             # App context & motivation
│   └── Layout.tsx                # Header, nav, footer
├── contexts/                     # Feature domains (DDD)
│   ├── metronome/                # Engine, audio, beat tracking
│   ├── chord-progression/        # Chord data, diagrams, audio synthesis
│   ├── virtual-fretboard/        # Fretboard logic & components
│   ├── rhythm-tapper/            # Tap accuracy & scoring
│   ├── technique-flashcards/     # Spaced repetition engine
│   └── gamification/             # Streak tracking
├── shared/                       # Common types
└── styles/                       # Global CSS
e2e/                              # Playwright E2E tests
specs/                            # BDD feature specifications
```

---

## Deploying to Netlify

This is a static SPA — perfect for Netlify:

1. Connect your GitHub repo to Netlify
2. **Build command:** `npm run build`
3. **Publish directory:** `dist`
4. SPA routing is handled by the included `public/_redirects` file

---

## The Lesson Curriculum

The app is built around this specific chord progression from the RSD Guitar lesson:

| Bar | Chords | Notes |
|---|---|---|
| 1 | Am → Am9 | Change on beat 3 |
| 2 | C → D | Standard transition |
| 3 | Fmaj7 | Full bar with silence on beat 3 |
| 4 | G → Am | Bridge transition |

**Time signature:** 4/4 with eighth-note subdivisions (1 & 2 & 3 & 4 &)

---

## Credits

Built by **Mondweep Chakravorty**

- [LinkedIn](https://www.linkedin.com/in/mondweepchakravorty/)
- [GitHub](https://github.com/mondweep/vibe-cast)

Inspired by the guitar teaching methodology of **RSD Guitar Stories**.

---

## License

MIT

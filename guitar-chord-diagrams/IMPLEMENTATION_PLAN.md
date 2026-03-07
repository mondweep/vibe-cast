# ChordLab — Phase 5+ Implementation Plan

## Overview

This plan covers all features discussed but not yet built, organized into progressive phases.
Each phase is self-contained and shippable.

---

## Phase 5 — Beginner Detection Mode (Sensitivity Toggle)

**Goal:** Reduce rapid chord flipping for new players by adding a "Beginner" detection mode.

**Problem:** The current detection runs at 250ms intervals with no debounce. Every quarter-second
can trigger a chord change, making it hard for beginners to follow along.

### Step 5.1 — Detection Sensitivity Config

**File:** `src/audio/detectionConfig.ts` (new)

Create a `DetectionMode` type and config object:

| Parameter              | Standard (current) | Beginner Mode      |
|------------------------|--------------------|--------------------|
| Detection throttle     | 250ms              | 800ms              |
| Stability requirement  | 1 consecutive hit  | 3 consecutive hits |
| Confidence threshold   | 0.3                | 0.5                |
| Hysteresis margin      | 0.0                | 0.15               |
| Quality simplification | All 23+ types      | Major, minor, 7th  |

- `hysteresis margin`: the new chord must outscore the current chord by this margin to trigger a switch
- `quality simplification`: map dim→minor, sus→major, aug→major, etc. via a lookup table

### Step 5.2 — Stability Buffer in MicrophoneCapture

**File:** `src/components/AudioInput/MicrophoneCapture.tsx`

Add a `stableChordRef` that tracks consecutive same-chord detections:
- Track `lastDetectedChord` and `consecutiveCount`
- Only fire `onChordDetected` when `consecutiveCount >= config.stabilityHits`
- Reset counter when a different chord is detected

Add hysteresis logic:
- Track `currentChordScore` ref
- Only switch if `newScore > currentChordScore + config.hysteresisMargin`

### Step 5.3 — Quality Simplification in chordDetector

**File:** `src/audio/chordDetector.ts`

Add optional `simplified: boolean` parameter to `detectChord()`:
- When true, only score against major, minor, dom7, min7, maj7
- Skip all other chord qualities (sus, dim, aug, power, etc.)
- Reduces candidate space → faster + fewer false positives

### Step 5.4 — Sensitivity Toggle UI

**File:** `src/components/AudioInput/AudioInputPanel.tsx`

Add a toggle button next to the mic controls:
- Two-state toggle: "Standard" / "Beginner"
- Visual indicator of current mode
- Persist choice in localStorage
- Pass mode down to MicrophoneCapture

### Step 5.5 — Tests

- Test stability buffer logic (3 consecutive same-chord hits before firing)
- Test hysteresis (new chord must exceed margin)
- Test quality simplification mapping
- Test detection config defaults

---

## Phase 6 — Practice Analytics Dashboard

**Goal:** Give authenticated users insights into their practice habits.

**Depends on:** Supabase auth + session capture (already built).

### Step 6.1 — Analytics Queries Hook

**File:** `src/hooks/useAnalytics.ts` (new)

Supabase queries for:
- Total practice time (sum of session durations) — this week / this month / all time
- Unique chords played over time (chord vocabulary growth)
- Most frequently played chords (top 10)
- Session streak (consecutive days with at least 1 session)
- Average session length
- Chord quality distribution (% major / minor / 7th / etc.)

### Step 6.2 — Stats Cards Component

**File:** `src/components/Analytics/StatsCards.tsx` (new)

Grid of stat cards showing:
- Practice time this week (with sparkline trend)
- Chord vocabulary size
- Current streak
- Favorite chord

### Step 6.3 — Chord Frequency Chart

**File:** `src/components/Analytics/ChordFrequencyChart.tsx` (new)

Horizontal bar chart (pure SVG, no chart library) showing top 10 most-played chords.
Each bar labeled with chord name + count.

### Step 6.4 — Practice Timeline

**File:** `src/components/Analytics/PracticeTimeline.tsx` (new)

GitHub-style contribution grid showing practice activity per day.
Color intensity = practice minutes that day.
Last 12 weeks displayed.

### Step 6.5 — Analytics Tab Integration

**File:** `src/App.tsx`

Add "Analytics" tab (visible when authenticated, next to History).
Render analytics components.

### Step 6.6 — Tests

- Test query result formatting
- Test stat card rendering with mock data
- Test empty states

---

## Phase 7 — Chord Progression Sharing & Social

**Goal:** Let users share progressions publicly and discover popular ones.

**Depends on:** Phase 6 (analytics infra).

### Step 7.1 — Shared Progressions Table

**File:** `supabase/migration-v2.sql` (new)

New table: `shared_progressions`
- id, user_id, title, description, genre_tag, difficulty, chord_sequence (jsonb)
- likes_count, created_at
- RLS: anyone can read, only owner can write

New table: `progression_likes`
- user_id, progression_id, unique constraint

### Step 7.2 — Share Progression Flow

**File:** `src/components/Progression/ShareProgressionModal.tsx` (new)

Modal that appears when user clicks "Share" on the progression panel:
- Title, description, genre tag (dropdown), difficulty (beginner/intermediate/advanced)
- Preview of the chord sequence
- Publish button → inserts into `shared_progressions`

### Step 7.3 — Explore/Discover Panel

**File:** `src/components/Explore/ExplorePanel.tsx` (new)

Browse shared progressions:
- Filter by genre, difficulty, popularity
- Sort by recent / most liked
- Click to load a progression into the diagram view
- Like button (requires auth)

### Step 7.4 — Song Matching (Stretch)

**File:** `src/data/songProgressions.ts` (new)

Static dataset of well-known song progressions (public domain / educational use).
When a user's progression matches, show "Similar to: Let It Be (Beatles)" hint.

### Step 7.5 — Tests

- Test progression sharing data model
- Test genre/difficulty filtering
- Test song matching algorithm

---

## Phase 8 — AI-Generated Practice Reels

**Goal:** Auto-generate short-form video reels from practice sessions for social sharing.

**Depends on:** Phase 6 + Phase 7.

### Step 8.1 — Reel Data Assembler

**File:** `src/utils/reelGenerator.ts` (new)

Take a session's chord timeline and produce a reel storyboard:
- Each chord gets a "scene" with duration from the session data
- Calculate BPM from average chord change frequency
- Generate SVG frames: chord diagram + chord name + timestamp overlay

### Step 8.2 — Canvas-Based Reel Renderer

**File:** `src/components/Reels/ReelPreview.tsx` (new)

Client-side animated preview:
- HTML Canvas playing through the storyboard at tempo
- Chord diagrams transition (fade/slide) on beat
- Progression text at bottom
- Play/pause controls

### Step 8.3 — Video Export

**File:** `src/utils/reelExport.ts` (new)

Use the MediaRecorder API to capture the Canvas as a WebM video:
- Record the canvas at 30fps
- Add a simple title card at start
- Download as `.webm` file
- Optional: integrate with a server-side FFmpeg endpoint for MP4 conversion

### Step 8.4 — Share to Social

**File:** `src/components/Reels/ShareReelModal.tsx` (new)

- Copy link to reel (if hosted)
- Download video for manual upload to Instagram/TikTok/YouTube Shorts
- Web Share API for mobile devices (`navigator.share()`)

### Step 8.5 — Tests

- Test storyboard generation from session data
- Test BPM calculation
- Test reel data assembly with edge cases (single chord, very long session)

---

## Implementation Order & Dependencies

```
Phase 5 (Beginner Mode)     — no dependencies, pure frontend
    ↓
Phase 6 (Analytics)         — depends on Supabase auth (already built)
    ↓
Phase 7 (Social/Sharing)    — depends on Phase 6
    ↓
Phase 8 (Reels)             — depends on Phase 6 + 7
```

Phase 5 and Phase 6 are independent and could be built in parallel.
Phases 7 and 8 build on the social + data foundation.

---

## Out of Scope (Future Considerations)

- **Social OAuth** (Google, GitHub) — add via Supabase Auth providers when ready
- **Teacher/Student pairing** — requires role-based auth, assignment workflow
- **Aggregate data licensing** — requires scale (thousands of users first)
- **Mobile app** — React Native or Capacitor wrapper of the existing web app
- **Real-time collaboration** — Supabase Realtime for shared practice sessions

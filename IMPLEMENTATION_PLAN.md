# SanskritSync — Phase-Wise Implementation Plan

## Forge Methodology

This project follows the **Forge** autonomous quality engineering approach:
- **DDD (Domain-Driven Design)** — bounded contexts for Player, Translation, Learning
- **ADR (Architecture Decision Records)** — key decisions documented
- **TDD (Test-Driven Development)** — tests written before implementation
- **BDD (Behavior-Driven Development)** — Gherkin specs define acceptance criteria
- **Quality Gates** — 7-gate pipeline ensures "DONE DONE"

---

## Domain Contexts (DDD)

```
┌─────────────────┐  ┌──────────────────┐  ┌─────────────────────┐
│  Player Context │  │ Translation Ctx  │  │  Learning Context   │
│                 │  │                  │  │                     │
│ - YouTubePlayer │  │ - Transcriber    │  │ - VocabularyTracker │
│ - SyncController│  │ - Translator     │  │ - SRSEngine         │
│ - PlaybackState │  │ - SandhiSplitter │  │ - RevisionDeck      │
│ - AudioCapture  │  │ - LyricsCache    │  │ - SessionSummary    │
│                 │  │                  │  │ - ProgressDashboard │
└────────┬────────┘  └────────┬─────────┘  └──────────┬──────────┘
         │                    │                       │
         └────────────┬───────┘───────────────────────┘
                      │
              ┌───────┴────────┐
              │  Auth Context  │
              │                │
              │ - SupabaseAuth │
              │ - UserProfile  │
              │ - YouTubeOAuth │
              └────────────────┘
```

---

## Phase 1A: Foundation & Infrastructure (Sprint 1-2)

### Goal
Project scaffolding, Supabase setup, auth flow, and basic app shell.

### Tasks
1. **Scaffold React + TypeScript app** (Vite)
   - Tailwind CSS for styling
   - React Router for navigation
   - Project structure by domain context
2. **Supabase project setup**
   - Database migrations for all 6 core tables
   - Row Level Security policies
   - Supabase Auth configuration (email + Google)
3. **Auth flow**
   - Sign up / Sign in pages
   - Protected routes
   - User profile creation on first login
4. **App shell**
   - Navigation: Play | Revise | Progress tabs
   - Responsive layout

### Gherkin Specs
```gherkin
Feature: User Authentication
  Scenario: New user signs up with email
    Given I am on the sign-up page
    When I enter a valid email and password
    Then my account is created
    And a profile record exists in Supabase
    And I am redirected to the Play tab

  Scenario: Returning user signs in
    Given I have an existing account
    When I sign in with my credentials
    Then I see my Play tab with my history preserved

  Scenario: Unauthenticated user is redirected
    Given I am not signed in
    When I navigate to /revise
    Then I am redirected to the sign-in page
```

### ADR-001: Frontend Framework
- **Decision**: React + Vite + TypeScript
- **Rationale**: Fast dev cycle, strong ecosystem for real-time UIs, TypeScript for type safety across Supabase types
- **Alternatives rejected**: Next.js (SSR unnecessary for this app), Svelte (smaller ecosystem for audio/video integration)

### ADR-002: Database & Auth
- **Decision**: Supabase (PostgreSQL + Auth + Realtime)
- **Rationale**: Single platform for auth + database + real-time subscriptions. Row Level Security for multi-tenant data isolation. Generous free tier.
- **Alternatives rejected**: Firebase (less SQL flexibility), self-hosted Postgres + custom auth (more infrastructure to manage)

---

## Phase 1B: YouTube Player & Sync Controller (Sprint 3-4)

### Goal
Embed YouTube player, capture playback position, build the sync controller that coordinates all panels.

### Tasks
1. **YouTube IFrame API integration**
   - Embed player component
   - Playback controls (play, pause, seek, speed)
   - Time update events (polled at 250ms intervals)
2. **URL input**
   - Paste any YouTube URL → extract video ID → load player
   - Validate URL format
3. **Sync Controller**
   - Central state manager that tracks current playback time
   - Emits `onLineChange(lineIndex, timestamp)` events
   - Maps timestamp ranges → lyric line indices
4. **YouTube OAuth (library browsing)**
   - OAuth 2.0 flow for YouTube Data API v3
   - Fetch user's playlists and liked videos
   - Song browser UI with search/filter

### Gherkin Specs
```gherkin
Feature: YouTube Playback
  Scenario: User pastes a YouTube URL
    Given I am on the Play tab
    When I paste a valid YouTube URL
    Then the video loads in the embedded player
    And playback controls are visible

  Scenario: Playback position syncs to lyrics
    Given a song is playing with known lyrics
    When the playback reaches timestamp 00:30
    Then the lyrics panel highlights the line at 00:30
    And the translation panel shows the corresponding English text

  Scenario: User adjusts playback speed
    Given a song is playing
    When I set playback speed to 0.75x
    Then the audio plays at 0.75x speed
    And lyrics sync remains accurate

Feature: YouTube Library
  Scenario: User connects YouTube account
    Given I am signed in
    When I click "Connect YouTube"
    Then I am prompted to authorize via Google OAuth
    And after authorization my playlists are visible

  Scenario: User picks a song from their library
    Given my YouTube account is connected
    When I browse my "Sanskrit Songs" playlist
    And I tap a song
    Then it loads in the player and begins translation
```

---

## Phase 1C: Translation Engine & Lyrics Display (Sprint 5-7)

### Goal
Real-time Sanskrit transcription, sandhi splitting, Claude API translation, and synchronized lyrics panel.

### Tasks
1. **Audio transcription pipeline**
   - YouTube Captions API: fetch available subtitles/CC tracks
   - Browser audio capture (Web Audio API + MediaStream) as fallback
   - Whisper API integration for Sanskrit speech-to-text
   - Timestamp alignment: map transcribed text to playback timestamps
2. **Sanskrit NLP processing**
   - Sandhi splitting (compound word decomposition)
   - Devanagari ↔ IAST transliteration
   - Word-level tokenization with root form (dhatu) lookup
3. **Translation engine (Claude API)**
   - Prompt engineering for Sanskrit → English translation
   - Two modes: literal (word-for-word) and poetic (natural English)
   - Contextual explanations: source text, philosophical meaning, tradition
   - Streaming responses for low-latency display
4. **Lyrics display panel**
   - Three-row display: Devanagari | Transliteration | English
   - Currently-playing line highlighted with smooth scroll
   - Word-level tap targets for dictionary lookup
   - Toggle controls for display modes
5. **Song caching**
   - After first play, cache full lyrics + translations in Supabase `songs` table
   - On repeat play, load from cache (zero latency)

### Gherkin Specs
```gherkin
Feature: Real-Time Translation
  Scenario: Song with YouTube captions available
    Given I play a Sanskrit song that has captions on YouTube
    Then the app fetches the caption track
    And displays Devanagari text synced to playback
    And shows English translation for each line within 2 seconds

  Scenario: Song without captions (audio transcription)
    Given I play a Sanskrit song with no captions
    Then the app captures audio and sends to Whisper
    And displays transcribed Sanskrit text
    And shows English translation for each line

  Scenario: User toggles translation mode
    Given a song is playing with translations visible
    When I toggle from "Poetic" to "Literal" mode
    Then the English text switches to word-for-word translation

  Scenario: User taps a Sanskrit word
    Given lyrics are displayed for the current line
    When I tap the word "dharma"
    Then a popup shows: root, meaning, grammar, other songs

Feature: Song Caching
  Scenario: Repeat play loads from cache
    Given I previously played and translated a song
    When I play the same song again
    Then translations appear instantly (no API calls)
    And the cached lyrics match the original translation
```

---

## Phase 1D: Vocabulary Tracker & Revision Dashboard (Sprint 8-10)

### Goal
Persistent word tracking in Supabase, revision modes, session summaries, and progress dashboard.

### Tasks
1. **Vocabulary logging**
   - On each line played: extract words, upsert to `user_vocabulary`
   - Increment `encounter_count`, update `last_seen_at`
   - Compute `familiarity` score: `min(1.0, (encounters * 0.1) + (recency_bonus) - (lookup_penalty))`
   - Log each encounter to `word_encounters` with song/line context
2. **Word familiarity UI**
   - New words: bold + colored highlight
   - Recognized words (seen 3-5x): subtle highlight
   - Known words (seen 10+x): no highlight (they're part of you now)
3. **Revision Dashboard (Revise tab)**
   - Smart deck generation from `user_vocabulary` queries:
     - Today's words: `last_seen_at = today`
     - Struggling: `encounter_count > 5 AND familiarity < 0.4`
     - Almost learned: `familiarity BETWEEN 0.6 AND 0.8`
     - By song: `JOIN word_encounters ON song_id`
   - Flashcard mode: show Devanagari → user thinks → reveal English
   - Matching mode: 4 Sanskrit words + 4 English meanings → drag to match
   - Audio mode: play word in song context → recall meaning
4. **SM-2 Spaced Repetition**
   - After each revision card: user rates difficulty (1-5)
   - Update `srs_ease_factor`, `srs_interval`, `srs_next_review`
   - Due words surfaced first in revision decks
5. **Session Summary**
   - After song ends: modal showing words heard, new vs. known, revision prompt
   - Persistent in Supabase for history
6. **Progress Dashboard (Progress tab)**
   - Total unique words, familiarity distribution chart
   - Songs listened to with translation
   - Learning streak counter
   - Growth chart (vocabulary size over time)
7. **Export**
   - CSV download of full vocabulary
   - PDF generation of vocabulary cards

### Gherkin Specs
```gherkin
Feature: Vocabulary Tracking
  Scenario: New word encountered for the first time
    Given I am listening to a song
    When a line containing the word "ahimsa" plays
    And I have never encountered "ahimsa" before
    Then "ahimsa" is added to my vocabulary with encounter_count=1
    And it appears with a bold highlight in the lyrics

  Scenario: Known word encountered again
    Given "shanti" is in my vocabulary with encounter_count=15
    When a line containing "shanti" plays
    Then encounter_count increments to 16
    And "shanti" appears without special highlight

  Scenario: User marks word for revision
    Given I tap the word "moksha" in the lyrics
    When I click "Mark for revision"
    Then "moksha" appears in my revision deck
    And marked_revision=true in Supabase

Feature: Revision Dashboard
  Scenario: User opens flashcard revision
    Given I have 20 words in my vocabulary
    When I open the Revise tab and select "Flashcard" mode
    Then I see a Sanskrit word in Devanagari
    And I can flip to see the English meaning
    And after rating difficulty, the next card appears

  Scenario: Spaced repetition scheduling
    Given I reviewed "karma" and rated it 4 (easy)
    Then srs_interval increases
    And srs_next_review is set to a future date
    And "karma" won't appear in revision until that date

  Scenario: Session summary after song
    Given I just finished listening to a song
    Then a summary modal appears showing:
      | total words heard | 42 |
      | new words         | 8  |
      | review-ready      | 3  |

Feature: Progress Dashboard
  Scenario: User views learning progress
    Given I have listened to 5 songs over 3 days
    When I open the Progress tab
    Then I see my total unique words count
    And a familiarity distribution chart
    And my current learning streak
```

---

## Phase 1E: Integration, Polish & Quality Gates (Sprint 11-12)

### Goal
End-to-end integration, Forge quality gates, performance tuning, deployment.

### Tasks
1. **End-to-end integration testing**
   - Full flow: sign in → paste URL → play → see translation → vocabulary logged → revise
   - Cross-device sync verification
2. **Forge Quality Gates**
   - Gate 1 (Functional): Unit tests pass for all domain services
   - Gate 2 (Behavioral): All Gherkin scenarios pass
   - Gate 3 (Coverage): >80% code coverage on core domains
   - Gate 4 (Security): No internal mocking, RLS policies verified
   - Gate 5 (Accessibility): WCAG AA compliance, screen reader tested
   - Gate 6 (Resilience): Handles network failures, API timeouts gracefully
   - Gate 7 (Contract): Supabase schema matches TypeScript types
3. **Performance optimization**
   - Translation latency < 2s target
   - Lyrics scroll smoothness (60fps)
   - Supabase query optimization (indexes on user_vocabulary)
4. **Deployment**
   - Frontend: Vercel or Cloudflare Pages
   - Backend API: Railway or Fly.io
   - Supabase: managed cloud instance
   - Environment variables & secrets management

### Gherkin Specs
```gherkin
Feature: End-to-End Flow
  Scenario: Complete discovery-to-revision journey
    Given I sign in to SanskritSync
    When I paste a YouTube URL of a Sanskrit song
    And the song plays to completion
    Then I have new vocabulary words in my Supabase profile
    And I can open the Revise tab
    And revise the words I just learned via flashcards
    And my Progress dashboard reflects the session

  Scenario: Translation latency meets SLA
    Given I play a Sanskrit song
    Then each line's translation appears within 2 seconds of being sung
    For at least 90% of lines in the song

  Scenario: Data persists across sessions
    Given I listened to a song yesterday and learned 10 words
    When I sign in today on a different device
    Then my vocabulary shows all 10 words with correct encounter counts
    And my learning streak shows 2 days
```

---

## File Structure

```
sanskrit-sync/
├── forge.config.yaml           # Forge configuration
├── specs/                      # Gherkin specifications
│   ├── auth.feature
│   ├── youtube-player.feature
│   ├── translation.feature
│   ├── vocabulary.feature
│   ├── revision.feature
│   └── progress.feature
├── docs/
│   └── adr/                    # Architecture Decision Records
│       ├── 001-frontend-framework.md
│       ├── 002-database-and-auth.md
│       ├── 003-translation-engine.md
│       └── 004-audio-transcription.md
├── supabase/
│   └── migrations/             # Database migrations
│       ├── 001_profiles.sql
│       ├── 002_words.sql
│       ├── 003_user_vocabulary.sql
│       ├── 004_word_encounters.sql
│       ├── 005_songs.sql
│       └── 006_revision_sessions.sql
├── src/
│   ├── contexts/               # DDD bounded contexts
│   │   ├── auth/
│   │   │   ├── components/     # SignIn, SignUp, ProtectedRoute
│   │   │   ├── hooks/          # useAuth, useProfile
│   │   │   └── services/       # supabaseAuth.ts
│   │   ├── player/
│   │   │   ├── components/     # YouTubePlayer, SongBrowser, URLInput
│   │   │   ├── hooks/          # usePlayer, useSync, useYouTubeLibrary
│   │   │   └── services/       # syncController.ts, youtubeApi.ts
│   │   ├── translation/
│   │   │   ├── components/     # LyricsPanel, TranslationPanel, WordPopup
│   │   │   ├── hooks/          # useTranslation, useLyrics
│   │   │   └── services/       # transcriber.ts, translator.ts, sandhiSplitter.ts
│   │   └── learning/
│   │       ├── components/     # RevisionDeck, Flashcard, ProgressChart, SessionSummary
│   │       ├── hooks/          # useVocabulary, useRevision, useSRS, useProgress
│   │       └── services/       # vocabularyTracker.ts, srsEngine.ts, deckGenerator.ts
│   ├── shared/
│   │   ├── components/         # Layout, Navigation, ErrorBoundary
│   │   ├── lib/                # supabaseClient.ts, constants.ts
│   │   └── types/              # database.types.ts (generated from Supabase)
│   ├── pages/
│   │   ├── PlayPage.tsx
│   │   ├── RevisePage.tsx
│   │   └── ProgressPage.tsx
│   ├── App.tsx
│   └── main.tsx
├── api/                        # Backend API (FastAPI or Express)
│   ├── routes/
│   │   ├── transcribe.ts       # Audio → Sanskrit text
│   │   ├── translate.ts        # Sanskrit text → English (Claude API)
│   │   └── youtube.ts          # YouTube Data API proxy
│   └── services/
│       ├── whisper.ts           # Whisper API client
│       ├── claude.ts            # Claude API client
│       └── sanskrit-nlp.ts     # Sandhi splitting, morphology
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## Sprint Summary

| Sprint | Phase | Deliverable |
|--------|-------|-------------|
| 1-2 | 1A | Auth working, Supabase tables created, app shell with 3 tabs |
| 3-4 | 1B | YouTube player embedded, sync controller, URL paste works, library browsing |
| 5-7 | 1C | Real-time transcription + translation, lyrics panel, word tap, song caching |
| 8-10 | 1D | Vocabulary tracker, revision dashboard (4 modes), SRS, session summaries, progress |
| 11-12 | 1E | E2E tests, quality gates, performance tuning, deployment |

---

## Forge Quality Contract

Every feature merge must pass:
- [ ] All Gherkin scenarios for the feature GREEN
- [ ] Unit tests for domain services GREEN
- [ ] No internal mocking (external APIs only)
- [ ] Supabase RLS policies verified
- [ ] TypeScript strict mode — zero `any` types
- [ ] Translation latency < 2s (measured)
- [ ] Accessibility: keyboard navigable, screen reader labels

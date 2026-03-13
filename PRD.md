# PRD: Sanskrit Song Real-Time Translator

## Product Name
**SanskritSync** — Real-Time Sanskrit Song Translation & Learning

## Problem Statement
You discover a beautiful Sanskrit song on YouTube. You feel its power but have no idea what the words mean. There is no tool that listens along with you and tells you — in real time — what each line means, where it comes from, and helps you absorb Sanskrit naturally through music.

## Vision
A web application that connects to your YouTube library, listens to any Sanskrit song as it plays, and provides real-time English translations, word-by-word breakdowns, and contextual meaning — turning every listening session into an intuitive Sanskrit learning experience.

## Primary User Story
> "I just discovered a new Sanskrit song on YouTube. I hit play. As each line is sung, I see what it means in English. I can tap any word to understand it. Over time, I start recognizing Sanskrit words on my own — I'm learning without studying."

---

## Core User Flow

1. User connects their YouTube account (access to playlists, liked videos, history)
2. User picks a song from their library — or pastes any new YouTube URL they just found
3. The song plays. **In real time**, as each line is sung:
   - The app transcribes the Sanskrit audio (speech-to-text)
   - Displays the Sanskrit lyrics (Devanagari + how to pronounce it)
   - Shows the English translation synchronized to the current line
   - Highlights key Sanskrit words with their meanings
4. User can pause, tap any word, replay a line, or dive deeper
5. Words the user has encountered before are tracked — building their personal Sanskrit vocabulary over time

---

## Functional Requirements

### FR-1: YouTube Integration
- **YouTube OAuth login** — connect to user's YouTube account
- Browse user's playlists, liked videos, and subscriptions
- Accept any YouTube URL for newly discovered songs
- Embed YouTube player with standard playback controls (play, pause, seek, speed)
- Support queuing multiple songs

### FR-2: Real-Time Sanskrit Transcription (MVP — Phase 1)
- **Live audio-to-text**: As the song plays, transcribe Sanskrit audio in real time
- Use speech recognition (Whisper fine-tuned on Sanskrit) as primary engine
- Supplement with YouTube's own captions/subtitles when available
- Support both Vedic and Classical Sanskrit pronunciation
- Handle devotional songs, shlokas, stotras, kirtans, and film songs
- Gracefully handle mixed-language songs (Sanskrit + Hindi, Sanskrit + Tamil, etc.)

### FR-3: Lyrics Display
- **Devanagari script** — the original Sanskrit text as it's being sung
- **Pronunciation guide** — romanized transliteration (IAST) so user can read along
- **Word-by-word breakdown** — split compound words (sandhi) and show each word's meaning
- **Currently playing line highlighted** — always know where you are in the song

### FR-4: Real-Time English Translation
- Line-by-line English translation appearing as each line is sung
- Two modes available:
  - **Literal** — "what the words actually say" (word-for-word)
  - **Poetic** — "what it means" (natural English capturing the spirit)
- Default to poetic mode for intuitive understanding, with literal mode one tap away

### FR-5: Contextual Explanations
- Brief explanation for each verse:
  - What is the deeper meaning?
  - Where does it come from? (e.g., "This is verse 2.47 of the Bhagavad Gita")
  - Key concepts explained simply (dharma, karma, bhakti, moksha, etc.)
  - Cultural context (when is this sung? what tradition?)
- Concise by default — expandable for those who want to go deeper

### FR-6: Sanskrit Learning Engine (Supabase-Backed, Persistent)

All learning data is stored in **Supabase** (PostgreSQL + auth + real-time) so your vocabulary, progress, and history persist across sessions, devices, and time. You never lose what you've learned.

#### Persistent Vocabulary Tracker
- Every Sanskrit word you encounter is logged to your Supabase profile
  - Timestamp of each encounter, which song, which line
  - Encounter count: seen once, twice, five times, ten times
  - Familiarity score: computed from frequency × recency × whether you've looked it up
  - New/rare words get prominent highlights; familiar words get subtler treatment
- **Word Tap** — tap any Sanskrit word for:
  - Root word (dhatu) and grammatical form
  - Simple English meaning
  - Other songs where this word appears (cross-referenced from your history)
  - Audio pronunciation
  - "Mark as learned" / "Mark for revision" actions

#### Revision Dashboard ("Revise" Tab)
- **On-demand revision** — open any time, not just during playback
- **Smart Revision Decks** generated from your personal history:
  - "Words from today" — review what you just heard
  - "Struggling words" — words you've encountered often but keep looking up
  - "Almost learned" — words near the familiarity threshold
  - "All words from [Song Name]" — revise by song
  - "Words by theme" — grouped by meaning (e.g., nature, devotion, action, self)
- **Revision Modes:**
  - **Flashcard mode** — Sanskrit word → try to recall meaning → flip to see answer
  - **Audio mode** — hear the word spoken in context (clip from the song) → recall meaning
  - **Sentence mode** — see a full line with one word blanked out → fill it in
  - **Matching mode** — match Sanskrit words to English meanings (quick drill)
- **Spaced Repetition (SRS)** — Supabase stores review intervals per word
  - Words you get right → shown less often
  - Words you get wrong → shown more frequently
  - Based on SM-2 algorithm adapted for passive-listening context

#### Session Summary (after each song)
- "You heard 45 Sanskrit words today"
- "12 were new to you"
- "You've now seen 'shanti' in 6 different songs"
- "3 words are ready for revision" (link to Revise tab)

#### Learning History & Progress
- **Lifetime dashboard:**
  - Total unique Sanskrit words encountered
  - Words at each familiarity level (new → recognized → known → mastered)
  - Songs listened to with translations
  - Learning streaks (days active)
  - Growth chart: vocabulary size over time
- **Export** — download your full vocabulary list as CSV/PDF for offline study

### FR-7: User Controls
- Toggle Devanagari, transliteration, or both
- Toggle translation mode (literal vs. poetic)
- Font size controls
- Playback speed control (slow down to absorb)
- Bookmark favorite verses
- Share a verse translation as an image/card

---

## Non-Functional Requirements

### NFR-1: Latency
- Translation must appear within **2 seconds** of the line being sung
- For songs with known lyrics (cached), translations appear instantly

### NFR-2: Accuracy
- Sanskrit transcription target: 85%+ for clear studio recordings
- Translations validated against scholarly sources where available
- User feedback loop: "Was this translation helpful?" to improve over time

### NFR-3: Persistence & Sync
- All vocabulary, encounter history, SRS schedules, and learning stats stored in **Supabase**
- Data persists across sessions — close the browser, come back weeks later, everything is there
- Real-time sync across devices (start on laptop, revise on phone)
- Songs you've played before have cached translations for instant replay
- Supabase Row Level Security (RLS) ensures each user only sees their own data

### NFR-4: Privacy & Auth
- **Supabase Auth** handles user accounts (email/password, Google, or GitHub login)
- YouTube OAuth with minimal scopes (read-only library access)
- User's listening history and vocabulary are private per-user (enforced by RLS)
- Option to export or delete all personal data

---

## Technical Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Frontend (Web App)                 │
│                                                      │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ YouTube  │  │  Live Lyrics │  │  Translation   │ │
│  │ Player   │  │  + Highlight │  │  + Explanation │ │
│  └────┬─────┘  └──────┬───────┘  └───────┬────────┘ │
│       │               │                  │          │
│  ┌────┴───────────────┴──────────────────┴────────┐ │
│  │              Sync Controller                   │ │
│  │   (matches audio position to lyrics/meaning)   │ │
│  └─────────────────────┬──────────────────────────┘ │
│                        │                            │
│  ┌─────────────────────┴──────────────────────────┐ │
│  │           Sanskrit Learning Engine             │ │
│  │   (vocabulary tracker, spaced repetition,      │ │
│  │    session stats, quiz mode)                   │ │
│  └────────────────────────────────────────────────┘ │
└────────────────────────┬─────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────┐
│                   Backend / API                      │
│                                                      │
│  ┌───────────────┐  ┌────────────┐  ┌─────────────┐ │
│  │ Audio Stream  │  │ Sanskrit   │  │ Translation │ │
│  │ & Transcribe  │  │ NLP Engine │  │ Engine      │ │
│  │               │  │            │  │             │ │
│  │ Whisper       │  │ Sandhi     │  │ Claude API  │ │
│  │ (Sanskrit     │  │ splitting, │  │ (contextual │ │
│  │  fine-tuned)  │  │ morphology,│  │  translate  │ │
│  │       +       │  │ dictionary │  │  + explain) │ │
│  │ YouTube       │  │ lookup     │  │             │ │
│  │ Captions API  │  │            │  │             │ │
│  └───────────────┘  └────────────┘  └─────────────┘ │
│                                                      │
│  ┌──────────────────────────────────────────────────┐│
│  │  YouTube OAuth    │  Translation Cache           ││
│  │  (library access) │  (known songs)               ││
│  └──────────────────────────────────────────────────┘│
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│                  Supabase (Cloud DB)                  │
│                                                      │
│  ┌─────────────┐ ┌──────────────┐ ┌───────────────┐ │
│  │ User Auth   │ │  Vocabulary  │ │  Song Cache   │ │
│  │ (accounts,  │ │  Store       │ │  (lyrics,     │ │
│  │  OAuth      │ │  (words,     │ │   translations│ │
│  │  tokens)    │ │   encounters,│ │   per song)   │ │
│  │             │ │   SRS data,  │ │               │ │
│  │             │ │   familiarity│ │               │ │
│  │             │ │   scores)    │ │               │ │
│  └─────────────┘ └──────────────┘ └───────────────┘ │
│                                                      │
│  ┌──────────────────────────────────────────────────┐│
│  │  Real-time subscriptions: sync vocab across      ││
│  │  devices, push revision reminders                ││
│  └──────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

### Key Technology Choices

| Component | Technology | Why |
|-----------|-----------|-----|
| Frontend | React + TypeScript | Real-time UI updates, component-based |
| YouTube Player | YouTube IFrame API | Official API with playback time events |
| YouTube Library | YouTube Data API v3 + OAuth 2.0 | Access user's playlists and liked videos |
| Audio Transcription | Whisper (Sanskrit fine-tuned) + YouTube Captions API | Dual path: live transcription + existing captions as fallback |
| Sanskrit NLP | sanskrit_parser / Vidyut | Sandhi splitting, morphological analysis, dictionary |
| Translation + Explanation | Claude API | High-quality contextual translation with cultural knowledge |
| Vocabulary & Learning DB | **Supabase** (PostgreSQL + Auth + Realtime) | Persistent across sessions/devices, built-in auth, real-time sync, row-level security |
| Spaced Repetition | SM-2 algorithm (stored in Supabase) | Proven SRS algorithm, per-word review scheduling |
| Backend | Node.js / Python FastAPI | WebSocket support for real-time streaming |
| Song Cache | Supabase (PostgreSQL) + Redis | Store translated songs, fast lookup for repeat plays |

### Supabase Database Schema (Core Tables)

```sql
-- User profiles (extends Supabase auth.users)
profiles
  id              uuid (FK → auth.users)
  display_name    text
  created_at      timestamp
  total_words     int        -- lifetime unique words encountered
  current_streak  int        -- consecutive days active

-- Every Sanskrit word in the system
words
  id              uuid
  devanagari      text       -- संस्कृतम्
  iast            text       -- saṃskṛtam
  root_dhatu      text       -- root verb/noun
  meaning_short   text       -- one-line English meaning
  meaning_full    text       -- detailed meaning + grammar notes
  category        text       -- theme: devotion, nature, action, self, etc.

-- Your personal relationship with each word
user_vocabulary
  id              uuid
  user_id         uuid (FK → profiles)
  word_id         uuid (FK → words)
  encounter_count int        -- how many times you've heard this word
  first_seen_at   timestamp  -- when you first encountered it
  last_seen_at    timestamp  -- most recent encounter
  familiarity     float      -- 0.0 (brand new) → 1.0 (mastered)
  marked_learned  boolean    -- manually marked as "I know this"
  marked_revision boolean    -- manually marked for revision
  -- SRS fields
  srs_interval    int        -- days until next review
  srs_ease_factor float      -- SM-2 ease factor (default 2.5)
  srs_next_review timestamp  -- when to show this word again

-- Each time you encounter a word (for detailed history)
word_encounters
  id              uuid
  user_id         uuid (FK → profiles)
  word_id         uuid (FK → words)
  song_id         uuid (FK → songs)
  line_number     int        -- which line in the song
  encountered_at  timestamp
  looked_up       boolean    -- did the user tap to see meaning?

-- Cached song data
songs
  id              uuid
  youtube_url     text (unique)
  title           text
  lyrics_json     jsonb      -- [{line: 1, devanagari, iast, english_literal, english_poetic, explanation}]
  cached_at       timestamp

-- Revision session history
revision_sessions
  id              uuid
  user_id         uuid (FK → profiles)
  started_at      timestamp
  ended_at        timestamp
  mode            text       -- flashcard, audio, matching, sentence
  words_reviewed  int
  words_correct   int
  words_incorrect int
```

**Row Level Security:** All `user_*` tables and `word_encounters` enforce `auth.uid() = user_id` so users only access their own data.

---

## Glossary (Plain English)

| Term | What It Means |
|------|--------------|
| **ASR (Automatic Speech Recognition)** | Technology that listens to audio and converts it to text — like how Siri understands your voice. We use this to "hear" the Sanskrit words being sung. |
| **Sandhi** | In Sanskrit, words merge together when spoken (like "don't" = "do not" in English, but much more complex). Sandhi splitting breaks these merged words back apart so each word can be translated individually. |
| **Devanagari** | The script used to write Sanskrit: संस्कृतम् |
| **IAST Transliteration** | A way to write Sanskrit using Roman/English letters with accent marks, so you can read the pronunciation: saṃskṛtam |
| **Shloka/Stotra** | Types of Sanskrit verses — shlokas are individual verses, stotras are hymns of praise |
| **OAuth** | A secure way for the app to access your YouTube account without you sharing your password |
| **Whisper** | An AI model (by OpenAI) that can listen to audio and transcribe what's being said, supporting many languages including Sanskrit |
| **Supabase** | An open-source backend service that provides a database (PostgreSQL), user authentication, and real-time sync — all in one. We use it to store your vocabulary, learning progress, and song cache so your data persists forever and syncs across devices. |
| **Spaced Repetition (SRS)** | A learning technique where you review material at increasing intervals. Words you know well are shown rarely; words you struggle with appear more often. The SM-2 algorithm calculates optimal review timing. |

---

## MVP Scope (Phase 1) — "Discovery Mode"

The entire MVP is built around one scenario: **you found a new Sanskrit song and want to understand it right now.**

| Feature | Phase 1 |
|---------|---------|
| YouTube URL input — paste any song | Yes |
| YouTube account connection (browse your library) | Yes |
| **Real-time Sanskrit transcription as song plays** | **Yes** |
| Devanagari + pronunciation display | Yes |
| Line-by-line English translation synced to playback | Yes |
| Word tap for instant meaning | Yes |
| Basic verse explanations | Yes |
| **Supabase-backed persistent vocabulary tracker** | **Yes** |
| **Revision dashboard (flashcards, audio, matching)** | **Yes** |
| **Spaced repetition (SM-2) for word review scheduling** | **Yes** |
| Session summary ("you learned 12 new words") | Yes |
| Learning progress dashboard & lifetime stats | Yes |
| Export vocabulary as CSV/PDF | Yes |
| Advanced quiz modes (sentence fill-in, timed drills) | Phase 2 |
| Community song contributions | Phase 2 |
| Push notifications for revision reminders | Phase 2 |
| Mobile app | Phase 3 |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Real-time translation appears within 2s of audio | 90%+ of lines |
| User-rated translation quality (1-5 scale) | 4.0+ |
| New Sanskrit words surfaced per session | 10+ |
| Average session duration | 10+ minutes |
| Users returning weekly | 40%+ |
| "I understood the song" satisfaction rating | 80%+ |

---

## Open Questions

1. **YouTube audio access** — Extracting audio from YouTube may violate their ToS. Mitigation: use YouTube Captions API as primary source when captions exist; use browser audio capture (with user permission) for transcription when they don't.
2. **Sanskrit speech recognition quality** — Whisper's Sanskrit accuracy on sung audio (not spoken) is unproven. Needs benchmarking. May need fine-tuning on devotional music specifically.
3. **Mixed language songs** — Many "Sanskrit" songs mix in Hindi, Tamil, or other languages. The transcription engine needs to handle code-switching gracefully.
4. **Monetization** — Free tier with basic translations vs. premium with deep explanations and learning features? Or fully free with optional donations?

---

## Timeline

| Phase | What You Get | Duration |
|-------|-------------|----------|
| **Phase 1 (MVP)** | Play any Sanskrit song on YouTube → see real-time translation + start building vocabulary | 8-10 weeks |
| **Phase 2** | Quiz mode, spaced repetition, community contributions, improved accuracy | 8-12 weeks |
| **Phase 3** | Mobile apps, offline mode, playlist binge-learning mode | 8-10 weeks |

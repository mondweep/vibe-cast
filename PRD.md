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

### FR-6: Sanskrit Learning Engine
- **Personal Vocabulary Tracker** — every Sanskrit word you encounter is logged
  - Words you've seen once, twice, five times, ten times
  - Spaced repetition: words you've seen many times get subtler highlights
  - New/rare words get prominent highlights so you notice them
- **Word Tap** — tap any Sanskrit word for:
  - Root word (dhatu) and grammatical form
  - Simple English meaning
  - Other songs where this word appears
  - Audio pronunciation
- **Session Summary** — after each song:
  - "You heard 45 Sanskrit words today"
  - "12 were new to you"
  - "You've now seen 'shanti' in 6 different songs"
- **Learning Mode** — optional overlay that quizzes you:
  - "What does this line mean?" (before showing translation)
  - Fill-in-the-blank with Sanskrit words you've been learning

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

### NFR-3: Offline / Cache
- Songs you've played before are cached — lyrics, translations, explanations
- Your vocabulary progress syncs across devices

### NFR-4: Privacy
- YouTube OAuth with minimal scopes (read-only library access)
- User's listening history stays private
- Vocabulary data stored locally with optional cloud sync

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
│  │  YouTube OAuth    │  Translation Cache  │ User  ││
│  │  (library access) │  (known songs)      │ Vocab ││
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
| Vocabulary Tracking | Local IndexedDB + optional cloud sync | Fast, private, works offline |
| Backend | Node.js / Python FastAPI | WebSocket support for real-time streaming |
| Cache | PostgreSQL + Redis | Store known song translations, fast lookup |

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
| Personal vocabulary tracker | Yes |
| Session summary ("you learned 12 new words") | Yes |
| Learning/quiz mode | Phase 2 |
| Spaced repetition system | Phase 2 |
| Community song contributions | Phase 2 |
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

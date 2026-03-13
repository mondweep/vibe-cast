# PRD: Sanskrit Song Real-Time Translator

## Product Name
**SanskritSync** — Real-Time Sanskrit Song Translation & Interpretation

## Problem Statement
Sanskrit songs played on YouTube contain rich linguistic, philosophical, and spiritual meaning that is inaccessible to most listeners. There is no tool that provides real-time, synchronized English translations and contextual explanations as a Sanskrit song plays.

## Vision
A web application that listens to Sanskrit songs playing on YouTube, transcribes the Sanskrit lyrics in real time, and provides line-by-line English translations with cultural and philosophical explanations — all synchronized with the audio playback.

---

## Core User Flow

1. User pastes a YouTube URL or searches for a Sanskrit song
2. The app loads the YouTube video via embedded player
3. As the song plays, the app:
   - Extracts or recognizes the Sanskrit audio
   - Displays Sanskrit lyrics (Devanagari + transliteration)
   - Shows English translation synchronized to the current line
   - Provides contextual explanations (meaning, references, significance)
4. User can pause, replay, and explore any line in detail

---

## Functional Requirements

### FR-1: YouTube Integration
- Accept YouTube URLs as input
- Embed YouTube player with standard playback controls (play, pause, seek)
- Extract available subtitles/captions from YouTube if present
- Support playlists and queued songs

### FR-2: Sanskrit Audio Recognition
- Transcribe Sanskrit audio using speech-to-text (primary path)
- Fall back to pre-existing subtitle tracks or lyric databases
- Support both Vedic and Classical Sanskrit pronunciation
- Handle common hymns, shlokas, stotras, and devotional songs

### FR-3: Lyrics Display
- **Devanagari script** — original Sanskrit text
- **IAST/Harvard-Kyoto transliteration** — romanized pronunciation guide
- **Word-by-word breakdown** — sandhi splitting and individual word meanings
- Highlight the currently playing line

### FR-4: English Translation
- Line-by-line English translation synchronized with playback
- Two translation modes:
  - **Literal** — direct word-for-word meaning
  - **Poetic** — natural English rendering preserving the spirit
- Translations appear in real time as each line is sung

### FR-5: Contextual Explanations
- Brief explanation for each verse covering:
  - Philosophical/spiritual meaning
  - Source text reference (e.g., Bhagavad Gita Ch.2 V.47)
  - Key Sanskrit concepts (dharma, karma, moksha, etc.)
  - Raga and tala information where applicable
- Expandable detail panels — concise by default, rich on click

### FR-6: User Controls
- Toggle between Devanagari, transliteration, or both
- Adjust translation mode (literal vs. poetic)
- Tap any word for instant dictionary lookup
- Bookmark favorite verses
- Share individual verse translations

---

## Non-Functional Requirements

### NFR-1: Latency
- Translation display must lag no more than 2 seconds behind audio playback
- Pre-fetched translations for known songs should display with zero lag

### NFR-2: Accuracy
- Sanskrit transcription accuracy target: 85%+ for clear studio recordings
- Translation quality validated against established scholarly translations

### NFR-3: Offline Support
- Cache previously translated songs for offline viewing
- Downloaded translations available without network

### NFR-4: Accessibility
- Adjustable font sizes for Devanagari and English text
- High-contrast mode
- Screen reader support for translations

---

## Technical Architecture (Proposed)

```
┌─────────────────────────────────────────────────┐
│                   Frontend (Web)                │
│  ┌───────────┐  ┌───────────┐  ┌─────────────┐ │
│  │  YouTube   │  │  Lyrics   │  │ Explanation │ │
│  │  Player    │  │  Panel    │  │   Panel     │ │
│  └─────┬─────┘  └─────┬─────┘  └──────┬──────┘ │
│        │              │               │         │
│        └──────────┬───┘───────────────┘         │
│                   │                             │
│            Sync Controller                      │
└───────────────────┬─────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────┐
│                  Backend / API                    │
│  ┌──────────────┐  ┌───────────┐  ┌────────────┐ │
│  │ Audio Extract│  │ Sanskrit  │  │ Translation│ │
│  │ & Transcribe │  │ NLP Engine│  │ Engine     │ │
│  │ (Whisper /   │  │ (Sandhi   │  │ (Claude    │ │
│  │  Deepgram)   │  │  Splitter)│  │  API)      │ │
│  └──────────────┘  └───────────┘  └────────────┘ │
│                                                   │
│  ┌──────────────────────────────────────────────┐ │
│  │         Song & Translation Cache             │ │
│  │         (known lyrics database)              │ │
│  └──────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────┘
```

### Key Technology Choices

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Frontend | React + TypeScript | Component-based UI, real-time updates |
| YouTube Player | YouTube IFrame API | Official API, playback time events |
| Audio Transcription | Whisper (fine-tuned on Sanskrit) | Best open-source multilingual ASR |
| Sanskrit NLP | sanskrit_parser / Vidyut | Sandhi splitting, morphological analysis |
| Translation | Claude API | High-quality contextual translation |
| Lyrics DB | PostgreSQL + vector search | Cache known songs, fuzzy match lyrics |
| Real-time sync | WebSocket | Low-latency server-to-client updates |

---

## Data Strategy

### Known Song Database
- Pre-populate with commonly searched Sanskrit songs:
  - Bhagavad Gita verses (700 shlokas)
  - Vishnu Sahasranama, Lalita Sahasranama
  - Popular stotras (Shiva Tandava, Hanuman Chalisa, etc.)
  - Carnatic and Hindustani devotional compositions
- Community contribution pipeline for new songs

### Audio Fingerprinting
- Match playing audio against known recordings to skip transcription
- Instantly load cached translations for recognized songs

---

## MVP Scope (Phase 1)

| Feature | Included |
|---------|----------|
| YouTube URL input + embedded player | Yes |
| Pre-loaded translations for top 100 Sanskrit songs | Yes |
| Devanagari + transliteration display | Yes |
| Line-by-line English translation synced to playback | Yes |
| Basic verse explanations | Yes |
| Word tap for dictionary lookup | Yes |
| Real-time transcription of unknown songs | No (Phase 2) |
| Community contributions | No (Phase 2) |
| Mobile app | No (Phase 3) |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Translation sync accuracy (within 2s of audio) | 90%+ |
| User-rated translation quality (1-5) | 4.0+ |
| Songs in pre-loaded database | 100+ at launch |
| Average session duration | 10+ minutes |
| Return users (weekly) | 40%+ |

---

## Open Questions

1. **YouTube ToS** — Audio extraction from YouTube may violate terms of service. Should we rely solely on YouTube captions + our own lyrics DB instead?
2. **Sanskrit ASR quality** — Whisper's Sanskrit accuracy on devotional songs is unvalidated. Need a benchmark dataset.
3. **Licensing** — Are existing scholarly translations (e.g., Swami Sivananda, Eknath Easwaran) available under open license, or do we need original translations?
4. **Monetization** — Freemium model (free basic, paid detailed explanations) vs. fully free with donations?

---

## Timeline Estimate

| Phase | Scope | Duration |
|-------|-------|----------|
| Phase 1 (MVP) | YouTube player + pre-loaded song translations + sync display | 6-8 weeks |
| Phase 2 | Real-time Sanskrit ASR + unknown song support + community | 8-12 weeks |
| Phase 3 | Mobile apps + offline mode + playlist support | 8-10 weeks |

# SanskritSync

Learn Sanskrit through music. Paste a YouTube URL, watch the video, and follow along with real-time line-by-line translations — Devanagari, IAST transliteration, word-by-word breakdowns, and poetic English. Every word you encounter is tracked with spaced repetition so you build lasting vocabulary over time.

## Features

### Play
- Paste any YouTube URL of a Sanskrit song
- Embedded YouTube player with synchronized lyrics scrolling
- Two translation modes: **Poetic** (natural English) and **Literal** (word-for-word)
- Tap any Sanskrit word for an inline popup showing meaning, root (dhatu), and grammar
- Automatic vocabulary tracking — every word you see or tap is logged
- Session summary at the end of each song

### Revise
- **Flashcards** — flip cards with Devanagari on the front, meaning on the back; rate your recall
- **Matching game** — pair Sanskrit words with their English meanings
- **Audio mode** — listen and identify (coming soon)
- **Sentence mode** — translate in context (coming soon)
- Deck filters: All words, Today's words, Struggling, Almost learned

### Progress
- Day streak counter
- Total words learned, songs played, words mastered
- Vocabulary breakdown chart (New / Recognized / Known / Mastered)
- Recent songs list
- Export vocabulary as CSV

### Under the Hood
- **Claude API** (Sonnet) for Sanskrit-to-English translation, sandhi splitting, and word analysis
- **SM-2 spaced repetition algorithm** for long-term retention
- **YouTube caption extraction** with Sanskrit/Hindi fallback
- **Supabase** for auth, user profiles, vocabulary persistence, and translation caching
- **Railway** deployment — single Express server serving both the API and the static frontend

## Tech Stack

| Layer        | Technology                                           |
| ------------ | ---------------------------------------------------- |
| Frontend     | React 19, TypeScript, Tailwind CSS 4, React Router 7 |
| Backend      | Express 5 (Node.js), TypeScript                      |
| AI           | Claude API (Sonnet) via `@anthropic-ai/sdk`          |
| Database     | Supabase (PostgreSQL + Auth + Row Level Security)    |
| Deployment   | Railway (Nixpacks)                                   |
| Build        | Vite 8                                               |

## Project Structure

```
├── server.ts                        # Express server (API + static serving)
├── railway.toml                     # Railway deployment config
├── nixpacks.toml                    # Nixpacks build config
├── tsconfig.server.json             # Server TypeScript config
├── src/
│   ├── App.tsx                      # Routes: /play, /revise, /progress
│   ├── main.tsx                     # Entry point
│   ├── index.css                    # Tailwind imports
│   ├── pages/
│   │   ├── PlayPage.tsx             # YouTube player + live translation
│   │   ├── RevisePage.tsx           # Flashcards, matching game
│   │   └── ProgressPage.tsx         # Stats, vocabulary breakdown
│   ├── contexts/
│   │   ├── auth/                    # Supabase auth (sign in/up, protected routes)
│   │   ├── player/                  # YouTube player, playback sync, URL input
│   │   ├── translation/            # Lyrics panel, translation panel, word popup
│   │   └── learning/               # Vocabulary tracking, SRS, flashcards, decks
│   └── shared/
│       ├── components/              # Layout, ErrorBoundary
│       ├── lib/                     # Constants, Supabase client
│       └── types/                   # Database types, LyricsLine, WordBreakdown
```

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- An [Anthropic API key](https://console.anthropic.com)

### 1. Clone and install

```bash
git clone <repo-url>
cd vibe-cast
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Claude API (server-side only)
ANTHROPIC_API_KEY=sk-ant-...

# YouTube Data API (optional — for playlist features)
VITE_YOUTUBE_API_KEY=your-key

# Server port
PORT=3000
```

### 3. Set up Supabase database

Create the following tables in your Supabase project (SQL editor):

```sql
-- User profiles (auto-created on signup)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz default now(),
  total_words int default 0,
  current_streak int default 0,
  last_active_date date
);

-- Sanskrit word dictionary
create table words (
  id uuid primary key default gen_random_uuid(),
  devanagari text not null,
  iast text not null,
  root_dhatu text,
  meaning_short text not null,
  meaning_full text,
  category text,
  created_at timestamptz default now(),
  unique(devanagari, iast)
);

-- Per-user vocabulary with SRS fields
create table user_vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  word_id uuid references words(id) on delete cascade,
  encounter_count int default 1,
  first_seen_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  familiarity float default 0.0,
  marked_learned boolean default false,
  marked_revision boolean default false,
  srs_interval int default 1,
  srs_ease_factor float default 2.5,
  srs_next_review timestamptz default now(),
  unique(user_id, word_id)
);

-- Word encounter log
create table word_encounters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  word_id uuid references words(id) on delete cascade,
  song_id text not null,
  line_number int not null,
  encountered_at timestamptz default now(),
  looked_up boolean default false
);

-- Cached song translations
create table songs (
  id uuid primary key default gen_random_uuid(),
  youtube_url text unique not null,
  title text,
  lyrics_json jsonb,
  cached_at timestamptz default now()
);

-- Revision session history
create table revision_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  started_at timestamptz default now(),
  ended_at timestamptz,
  mode text not null,
  words_reviewed int default 0,
  words_correct int default 0,
  words_incorrect int default 0
);
```

Enable Row Level Security on all tables and add appropriate policies for authenticated users.

### 4. Run locally

**Frontend only** (Vite dev server with hot reload):

```bash
npm run dev
```

**Full stack** (build frontend + start Express server):

```bash
npm run dev:full
```

**Or run the server separately** (after building the frontend):

```bash
npm run build
npm run dev:server
```

The app will be available at `http://localhost:3000`.

## API Endpoints

| Method | Path                              | Description                           |
| ------ | --------------------------------- | ------------------------------------- |
| POST   | `/api/translate`                  | Translate full song lyrics            |
| POST   | `/api/translate/line`             | Translate a single Sanskrit line      |
| POST   | `/api/sanskrit/split`             | Sandhi splitting (word segmentation)  |
| GET    | `/api/youtube/captions/:videoId`  | Fetch YouTube captions (sa/hi)        |
| GET    | `/api/health`                     | Health check                          |

## Deploying to Railway

1. Create a new project on [Railway](https://railway.app)
2. Connect your GitHub repository
3. Add environment variables in the Railway dashboard:
   - `ANTHROPIC_API_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_YOUTUBE_API_KEY` (optional)
4. Railway auto-detects `railway.toml` + `nixpacks.toml`, builds, and deploys
5. Your app will be live at the generated Railway URL

## NPM Scripts

| Script         | Description                                    |
| -------------- | ---------------------------------------------- |
| `dev`          | Start Vite dev server (frontend only)          |
| `dev:server`   | Start Express server with tsx (hot reload)     |
| `dev:full`     | Build frontend + start Express server          |
| `build`        | TypeScript check + Vite production build       |
| `build:server` | Compile server.ts to dist-server/              |
| `start`        | Run compiled server (production)               |
| `lint`         | Run ESLint                                     |
| `preview`      | Preview Vite production build                  |

## How It Works

1. **Paste a YouTube URL** — the app extracts the video ID and loads the embedded player
2. **Captions are fetched** — the server proxies YouTube's timed text API (Sanskrit first, Hindi fallback)
3. **Claude translates** — each line is sent to Claude Sonnet for translation, producing Devanagari, IAST, literal translation, poetic translation, explanation, and word-by-word breakdown
4. **Translations are cached** — results are stored in Supabase's `songs` table so repeat plays are instant
5. **Lyrics scroll in sync** — the frontend polls the YouTube player's current time and highlights the active line
6. **Vocabulary builds passively** — every word you see is logged as an encounter; tapping a word counts as a lookup
7. **Familiarity grows** — a logarithmic familiarity score increases with encounters (with a penalty for lookups)
8. **SRS schedules reviews** — the SM-2 algorithm calculates optimal review intervals for each word
9. **Revise to retain** — flashcards and matching games use your vocabulary deck, filtered by familiarity level

## License

MIT

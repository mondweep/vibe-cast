# SanskritSync

Learn Sanskrit through music. Paste a YouTube URL, watch the video, and follow along with real-time line-by-line translations — Devanagari, IAST transliteration, word-by-word breakdowns, and poetic English. Every word you encounter is tracked with spaced repetition so you build lasting vocabulary over time.

**Live demo:** https://sanskrit-sync-service-production.up.railway.app
**Source / contributions:** https://github.com/mondweep/vibe-cast/tree/claude/sanskrit-english-songs-8IhOE
**Built by:** [Mondweep Chakravorty](https://www.linkedin.com/in/mondweepchakravorty/)

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

### Library (curated verified songs — public)
- **Public browse** at `/library` — anonymous visitors see every verified song without signing in
- **Verified badge** — the green check signals lyrics that have been hand-reviewed against canonical sources
- **One-click play** — clicking a card opens `/play?v=<id>` with the song pre-loaded from cached, trusted lyrics (no transcribe call fires)
- **Curator-only editing** — `mondweep@gmail.com` / `mondweep@dxsure.uk` can edit lyrics line-by-line inline on `/play` and click **Verify & Save** to publish, or **Unverify** to remove a song from public view
- **Canonical vocabulary extraction** — when a song is verified, the server runs sandhi-split on every line and feeds the resulting words into a shared dictionary that powers everyone's flashcard deck

### Under the Hood
- **Claude API** (Haiku 4.5) for Sanskrit-to-English translation, sandhi splitting, and word analysis
- **Audio transcription pipeline** — yt-dlp pulls audio for videos without captions, Groq Whisper-large-v3-turbo transcribes (Sanskrit or Hindi hint), a multi-stage filter (regex + English stopword/noise list + Claude validator) rejects hallucinations before translation
- **Strict no-hallucination guard** — bulk translation refuses noisy input rather than inventing lyrics
- **SM-2 spaced repetition algorithm** for long-term retention
- **YouTube caption extraction** with Sanskrit/Hindi fallback
- **Supabase** for auth, user profiles, vocabulary persistence, and the verified-library schema
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
├── nixpacks.toml                    # Nixpacks build config (Node 22 + yt-dlp + ffmpeg)
├── tsconfig.server.json             # Server TypeScript config
├── api/
│   └── routes/
│       ├── translate.ts             # Claude-powered translate + sandhi split
│       ├── transcribe.ts            # Groq Whisper + hallucination guard
│       └── songs.ts                 # /api/songs/verify and /unverify
├── supabase/
│   └── migrations/                  # 001–007: schema + RLS migrations
├── src/
│   ├── App.tsx                      # Routes: /library (public), /play, /revise, /progress
│   ├── main.tsx                     # Entry point
│   ├── index.css                    # Tailwind imports
│   ├── pages/
│   │   ├── LibraryPage.tsx          # Public grid of verified songs
│   │   ├── PlayPage.tsx             # YouTube player + live translation + curator verify UI
│   │   ├── RevisePage.tsx           # Flashcards, matching game, lazy library deck sync
│   │   └── ProgressPage.tsx         # Stats, vocabulary breakdown
│   ├── contexts/
│   │   ├── auth/                    # Supabase auth (sign in/up, protected routes)
│   │   ├── player/                  # YouTube player, playback sync, URL input
│   │   ├── translation/
│   │   │   ├── components/          # LyricsPanel, EditableLyricsPanel, VerifyBar, TranslationPanel, WordPopup
│   │   │   ├── hooks/               # useTranslation (verified-first, no auto-cache)
│   │   │   └── services/            # transcriber, translator, libraryClient
│   │   └── learning/                # Vocabulary tracking, SRS, flashcards, libraryDeckSync
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

# Groq API — used for Whisper-large-v3-turbo audio transcription
GROQ_API_KEY=gsk_...

# YouTube Data API (optional — for playlist features)
VITE_YOUTUBE_API_KEY=your-key

# YouTube cookies (REQUIRED on cloud hosts like Railway/AWS/GCP).
# Export from a logged-in browser using the "Get cookies.txt LOCALLY"
# Chrome extension, then paste the entire Netscape-format file content
# as the env value. Without this, YouTube will bot-block transcription
# requests with HTTP 429 / "Sign in to confirm you're not a bot".
# Cookies expire after a few weeks — refresh when transcription starts failing.
YOUTUBE_COOKIES=

# Server port
PORT=3000
```

### 3. Set up Supabase database

Run the migration files in `supabase/migrations/` in order in the Supabase SQL editor. Migrations `001`–`006` create the base schema; migration `007` adds the verified-library schema (`verified` columns on `songs`, the `song_words` link table, the `library_words` view, and updated RLS policies for public-read of verified content + curator-only writes).

For reference, here's the resulting schema (do not run this SQL directly — use the migrations):

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

| Method | Path                              | Description                                                          |
| ------ | --------------------------------- | -------------------------------------------------------------------- |
| GET    | `/api/health`                     | Health check                                                         |
| GET    | `/api/youtube/captions/:videoId`  | Fetch YouTube captions (sa/hi)                                       |
| POST   | `/api/transcribe`                 | yt-dlp + Whisper audio transcription with hallucination filtering    |
| POST   | `/api/translate`                  | Translate full song lyrics (strict no-hallucination guard)           |
| POST   | `/api/translate/song`             | Translate a pre-segmented set of timestamped lines                   |
| POST   | `/api/translate/line`             | Translate a single Sanskrit line (softer, best-effort prompt)        |
| POST   | `/api/sanskrit/split`             | Sandhi splitting (word segmentation + grammar)                       |
| POST   | `/api/songs/verify`               | Curator-only: persist edited lyrics as a verified library entry      |
| POST   | `/api/songs/unverify`             | Curator-only: revert a song to draft (remove from public library)    |

## Deploying to Railway

1. Create a new project on [Railway](https://railway.app)
2. Connect your GitHub repository
3. Add environment variables in the Railway dashboard:
   - `ANTHROPIC_API_KEY`
   - `GROQ_API_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_YOUTUBE_API_KEY` (optional)
   - `YOUTUBE_COOKIES` (required if you want audio transcription to work; see env section above)
4. Railway auto-detects `railway.toml` + `nixpacks.toml`, builds, and deploys
5. Your app will be live at the generated Railway URL

## Enabling "Sign in with Google"

The Google OAuth button on the sign-in page comes from Supabase Auth. To make it work:

1. **In Google Cloud Console**:
   - Open APIs & Services → Credentials → Create OAuth Client → **Web application**
   - **Authorized redirect URI**: paste your Supabase project's auth callback URL — it's
     `https://<your-supabase-ref>.supabase.co/auth/v1/callback`
     (Supabase shows you the exact URL when you open the Google provider panel in step 2)
   - Copy the resulting **Client ID** and **Client Secret**
2. **In Supabase Dashboard** → Authentication → Providers → Google:
   - Toggle **Enable Sign in with Google**
   - Paste the Client ID and Client Secret from step 1, save
3. No code change is required. The existing "Continue with Google" button on `/signin` will start working immediately.

## Public access without sign-in

Three routes are open to anonymous visitors (no account needed):
- `/library` — browse all verified songs
- `/play` (read-only) — load any verified song, watch the video, see lyrics scroll, tap words to view their canonical meaning. Vocabulary tracking is skipped (the visitor has no user_id to attach progress to).
- `/privacy` — privacy notice

These are gated to signed-in users only:
- `/revise` — flashcards, matching game (writes to user_vocabulary)
- `/progress` — personal stats (reads from user_vocabulary)
- The "Verify & Save" / "Unverify" curator buttons on `/play` (also email-allowlisted)

## Privacy and consent

Every visitor (anonymous or signed-in) sees a bottom-fixed consent banner linked to `/privacy` on first visit. Clicking "I agree":
- Stores `consent_version` in `localStorage` so the banner doesn't reappear until the policy is updated
- Generates a random `visitor_id` UUID in `localStorage`
- POSTs to `/api/consent` which writes a row to `consent_log` (visitor_id, optional user_id, IP, user-agent, version)

On sign-in, the client fires `POST /api/profile/track` which:
- Reads the request's IP (`x-forwarded-for` honoured behind Railway's proxy)
- Looks up country/region/city via ipapi.co's free tier (1000 req/day, no API key needed)
- Writes `ip_address`, `geo_country`, `geo_region`, `geo_city` onto the user's `profiles` row

Bumping the privacy text? Increment `CONSENT_VERSION` in `src/shared/components/ConsentBanner.tsx` — existing users will see the banner again on their next visit and re-consent.

To inspect captured data as the curator, query Supabase directly:
```sql
SELECT email, display_name, geo_country, geo_city, consent_at, consent_version
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
ORDER BY u.created_at DESC;
```

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

The Play flow has two tiers:

**Verified-library path (fast, trusted):**

1. **Paste a YouTube URL** — the app extracts the video ID and loads the embedded player
2. **Lookup in Supabase** — if a row exists with `verified = true`, render those lyrics immediately. No external API calls fire.
3. **Lyrics scroll in sync** with the player's current time

**Live transcription path (slower, only for unverified songs):**

1. **Try YouTube captions** — the server proxies YouTube's timed text API (Sanskrit → Hindi fallback)
2. **Fall through to audio transcription** when no captions exist — yt-dlp pulls the audio with cookie-authenticated YouTube access, Groq Whisper-large-v3-turbo transcribes with a configurable language hint (`sa` or `hi`)
3. **Filter Whisper output** — heuristics drop foreign-script drift, English stopwords/noise words, single-letter tokens; a follow-up Claude validator pass classifies each remaining segment as Sanskrit-or-not
4. **Translate per line** — each segment goes through Claude Haiku for Devanagari + IAST + literal + poetic + explanation + word breakdown. The bulk endpoint refuses to translate noisy input (returns `[]` rather than hallucinate); per-line is softer for best-effort
5. **Honest failure** — if too few usable segments survive, the server returns HTTP 422 with a clear error instead of inventing lyrics
6. **No auto-caching of drafts** — unverified plays don't write to Supabase; repeat plays re-run the pipeline (predictable, but slow). Only explicit *Verify & Save* persists into the library.

**Vocabulary builds:**

7. **Library-wide canonical deck** — when a curator verifies a song, the server splits every line with sandhi analysis and upserts each unique word into the shared `words` table plus a `song_words` link table
8. **Lazy pre-populate** — on first visit to `/revise`, missing library words are copied into the user's personal SRS deck with default scheduling
9. **Familiarity grows** — a logarithmic score increases with encounters (with a penalty for lookups); SM-2 schedules reviews
10. **Revise to retain** — flashcards and matching games use the user's deck, filtered by familiarity level

## Project Status (as of 2026-05-16)

### Completed

- **Audio-first transcription pipeline** — yt-dlp + Groq Whisper end-to-end, working on Railway with cookie-authenticated YouTube access (essential for cloud-host IPs)
- **Multi-stage hallucination guard** — heuristic regex filter + English stopword/noise rejection + Claude Haiku classifier, all preserving the "no invented lyrics" constraint
- **Configurable language hint** — `language: 'sa'` or `'hi'` per request; Hindi often yields cleaner Devanagari for stotras
- **Honest-failure path** — 422 when too few segments survive, no silent fabrication
- **Model upgrade** — replaced retired `claude-3-haiku-20240307` with `claude-haiku-4-5-20251001` across all three call sites
- **Verified Library** — `/library` public page lists hand-verified songs with thumbnail/title cards; `verified=true` rows are publicly readable via RLS, drafts are curator-only
- **Inline edit + verify UI** — pencil icons on `/play` let the curator edit each line's Devanagari, IAST, poetic & literal English, and context; **Verify & Save** publishes to the library and runs sandhi-split on every line in throttled batches (4 lines × 5s spacing to stay under Anthropic's 50 req/min cap)
- **Canonical vocabulary** — verified-song words land in a shared `words` table; `song_words` link table maps words to their source line; `library_words` view exposes the deduplicated canonical list
- **Lazy deck sync** — `/revise` pre-populates each user's `user_vocabulary` from `library_words` on every visit (idempotent diff-and-insert)
- **Migration 007** (`supabase/migrations/007_verified_library.sql`) — schema additions + new RLS policies (public read on verified, curator-only writes via JWT email claim) + `song_words` table + `library_words` view
- **First verified song in production** — `9-kflUV2FvQ` ("24 Sanskrit Slokas of Daily Prayer") fully populated: 251 unique canonical words across **all 29 of 29 lines**, 289 word→line links
- **`max_tokens` fix for sandhi split** — bumped from 1024 to 4096 in `splitSanskrit` so long verses (Śāntākāram, Guru Mantra, etc.) no longer truncate JSON output mid-array and fall through to the empty-meaning fallback
- **Words clickable on verified lyrics** — `useTranslation` hydrates each line's `words[]` from the `song_words` ↔ `words` join after loading a verified row, so `LyricsPanel` renders clickable spans and the word popup opens with the canonical meaning, dhātu, and grammar
- **50-word deck cap removed** — `deckGenerator` was capping the revise flashcards at 50 even when the library deck held 251+ words; bumped to 1000 (PostgREST's default page ceiling) so the whole deck is reviewable
- **Word popup wired up** — `WordPopup` was a built-but-unmounted component. Tapping a word in the lyrics panel now opens the popup with the canonical Devanagari, IAST, meaning, root (dhātu), and grammar.
- **Anonymous public access** — `/library`, `/play`, and `/privacy` no longer require sign-in. Anonymous visitors can browse the library, play any verified song, see lyrics in sync, and tap words for meanings. Personal SRS pages (`/revise`, `/progress`) and curator actions remain auth-gated.
- **Privacy + consent capture** — bottom-fixed consent banner persists until dismissed, with link to `/privacy`. Records consent events (visitor_id + optional user_id + IP + user-agent + version) in a new `consent_log` table. On sign-in, the server captures the user's IP-derived geolocation (country, region, city) via ipapi.co's free tier and writes it to the `profiles` row.
- **Auto-create profiles row on signup** — `handle_new_user()` trigger on `auth.users` INSERT creates a corresponding `profiles` row with `display_name` from OAuth metadata or email. Closes the previous "missing profiles row" gap.
- **Migration 008** (`supabase/migrations/008_consent_and_profile.sql`) — adds `linkedin_url`, `geo_*`, `ip_address`, `consent_at`, `consent_version` to `profiles`; creates `consent_log`; installs the new-user trigger.

### Remaining / known issues

- **IAST anusvāra/nasal normalization (`ṃ` vs `m`)** — Sanskrit transliteration tolerates both `rājīvalocanaṃ` (with anusvāra) and `rājīvalocanam` (with plain `m`) for the same word; literal string-match treats them as different. Affects vocabulary lookup highlighting on lyric lines when the lyric IAST and the dictionary entry disagree. Clean fix is a small canonicalisation helper applied at both read and write time, plus a one-time migration to rewrite existing rows. Not yet implemented.
- **Mark-revision and mark-learned buttons in WordPopup are stubs** — the buttons render but currently no-op for both signed-in and anonymous users. They need `vocabulary.markRevision(word)` / `vocabulary.markLearned(word)` helpers in `useVocabulary` that flip the corresponding flags on the `user_vocabulary` row. Stubbed in `PlayPage.tsx` with `TODO` comments.
- **No "draft songs" curator queue** — the curator currently has to remember which URLs they've started transcribing but not yet verified. A `/curate` page listing all unverified drafts would help.
- **No edit history** — once a verified song is edited and re-saved, the prior lyrics are overwritten with no audit trail. Acceptable for now; revisit if multiple curators or community editing is added.
- **No `revision_sessions` writes yet** — the table exists but `/revise` doesn't currently log sessions. Progress page shows real-time numbers from `user_vocabulary` directly.
- **Three optional UI follow-ups** — search/filter on `/library`, category tags on songs (stotras vs. mantras vs. bhajans), and a "Word browser" page that lists all library words with their source songs.
- **Cleanup of legacy songs RLS policies** — five overlapping policies are stacked from the migration history (snake_case curator + space-named auth policies). Functional but noisy; a future migration should reconcile.

### Known limitations of the live transcription path

These constraints come from the underlying components — not bugs, just edges to be aware of:

- **YouTube bot-blocking on cloud hosts.** Railway, AWS, GCP, etc. all share data-center IP ranges that YouTube rate-limits aggressively. Without the `YOUTUBE_COOKIES` env var (Netscape-format cookies.txt content from a logged-in browser session), most transcription attempts will hit "Sign in to confirm you're not a bot" or HTTP 429. **Cookies must be refreshed every few weeks** when they expire.
- **Whisper Sanskrit accuracy is mediocre.** Whisper-large-v3-turbo was trained on relatively little Sanskrit audio. On clean enunciated chants (e.g., temple shloka recordings), it produces ~70–85% recognizable Devanagari or romanized Sanskrit. On modern arrangements with heavy instrumentation (rock, fusion, EDM), it drifts into hallucinated English/Chinese/German fragments — most of which the heuristic + Claude filter strip out, but coverage will be sparse.
- **Whisper misspellings stop bulk translation.** Even when surviving segments are recognizable as a known stotra, minor character-level errors (e.g., `याथा` instead of `यथा`) cause Claude's strict bulk translator to refuse, returning `[]`. Per-line translation works around this with a softer prompt; bulk requires curator edits before re-running.
- **Long videos get clipped.** Audio download caps at `--max-filesize 25M`, which covers ~18 minutes at format-18 bitrate. Recordings longer than that fail with "Audio extraction failed."
- **Audio formats are limited to mp4/360p.** The android/web player-client paths used to bypass YouTube's signature challenge only reliably serve format-18 (a single combined mp4 stream). If YouTube changes this, the pipeline may need a fresh `player-client` config.
- **Sandhi-split rate limits.** Anthropic enforces 50 req/min per organization on Haiku. The verify endpoint processes lines in batches of 4 with 5s spacing to stay under this. A 50-line song takes ~60 seconds. Songs longer than ~150 lines may need either a larger Anthropic tier or further throttling.
- **`splitSanskrit` occasionally falls back.** If Claude's structured-JSON response can't be parsed, the function returns bare tokens with empty meanings. The downstream filter discards these (correctly — empty meanings have nothing to learn), but the affected lines won't contribute to the library vocab. Re-running usually succeeds.
- **No CDN or rate-limiting on the public `/library` view.** Anonymous visitors hit Supabase directly via the anon key + RLS. If traffic spikes, you may want to put a CDN in front or move library reads to a static-generated page.
- **JWT-based curator auth has a ~60-minute window per session.** Internal scripts (like one-off batch imports) need to refresh the JWT every hour. The browser-based `/play` UI handles refresh automatically.
- **YouTube's SABR streaming rollout.** As of late 2025/early 2026, YouTube is forcing Server-side Adaptive Bitrate streaming on the `web` and `web_safari` clients, which removes scrapeable media URLs and yields HTTP 403 even with valid cookies. The current workaround in `server.ts` is a fallback chain `tv_embedded,web_creator,web_safari,web` — yt-dlp tries each in order. This list will need updating as YouTube tightens further. Symptom: `/api/transcribe` log shows "YouTube is forcing SABR streaming". When that happens, search the [yt-dlp issue tracker](https://github.com/yt-dlp/yt-dlp/issues) for the latest known-good client name and prepend it to the list, or bump yt-dlp to a newer version via `nixpacks.toml`.

## Adding a song to the verified library

This is the curator workflow — only the email allowlist (`mondweep@gmail.com` / `mondweep@dxsure.uk`) can perform these steps. Two paths depending on whether live transcription is currently working:

### Path A — Live transcription (when yt-dlp + YouTube are cooperating)

1. Sign in to the deployed app with your curator email
2. Visit `/play` and paste the YouTube URL of the song you want to add
3. Wait ~15–60 seconds for the pipeline to run (yt-dlp downloads audio → Whisper transcribes → Claude validates segments → bulk translate fills in Devanagari + IAST + translations)
4. The lyrics panel shows a "Draft" badge (curator-only). Click **Edit lines**
5. Read each line carefully — Whisper isn't perfect on Sanskrit, especially modern arrangements. Fix:
   - Devanagari spelling errors
   - Wrong IAST transliterations
   - Imprecise translations
   - Missing context in the explanation field
6. Click **Verify & Save**. The server runs sandhi-split on every line (throttled to stay under Anthropic's 50 req/min), upserts unique words into the `words` table, and links them to the song via `song_words`. Wall time roughly 15–60 seconds depending on song length.
7. The badge flips to "Verified ✓". The song appears on `/library` immediately for everyone.

### Path B — Manual canonical text (when yt-dlp is blocked or Whisper output is too noisy)

This is what we used for the Turīya and 24-shlokas songs when live transcription was either blocked or producing poor output.

1. Identify the song's source text. Well-known stotras and shlokas have published canonical Devanagari in standard collections (Sanskrit Documents Org, Wisdom Library, GRD Reading Room, Adyar, etc.). Pull the verses with verified IAST + meanings.
2. Prepare a JSON payload with the line schema used by `/api/songs/verify`:
   ```json
   {
     "videoId": "<youtube-video-id>",
     "title": "Song title",
     "language": "sa",
     "lines": [
       {
         "start_time": 0,
         "end_time": 30,
         "devanagari": "शुभं करोति कल्याणम् …",
         "iast": "śubhaṃ karoti kalyāṇam …",
         "english_poetic": "…",
         "english_literal": "…",
         "explanation": "Source citation + context"
       }
     ]
   }
   ```
3. Get a fresh curator JWT (sign in to the app, paste this in DevTools Console to extract):
   ```js
   (() => {
     const find = (s) => Object.entries(s).find(([k]) => k.startsWith('sb-') && k.endsWith('-auth-token'));
     const e = find(localStorage) || find(sessionStorage);
     return e ? JSON.parse(e[1]).access_token : 'NO TOKEN';
   })()
   ```
4. POST to the verify endpoint:
   ```bash
   curl -X POST https://sanskrit-sync-service-production.up.railway.app/api/songs/verify \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <JWT>" \
     --data-binary @your-song.json
   ```
5. The server returns `{song, wordExtraction}`. Inspect `wordExtraction` for any lines that errored (rate limit, parse failure) and re-run for just those lines if needed.

### Tips from real usage

- **Don't pad with content you're not sure about.** Coverage gaps are honest; invented lyrics aren't. The curator UI on `/play` will let visitors see "no lyric for this window" cleanly.
- **Bulk translate (`/api/translate/song`) refuses noisy input.** If Whisper produces text with character-level misspellings, the strict prompt returns `[]` rather than hallucinate. Either edit the lines first or call `/api/translate/line` (softer prompt) per-line.
- **Verify is idempotent.** Calling it again with the same `videoId` upserts the song row and re-runs word extraction. Use this if you want to update lyrics later — no need to unverify first.
- **Unverify keeps the data.** `/api/songs/unverify` just flips the flag, doesn't delete `song_words`. Re-verifying later restores the library entry instantly.

## Requesting a song

If you'd like a particular Sanskrit song added to the library, reach out via either:

- **LinkedIn:** [Mondweep Chakravorty](https://www.linkedin.com/in/mondweepchakravorty/) — DM with the YouTube URL and any context you can give (source text, traditional verses, who sings it)
- **GitHub:** Open an issue at [vibe-cast](https://github.com/mondweep/vibe-cast/tree/claude/sanskrit-english-songs-8IhOE) describing the song and ideally linking to a canonical text source

For songs where the lyrics are standard published verses (the daily-prayer shlokas, well-known stotras, Vedic mantras, Bhagavad-Gītā chapters, Upaniṣad passages), curation is fast — typically ~30 minutes from request to verified library entry.

## Contributing

This is a personal project that's grown into something potentially useful for a broader community of Sanskrit learners. Contributions are very welcome.

**Repository:** [github.com/mondweep/vibe-cast](https://github.com/mondweep/vibe-cast/tree/claude/sanskrit-english-songs-8IhOE) (current development branch: `claude/sanskrit-english-songs-8IhOE`)

**Areas where help would be especially valuable:**

- **Verified library expansion** — adding well-known stotras, daily prayers, Upaniṣadic mantras, Gītā chapters, etc. with canonical text from trusted published sources
- **Translation quality** — improving the prompts in `api/routes/translate.ts` so generated translations are more poetic, more accurate, or include more context (alternate readings, philosophical schools)
- **Revise modes** — the existing `/revise` page has stubs for "audio" and "sentence" flashcard modes that need implementation
- **IAST normalization helper** — the `ṃ` vs `m` issue called out in the limitations section needs a small canonicalisation function applied at word read/write time
- **Accessibility** — keyboard navigation, screen-reader labels, WCAG colour-contrast review
- **Mobile-specific UX polish** — the layout works on mobile but a few panels could be more compact
- **Devanagari font hosting** — current rendering uses system fonts; a curated Devanagari font would be more legible across platforms
- **Other devotional traditions** — the verified-library + canonical-vocab schema is text-agnostic; the same plumbing could power Pāli (Buddhist), Tamil (Śaiva-Vaiṣṇava), Arabic (Sufi/Qur'anic), or Latin (liturgical) traditions

Open a PR or DM via LinkedIn before starting a large change so we can align on approach. Smaller fixes (typos, minor RLS adjustments, frontend tweaks) — just open a PR directly.

## Credits & contact

Built and maintained by **Mondweep Chakravorty**.

- **LinkedIn:** https://www.linkedin.com/in/mondweepchakravorty/
- **GitHub repository:** https://github.com/mondweep/vibe-cast
- **Current branch:** [claude/sanskrit-english-songs-8IhOE](https://github.com/mondweep/vibe-cast/tree/claude/sanskrit-english-songs-8IhOE)

For data-deletion requests, song suggestions, bug reports, or collaboration — please reach out via LinkedIn DM or open a GitHub issue.

## Support this work

The project is free and ad-free. If you find the library useful, please consider supporting it: **https://paypal.me/mondweep** ❤️

Contributions go toward:

- **Server costs** — Railway hosting + Supabase storage
- **AI API tokens** — Claude (Sanskrit translation + sandhi split) and Groq (Whisper transcription) charges for every newly verified song
- **Curation time** — each new song in the verified library takes ~1–3 hours of careful work to transcribe, identify the source text, prepare canonical Devanagari + IAST + translations, and review

Any amount helps. If you'd rather contribute in kind (verifying songs you know well, fixing a bug, building a feature), see the "Contributing" section above.

## License

MIT

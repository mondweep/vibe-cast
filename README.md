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
- **Curator-supplied word breakdowns** — verify-time payloads can include a hand-curated `words[]` array per line; if present, sandhi-split is skipped and the words are inserted verbatim (preserves exact diacritic forms, ordering, and meanings)

### Song-request queue (visitor-facing)
- **Visitors don't trigger live transcription** — only the curator sees the URL input on `/play`. Other users get a request form. This avoids exposing visitors to YouTube anti-bot blocks and the variable quality of un-curated Whisper output
- **Public request form** — anyone (anon or signed-in) can submit a YouTube URL with optional note. Rate-limited to 1/day per visitor for anon, unlimited for signed-in
- **Dedup at submission** — server checks the verified library AND existing pending requests before inserting; visitors get a friendly "already in library" or "already requested" message
- **Telegram notification** to the curator on every accepted request (fire-and-forget, never blocks the user)
- **Curator `/queue` page** lists pending requests with Take this / Reject actions; verifying a song auto-clears its pending request

### Under the Hood
- **Claude API** (Haiku 4.5) for Sanskrit-to-English translation, sandhi splitting, and word analysis
- **Audio transcription pipeline** — yt-dlp pulls audio for videos without captions, Groq Whisper-large-v3-turbo transcribes (Sanskrit or Hindi hint), a confidence-scoring pipeline (heuristic + Sanskrit allowlist + Whisper logprob + Claude validator) labels each segment high/medium/low before translation
- **Three-tier confidence labels** — hard rejects (foreign scripts, "Subtitles by" boilerplate) drop pre-translate. Low-confidence lines are dropped server-side (too noisy to surface even with a warning). Medium-confidence lines surface with an amber disclaimer. High renders normally. Cost-conscious: low isn't sent to the translator at all
- **Strict no-hallucination guard** — bulk translation refuses noisy input rather than inventing lyrics
- **Telegram bot** for curator alerts (song requests, nightly auto-curation summaries)
- **SM-2 spaced repetition algorithm** for long-term retention
- **YouTube caption extraction** with Sanskrit/Hindi fallback
- **Supabase** for auth, user profiles, vocabulary persistence, the verified-library schema, and the song-request queue
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
│   ├── lib/
│   │   └── curatorAllowlist.ts      # getCuratorEmails() cached lookup + addCuratorEmail() auto-grant
│   └── routes/
│       ├── translate.ts             # Claude-powered translate + sandhi split + confidence-aware bulk
│       ├── transcribe.ts            # Groq Whisper + confidence scoring + Sanskrit allowlist
│       ├── songs.ts                 # /api/songs/verify and /unverify (honours curator words[]; clears pending review)
│       ├── songRequests.ts          # /api/song-requests POST/GET/PATCH + Telegram notify
│       ├── feedback.ts              # /api/feedback POST/GET/PATCH; auto-grants curator on accept
│       └── consent.ts               # /api/consent + /api/profile/track
├── curator/                         # Hand-curated canonical JSON payloads for verifySong
├── supabase/
│   └── migrations/                  # 001–011: schema + RLS migrations
├── src/
│   ├── App.tsx                      # Routes: /library (public), /play, /revise, /progress, /queue (curator)
│   ├── main.tsx                     # Entry point
│   ├── index.css                    # Tailwind imports
│   ├── pages/
│   │   ├── LibraryPage.tsx          # Public grid of verified songs + curator pending-requests banner
│   │   ├── PlayPage.tsx             # YouTube player + live translation (curator URL input only)
│   │   ├── QueuePage.tsx            # Curator queue (tabs: song requests + feedback/applications)
│   │   ├── FeedbackPage.tsx         # Public: comments / suggestions / curator applications
│   │   ├── CuratePage.tsx           # Public: explainer of what curation involves
│   │   ├── RevisePage.tsx           # Flashcards, matching game, lazy library deck sync
│   │   ├── ProgressPage.tsx         # Stats, vocabulary breakdown
│   │   ├── AboutPage.tsx            # Architecture diagram + contribute invitation
│   │   └── PrivacyPage.tsx          # Privacy policy
│   ├── contexts/
│   │   ├── auth/
│   │   │   ├── components/          # SignIn, SignUp, ProtectedRoute
│   │   │   ├── hooks/               # useAuth, useCurator (allowlist check)
│   │   │   └── services/            # supabaseAuth
│   │   ├── library/
│   │   │   ├── components/          # RequestSongForm (non-curator visitor form)
│   │   │   └── services/            # songRequestsClient, feedbackClient
│   │   ├── player/                  # YouTube player, playback sync, URL input
│   │   ├── translation/
│   │   │   ├── components/          # LyricsPanel (verse text), EditableLyricsPanel, VerifyBar, TranslationPanel, WordPopup
│   │   │   ├── hooks/               # useTranslation (verified-first; allowLiveTranscription flag)
│   │   │   └── services/            # transcriber, translator (confidence-aware), libraryClient
│   │   └── learning/                # Vocabulary tracking, SRS, flashcards, libraryDeckSync
│   └── shared/
│       ├── components/              # Layout (curator-only Queue tab), ConsentBanner, ErrorBoundary
│       ├── lib/                     # Constants, Supabase client
│       └── types/                   # Database types, LyricsLine (+ confidence fields), WordBreakdown
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

# Supabase service-role key (recommended).
# Used by /api/song-requests to dedup against other visitors' rows (which the
# anon role can't see under RLS) and by the consent route. Without it, the
# endpoints fall back to the anon client — rate-limiting + dedup still work
# but only see rows the anon role can read.
SUPABASE_SERVICE_ROLE_KEY=

# Telegram bot — for curator notifications on new song requests and the
# nightly auto-curation summary. Same bot/chat as the nightly task.
# Without these, the song-request endpoint logs a warning and skips the
# notification — the request still lands in the queue.
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Server port
PORT=3000
```

### 3. Set up Supabase database

Run the migration files in `supabase/migrations/` in order in the Supabase SQL editor:
- `001`–`006` — base schema (profiles, words, vocabulary, songs, revision sessions)
- `007` — verified library (`verified` columns on `songs`, `song_words` link table, `library_words` view, RLS for public-read of verified + curator-only writes)
- `008` — consent + profile geo tracking + auto-profile trigger
- `009`–`010` — nightly auto-curation queue + RLS reconcile
- `011` — `song_requests` queue for visitor-submitted requests (anon INSERT, curator SELECT/UPDATE, dedup index)
- `012` — `feedback` CRM (comments, suggestions, curator applications) with `is_public` opt-in
- `013` — `curator_allowlist` table + `is_curator()` SECURITY DEFINER function + `am_i_curator()` RPC. **Rewrites RLS on all curator-gated tables to call `is_curator()` instead of hardcoded email literals.** Seeds the table with the two existing curator emails.

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
| POST   | `/api/transcribe`                 | yt-dlp + Whisper transcription with confidence scoring per segment   |
| POST   | `/api/translate`                  | Translate full song lyrics (strict no-hallucination guard)           |
| POST   | `/api/translate/song`             | Confidence-aware bulk translate: skips low-confidence lines server-side |
| POST   | `/api/translate/line`             | Translate a single Sanskrit line (softer, best-effort prompt)        |
| POST   | `/api/translate/single-line`      | One-off translate for an arbitrary line (returns full LyricsLine)    |
| POST   | `/api/sanskrit/split`             | Sandhi splitting (word segmentation + grammar)                       |
| POST   | `/api/songs/verify`               | Curator-only: persist edited lyrics; honours curator-supplied words[]; auto-clears pending requests for the videoId |
| POST   | `/api/songs/unverify`             | Curator-only: revert a song to draft (remove from public library)    |
| POST   | `/api/song-requests`              | Public (anon or auth): submit a YouTube URL to the curator queue. Dedups + rate-limits + fires Telegram |
| GET    | `/api/song-requests`              | Curator-only: list pending requests                                  |
| PATCH  | `/api/song-requests/:id`          | Curator-only: mark as accepted / rejected / duplicate                |
| POST   | `/api/feedback`                   | Public: submit a comment, suggestion, or curator application. Kind-aware Telegram notify |
| GET    | `/api/feedback?kind=…`            | Curator-only: list feedback (optional kind/status filter)            |
| PATCH  | `/api/feedback/:id`               | Curator-only: status + notes; status='accepted' on a curator_application auto-grants curator access |
| POST   | `/api/consent`                    | Record consent click (visitor_id + optional user_id + IP)            |
| POST   | `/api/profile/track`              | Auth: capture IP-derived geolocation onto the user's profile         |

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

Four routes are open to anonymous visitors (no account needed):
- `/library` — browse all verified songs
- `/play` (verified-library only) — load any verified song, watch the video, see lyrics scroll, tap words to view their canonical meaning. Live transcription (yt-dlp + Whisper) is curator-gated; non-curators see a "request this song" form instead of the URL input. Opening `?v=<id>` for a song that isn't in the library surfaces the same request form (no silent fallthrough to Whisper). Vocabulary tracking is skipped (the visitor has no user_id to attach progress to).
- `/about` — visual architecture diagram, plain-language explanation of how songs reach the library, contribution invitation, credits
- `/privacy` — privacy notice

These are gated to signed-in users only:
- `/revise` — flashcards, matching game (writes to user_vocabulary)
- `/progress` — personal stats (reads from user_vocabulary)
- `/queue` — curator-only review queue of song requests
- The URL input + live transcription on `/play` (curator email allowlist)
- The "Verify & Save" / "Unverify" curator buttons on `/play` (same allowlist)

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

## Project Status (as of 2026-05-17)

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

#### Added 2026-05-17

- **Confidence-aware transcription pipeline** — `transcribe.ts` now scores every Whisper segment as `high` / `medium` / `low` instead of binary keep/drop. Hard rejects (foreign-script drift, "Subtitles by" boilerplate, < 4 alphabetic chars) drop pre-translate. Low-confidence lines are dropped server-side after scoring (noisy enough that surfacing them with a warning was misleading). Medium-confidence surfaces with an amber disclaimer in `LyricsPanel` + `TranslationPanel`. High renders normally. Translation cost is roughly flat for clean songs and never balloons on noisy ones.
- **Sanskrit particle allowlist** (`SANSKRIT_ALLOWLIST` in `transcribe.ts`) — ~80 high-frequency short Sanskrit words (`om`, `iti`, `tu`, `ca`, `vai`, `bhajeham`, `namo`, deity names) are never counted as English-shaped tokens and count as positive Sanskrit signal. Stops short devotional lines like `oṃ namo nārāyaṇa` from being mis-flagged. Diacritic-stripping match means `narayan` and `nārāyaṇa` both hit the allowlist.
- **Whisper avg_logprob signal** — read from `verbose_json` and used to demote borderline segments. `< -1.0` demotes one tier; `< -1.5` demotes two.
- **Deterministic Claude validator** — `temperature: 0`. Same audio → same scores across runs. Validator can only demote a tier, never inflate past the heuristic.
- **Curator-supplied `words[]` honoured at verify time** — `verifySong` checks for a non-empty curator-provided word breakdown per line; if present, sandhi-split is skipped and the words are inserted verbatim. Preserves exact diacritic forms (`नभस्` not `नभो`), ordering, and meanings. For fully-curated payloads, verify takes 1–2s instead of ~12s (no Claude calls).
- **`verifySong` clears `pending_curator_review`** — an explicit curator verify is the strongest possible signal of approval, so it now force-clears the auto-review flag. Fixes songs auto-added by the nightly task that stayed hidden from anonymous visitors even after being explicitly verified.
- **`LyricsPanel` renders canonical verse text + adds clickable word chips below** — previously it concatenated `words[].devanagari` with spaces, which destroyed sandhi-joined verses (`जगज्जालपालं` rendered as `जगत् जाल पालं`). Now renders `line.devanagari` verbatim **and** shows a compact chip strip beneath each verse — tap any chip to open the WordPopup with full meaning, dhātu, and grammar. Unfamiliar words on the active line are highlighted amber.
- **Migration 011** (`supabase/migrations/011_song_requests.sql`) — `song_requests` table with anon-INSERT / curator-SELECT-UPDATE RLS + unique-pending-per-video partial index for DB-level dedup.
- **`/api/song-requests` endpoint** — public POST validates YouTube URL, dedups against verified library + pending queue, rate-limits anon to 1/24h per `visitor_id`, sends a Telegram message to the curator. Curator-only GET + PATCH for the queue page. Tolerant of scheme-less URLs (`www.youtube.com/...`, `youtu.be/abc`, raw 11-char IDs).
- **`/queue` page** — curator-only listing of pending requests with "Take this" (→ `/play?v=…`) and "Reject" (with optional reason) actions. Verifying a song auto-clears any matching pending request. **Two tabs:** Song requests + Feedback & applications.
- **PlayPage curator-gating** — non-curators (anon or signed-in) no longer see the URL input or trigger live transcription. They see a `RequestSongForm` instead. `useTranslation`'s new `allowLiveTranscription` parameter (default false) prevents accidental Whisper triggers on stray `?v=` URLs — surfaces a friendly "not in library yet — request it?" CTA instead.
- **Layout Queue tab + LibraryPage banner** — curator-only Queue tab in bottom nav, pending-requests banner on Library page linking to /queue.
- **Migration 012** (`supabase/migrations/012_feedback.sql`) — `feedback` CRM table covering three kinds: `comment`, `suggestion`, `curator_application`. Anon INSERT + curator SELECT/UPDATE + service-role bypass. Includes `is_public` flag for opt-in public display (groundwork for a future public feedback wall).
- **`/api/feedback` endpoints** — public POST (anon allowed; curator applications require name + email manually), curator-only GET + PATCH. Rate-limit 3/24h per visitor. Kind-aware Telegram notifications (💬 / 💡 / 🌟).
- **`/feedback` page** — three-way form (comment / suggestion / curator application) with conditional curator-app fields (background, traditions, weekly hours, motivation). "Make public" opt-in for comments and suggestions.
- **`/curate` page** — explainer covering what curation involves (skills, time commitment per song, quality standards, process). Linked from feedback form and About page.
- **Footer link on every page** — "Feedback / become a curator →".
- **Migration 013** (`supabase/migrations/013_curator_allowlist.sql`) — curator allowlist moved from hardcoded sets into a Supabase table. `is_curator()` SECURITY DEFINER function + `am_i_curator()` RPC for frontend gating. Seeded with the two existing curator emails. RLS on all curator-gated tables (songs, song_requests, feedback, pending_candidates) rewritten to use `is_curator()` instead of hardcoded literals.
- **Auto-grant on application accept** — PATCH `/api/feedback` with `status='accepted'` on a curator_application row now auto-inserts the applicant's email into `curator_allowlist` (using `SUPABASE_SERVICE_ROLE_KEY`) and fires a confirmation Telegram. No more editing code to grant curator access.
- **Backend allowlist cache** — `api/lib/curatorAllowlist.ts` provides `getCuratorEmails()` (5-min in-process cache) and `invalidateCuratorCache()`, replacing the hardcoded sets in `songs.ts` / `songRequests.ts` / `feedback.ts`.
- **Frontend `useCurator` reads from AuthContext** — AuthProvider calls `supabase.rpc('am_i_curator')` on user change; `useCurator` reads the boolean. UI gating stays in sync with the live allowlist.
- **Hari Stotram added to library** — `cToCInaGzCw` (full 8-verse Shri Hari Stotram by Swami Brahmananda + opening *Oṃ namo nārāyaṇāya* + closing phalashruti). 10 lines, 182 curated word breakdowns from Stotra Ratnavali canonical source. Payload kept at `curator/hari-stotram-cToCInaGzCw.json` for re-verify.
- **Agni Sūktam added to library** — `mIVv3hsrhfM` (contemporary setting of Rigveda 1.1.1-3, 1.1.9, 1.189.1 / Īśā Up. 18, 2.23.1, and ritual *agnaye svāhā* offerings). 11 lines, 93 curated words. Payload at `curator/agni-suktam-mIVv3hsrhfM.json`.
- **Māṇḍūkya Upaniṣad added to library** — `hLl60MetHC0` (contemporary setting of Māṇḍūkya 1, 2, 6, 7, 12 — the OM + four states + turīya teaching). 9 lines, 61 curated words including foundational Advaita vocabulary (`mahāvākya`, `turīya`, `kaivalya`, `advaita`, etc.). Payload at `curator/mandukya-upanishad-hLl60MetHC0.json`.

### Remaining / known issues

- **IAST anusvāra/nasal normalization (`ṃ` vs `m`)** — Sanskrit transliteration tolerates both `rājīvalocanaṃ` (with anusvāra) and `rājīvalocanam` (with plain `m`) for the same word; literal string-match treats them as different. Affects vocabulary lookup highlighting on lyric lines when the lyric IAST and the dictionary entry disagree. Clean fix is a small canonicalisation helper applied at both read and write time, plus a one-time migration to rewrite existing rows. Not yet implemented.
- **Mark-revision and mark-learned buttons in WordPopup are stubs** — the buttons render but currently no-op for both signed-in and anonymous users. They need `vocabulary.markRevision(word)` / `vocabulary.markLearned(word)` helpers in `useVocabulary` that flip the corresponding flags on the `user_vocabulary` row. Stubbed in `PlayPage.tsx` with `TODO` comments.
- **No "draft songs" curator queue** — the curator currently has to remember which URLs they've started transcribing but not yet verified. A `/curate` page listing all unverified drafts would help. (Distinct from `/queue`, which is for *visitor-submitted* requests.)
- **No edit history** — once a verified song is edited and re-saved, the prior lyrics are overwritten with no audit trail. Acceptable for now; revisit if multiple curators or community editing is added.
- **No `revision_sessions` writes yet** — the table exists but `/revise` doesn't currently log sessions. Progress page shows real-time numbers from `user_vocabulary` directly.
- **Three optional UI follow-ups** — search/filter on `/library`, category tags on songs (stotras vs. mantras vs. bhajans), and a "Word browser" page that lists all library words with their source songs.
- **Cleanup of legacy songs RLS policies** — five overlapping policies are stacked from the migration history (snake_case curator + space-named auth policies). Functional but noisy; a future migration should reconcile.
- **No notification back to song requesters** — the curator gets a Telegram message when a request comes in, but the requester isn't notified when their request is accepted or rejected. Anon requesters have no email; signed-in requesters could be emailed but the wiring isn't there yet. Worth adding once request volume justifies it. (Curator-application acceptance _does_ fire a Telegram to the curator now via migration 013's auto-grant flow.)
- **No CAPTCHA on the request form** — currently relies on the 1/24h-per-`visitor_id` rate limit. Move to CAPTCHA / sign-in-required if spam appears.
- **No public feedback wall yet** — migration 012 provides the `is_public` flag + a public-read RLS policy, but no page renders the publicly-marked items. A ~30-min add when you want it; the schema is ready.
- **No UI for manual curator allowlist management** — accepting a curator_application via `/queue` is the automated path. To add or remove a curator outside that flow you currently insert/delete directly in Supabase. A small admin page is a nice follow-up.

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

## Nightly auto-curation (Claude scheduled task)

Songs are also added to the library via a nightly automation: a Cowork scheduled Claude task discovers new Sanskrit devotional songs on YouTube, generates canonical Devanagari + IAST + translations for the ones it can identify (well-known stotras), and writes them to Supabase. Songs land with a 24-hour `pending_curator_review` flag — they're hidden from the public `/library` view until the curator approves or 24 hours elapse.

Low-confidence candidates (songs whose source can't be identified with certainty) are queued in the `pending_candidates` table and a Telegram alert is sent to the curator for manual review.

- **Prompt** lives at [`docs/nightly-curator-prompt.md`](./docs/nightly-curator-prompt.md)
- **Schema** is in [`supabase/migrations/009_curator_review_queue.sql`](./supabase/migrations/009_curator_review_queue.sql) and [`010_songs_rls_reconcile.sql`](./supabase/migrations/010_songs_rls_reconcile.sql)
- **Architecture**: free-path — Claude does the work via Supabase MCP under the Claude Max subscription. No backend `/api/discovery/*` endpoints exist; the prompt is the entire automation.
- **Cost**: ~$0/night for known stotras (Claude Max covers it); marginal Groq Whisper cost only if a song needs audio transcription (unusual at 2 candidates/night).

### Setting up the nightly task (one-time)

1. **Apply migrations 009 + 010** in the Supabase SQL editor (both are idempotent).
2. **Confirm RLS policies on `songs`** — there should be exactly three:
   - `Public can read verified songs` (SELECT — `verified=true AND pending_curator_review=false`)
   - `Curator can manage songs` (FOR ALL — `auth.jwt()->>'email' IN ('mondweep@gmail.com','mondweep@dxsure.uk')`)
   - `Service role can manage songs` (FOR ALL — `auth.role()='service_role'`)
3. **Verify Supabase MCP write access** in your Cowork environment: try a sentinel `INSERT INTO pending_candidates (video_id, status) VALUES ('__test__','pending')` via the MCP, then `DELETE`. If both succeed, the MCP has the elevated privileges needed (it executes raw SQL via Supabase's Management API, bypassing PostgREST RLS).
4. **Create the scheduled task in Cowork**:
   - Name: `SanskritSongSync`
   - Frequency: Daily at e.g. 01:00
   - Project: vibe-cast (or whichever you connected)
   - Prompt: copy from `docs/nightly-curator-prompt.md`, filling in `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `YOUTUBE_API_KEY` placeholders with real values
5. **Manually trigger once** from Cowork to validate end-to-end before relying on the schedule. Check Telegram for the summary message; check `/library` (signed in as curator) for any auto-added songs in the 24-hour review window.

### Expected behaviour after first run

- **Anonymous visitor** at `/library`: sees only fully-public verified songs. Any newly auto-added song stays hidden for 24 hours.
- **Curator** at `/library`: sees the same public set. To see auto-added songs in review, navigate to `/play?v=<videoId>` directly (the link Telegram sent), review/edit if needed, leave as-is to auto-promote at the 24-hour mark, or click "Unverify" to remove.
- **24 hours later**: the next nightly run's Step 4 flips `pending_curator_review=false` on aged rows, and they become public.
- **Failed candidates** (low confidence): live in `pending_candidates` with `status='pending'`. Triage via Telegram message or by querying the table directly.

### Cost / safety notes

- Hard cap is the prompt's `CANDIDATES_PER_NIGHT = 1` (lowered from 2 after the initial run hit Cowork's context limit). Raise once the flow consistently completes inside the model's context budget.
- The prompt explicitly forbids hallucination — Claude is instructed to queue songs for review rather than generate uncertain canonical text.
- All writes are auditable: `songs.verified_by` records the curator's user_id; `pending_candidates.created_at` and `decided_at` track the review lifecycle.
- **Word extraction is deliberately NOT done in the nightly task** (it was eating too much context). Auto-added songs land with full `lyrics_json` but empty `words`/`song_words`. Vocabulary populates when the curator clicks Verify & Save on `/play` (which re-runs the backend's `sanskrit/split`), or via a future weekly task. Until then, auto-added songs play correctly but don't yet contribute to the canonical revise deck.
- **Context-budget contingency**: if even 1 candidate/night overruns context in Cowork (likely if you have many MCPs connected), switch to running this prompt in Claude Code with a minimal `.mcp.json` that loads only the Supabase MCP + WebFetch. Same prompt, same model, just much less tooling overhead.

## Requesting a song

If you'd like a particular Sanskrit song added to the library, the easiest path is the in-app request form:

- Open `/play` (signed-in or not) — you'll see a "Request a Sanskrit song" form
- Paste the YouTube URL and an optional note (composer, traditional name, source text — anything that helps)
- The curator gets a Telegram notification and the request appears in `/queue` for review

For songs where the lyrics are standard published verses (the daily-prayer shlokas, well-known stotras, Vedic mantras, Bhagavad-Gītā chapters, Upaniṣad passages), curation is fast — typically ~30 minutes from request to verified library entry.

Alternatively, reach out directly:

- **LinkedIn:** [Mondweep Chakravorty](https://www.linkedin.com/in/mondweepchakravorty/) — DM with the YouTube URL and any context
- **GitHub:** Open an issue at [vibe-cast](https://github.com/mondweep/vibe-cast/tree/claude/sanskrit-english-songs-8IhOE) describing the song and ideally linking to a canonical text source

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

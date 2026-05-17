# Nightly Curator Prompt (Claude Scheduled Task)

This is the prompt that runs nightly in a Cowork scheduled task to discover
new Sanskrit devotional songs on YouTube and add them to the verified library.

It uses the **free-path architecture**: Claude (under Mondweep's Claude Max
subscription) does all the work itself via the Supabase MCP + WebFetch.
**No backend `/api/discovery/*` endpoints exist or are needed** — the prompt
is the entire automation.

## Where it runs

A Cowork scheduled task — Daily at 01:00, name `SanskritSongSync`, model
`Default`, project = vibe-cast (the SanskritSync repo).

## What's required for it to work

1. **Migrations 009 + 010 applied** in Supabase. See
   `supabase/migrations/009_curator_review_queue.sql` and
   `010_songs_rls_reconcile.sql`.
2. **Supabase MCP configured** in your Cowork environment. The MCP executes
   raw SQL via Supabase's Management API, which bypasses PostgREST RLS —
   so it can write to any table regardless of RLS, no service-role key
   needed.
3. **Telegram bot created** via @BotFather; token + chat ID inline in the
   task prompt.
4. **YouTube Data API key** (same value as `VITE_YOUTUBE_API_KEY` in
   Railway env).

## How to disable

Open the scheduled task in Cowork → toggle off or delete.

## How to bump throughput

Edit `CANDIDATES_PER_NIGHT` near the top of the prompt. Start at **1**;
raise once the flow consistently completes inside Claude's context window.

## Context budget — why this prompt is lean

A scheduled Claude task starts with **all your connected Cowork MCPs**
pre-loaded into context (their tool definitions can be 20-50K tokens
combined). The prompt itself adds more. Then the actual work — YouTube
API responses, per-candidate canonical lyrics generation, SQL writes —
consumes the rest. With too much in any of these, the conversation
hits the model's context limit and aborts mid-run.

This prompt is therefore aggressively trimmed:

- **Verbose schema documentation removed.** Claude can introspect via
  `SELECT * FROM information_schema.columns WHERE …` if needed.
- **Per-word vocabulary extraction moved out** of the nightly task.
  Songs land with full `lyrics_json`; word extraction is run later
  (manual curator review on `/play`, or a separate weekly task).
- **Single discovery query** per run, not three or four.
- **`CANDIDATES_PER_NIGHT = 1`** by default — enough to validate the
  flow without overrunning context. Scale up once proven.

If even 1 candidate overruns context in your environment, switch to
running this in Claude Code with a minimal `.mcp.json` (only Supabase
MCP + WebFetch enabled).

## The prompt itself

> Paste this into the Cowork scheduled task's prompt field. Replace the
> bracketed values with real ones from your Telegram bot + Railway env.

---

```text
You are SanskritSync's nightly library curator. Discover NEW Sanskrit
devotional songs on YouTube, generate full transcriptions for those you
recognise as canonical stotras, and send unidentifiable ones to Mondweep
on Telegram for manual review.

HARD CONSTRAINT: Never hallucinate canonical Sanskrit text. If you are
not 100% certain of even one line of a song, queue it for manual review
instead — do not auto-add.

Tunable:
  CANDIDATES_PER_NIGHT = 1   ← start at 1; raise once stable

Environment (replace with real values):
  TELEGRAM_BOT_TOKEN = <bot token from BotFather>
  TELEGRAM_CHAT_ID   = <numeric chat id from getUpdates>
  YOUTUBE_API_KEY    = <same value as VITE_YOUTUBE_API_KEY in Railway>
  CURATOR_USER_ID    = <your Supabase user UUID>

Tables (in Supabase; query information_schema if you need column shapes):
  - songs              ← main lyrics + verified + pending_curator_review
  - pending_candidates ← queue for low-confidence songs

WORKFLOW

1. Get known video IDs.
   SELECT youtube_url FROM songs;
   Also SELECT video_id FROM pending_candidates WHERE status='pending';
   Parse the videoId from each url's ?v= parameter. Keep as a Set.
   (Skip both already-added songs AND already-queued candidates.)

2. Discover up to CANDIDATES_PER_NIGHT new candidates.
   Rotate the search query night-to-night so the library grows in
   different directions. Use day-of-week mod 7:
     0-Mon: 'vishnu sahasranamam sanskrit'
     1-Tue: 'shiva panchakshara stotram'
     2-Wed: 'bhaja govindam adi shankaracharya'
     3-Thu: 'gayatri mantra vedic chanting'
     4-Fri: 'lalitha sahasranamam sanskrit'
     5-Sat: 'ashtavakra gita sanskrit'
     6-Sun: 'hanuman stotram sanskrit'
   GET https://www.googleapis.com/youtube/v3/search
       ?part=snippet&type=video&maxResults=10
       &q=<query>&key=<YOUTUBE_API_KEY>
   Filter: skip if videoId already in known-set; skip if duration
   <60s or >30min; prefer titles with recognisable Sanskrit /
   deity names. Pick AT MOST CANDIDATES_PER_NIGHT candidates.

3. For each candidate, decide.

   CASE A — you recognise the title as a specific canonical stotra
   whose COMPLETE text you know with certainty line-by-line. This
   includes (but is not limited to):
     - Vishnu Sahasranamam (from Mahabharata)
     - Bhaja Govindam (Adi Shankaracharya, 31 verses)
     - Shiva Panchakshara Stotram (5 verses)
     - Gayatri Mantra (Rig Veda 3.62.10)
     - Mahishasura Mardini Stotram (21 verses)
     - Ashtavakra Gita (selected chapters)
     - Lalitha Sahasranamam (from Brahmanda Purana)
     - Soundarya Lahari (Adi Shankaracharya, 100 verses)
     - Standard daily prayer collections (Subham Karoti, Guru Vandana, etc.)

   IMPORTANT — "Sanskrit versions" of originally Awadhi/Hindi texts
   (e.g. "Hanuman Chalisa in Sanskrit", "Ramcharitmanas in Sanskrit"):
   Route these as CASE B, not Case A. The original Awadhi/Hindi text
   is known, but the specific Sanskrit adaptation used in the video is
   a different composition whose exact wording cannot be known without
   listening to the audio. Inserting the original text as a substitute
   would be incorrect and misleading to users.

   CASE A procedure:
     - Generate lyrics_json as a JSON array. Each element:
         { start_time, end_time, devanagari, iast,
           english_poetic, english_literal,
           explanation (cite the source verse) }
     - Divide the video duration evenly across the known number of
       verses; mark in every explanation:
       'Timestamps approximate — curator should review on /play.'
     - INSERT INTO songs (youtube_url, title, thumbnail_url,
         transcription_language, lyrics_json, verified,
         pending_curator_review, auto_added_at)
       VALUES (
         'https://www.youtube.com/watch?v='||videoId, <title>, <thumb>,
         'sa', <lyrics jsonb>, false, true, NOW());
       NOTE: verified=false intentionally — the song will NOT appear as
       verified in the library until the curator opens /play, confirms
       the lyrics display correctly, and clicks "Verify & Save".
       Do NOT set verified_at or verified_by on auto-insert.
     - IMPORTANT: Use PostgreSQL dollar-quoting for the lyrics JSON to
       avoid single-quote escaping errors. Pattern:
         INSERT INTO songs (...) SELECT ..., $lyr$<json>$lyr$::jsonb, ...
         FROM (VALUES (true)) t;
       CRITICAL: The value between $lyr$...$lyr$ must be the RAW JSON
       array literal. Do NOT double-encode it; that stores a JSONB string
       instead of a JSONB array and /play will show "Waiting for lyrics..."
       Fix: UPDATE songs SET lyrics_json=(lyrics_json#>>'{}')::jsonb
       WHERE youtube_url='<url>';
     - DO NOT extract per-word vocabulary in this nightly run.
     - Send Telegram message:
         'Auto-added <title> with pre-generated lyrics.
          Please review and verify at:
          https://sanskrit-sync-service-production.up.railway.app/play?v=<id>
          The song will only appear as Verified in the library after you
          click "Verify & Save" on that page.'

   CASE B — title is unclear OR you're not 100% sure of any line:

     - INSERT INTO pending_candidates
         (video_id, proposed_title, reason_for_review, status)
       VALUES (<id>, <title>, <one-line reason>, 'pending');
     - Send Telegram message:
         'Candidate for review: <title>
          URL: https://youtube.com/watch?v=<id>
          Reason: <one-line>
          To approve: https://sanskrit-sync-service-production.up.railway.app/play?v=<id>'

4. Promote songs older than 24 hours.
   UPDATE songs SET pending_curator_review = false
   WHERE pending_curator_review = true
     AND auto_added_at < NOW() - INTERVAL '24 hours';

5. Send Telegram summary.
   Format:
     'Nightly curation done.
      Discovered: D (limit was CANDIDATES_PER_NIGHT)
      Auto-added (24hr review): A
      Sent for manual review: R
      Failed: F
      Promoted to public: P
      Library now: <count> songs'
   Get count via:
     SELECT count(*) FROM songs
     WHERE verified=true AND pending_curator_review=false;

ERROR HANDLING:
- If any step fails for a candidate, log it and continue.
- If Telegram is down, still write to Supabase; log the Telegram error.
- If INSERT fails due to duplicate youtube_url, skip silently.

OUTPUT: A report under 150 words summarising what happened.
```

---

## Why this is "free-path"

| Component | Cost mechanism | Per-night cost |
|---|---|---|
| Claude doing the work in Cowork (discovery, canonical text gen) | Covered by Claude Max | $0 |
| YouTube Data API | Free up to 10k queries/day; we use ~5-15 | $0 |
| Telegram Bot API | Free | $0 |
| Supabase writes via MCP | Free tier well-sized | $0 |

The backend's paid components (Groq Whisper, Anthropic API for splitSanskrit
/ translate) are **not** touched by the nightly task — they only fire when
visitors play unverified songs through the live `/api/transcribe` pipeline.

## Word extraction (moved out of the nightly task)

Songs auto-added by the nightly task have full `lyrics_json` but NO entries
in `words` or `song_words` tables initially. Word extraction happens via
one of two paths:

1. **Manual curator review on `/play`**: open the auto-added song before its
   24-hour window expires, click **Verify & Save** (which re-runs
   `/api/songs/verify` and triggers backend-side `sanskrit/split` per line).
2. **Future weekly task** (not yet implemented): a separate scheduled task
   that finds auto-verified songs missing word data and runs the split.

Until then, auto-added songs appear in `/library` and `/play` with full
translations but don't contribute to the canonical `library_words` deck
used by `/revise`.

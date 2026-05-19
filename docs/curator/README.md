# Curator job prompts

Scheduled and on-demand prompts that run under Claude Code Web (or any
Claude environment with the Supabase MCP connected to project
`ujbvxvdfxtcagbtbtjdp`). They keep the library growing, the concept
layer in sync, and the request queue draining without manual work
between curator review sessions.

## Files

- `nightly-curation.md` — runs daily on a cron. Discovers new YouTube
  candidates, generates `lyrics_json` for canonical stotras (verified
  text only — never hallucinated), routes everything else to the manual
  review queue, re-nudges songs that have sat unreviewed > 24h, runs
  the concept top-up pass, and reports library-health metrics.
  Cadence-gated: discovery on Mon/Wed/Fri, maintenance every night.

- `adhoc-song-requests.md` — runs on demand when the curator wants to
  drain the `song_requests` queue. Same Case A / Case B classification
  as the nightly job. Also accepts inline YouTube URLs pasted into the
  prompt for one-off additions.

## Prerequisites

Both prompts depend on migration `supabase/migrations/016_curator_jobs.sql`:

1. **`private.secrets` keystore** — service-role-only table. After
   applying the migration, populate it from the Supabase SQL editor
   with the three keys the prompts load at startup:

   ```sql
   insert into private.secrets (key, value, description) values
     ('TELEGRAM_BOT_TOKEN', '<rotated BotFather token>', 'curator alerts'),
     ('YOUTUBE_API_KEY',    '<YouTube Data API v3 key>', 'discovery'),
     ('CURATOR_USER_ID',    '<curator profile.id uuid>', 'auth.users.id')
   on conflict (key) do update
     set value = excluded.value, updated_at = now();
   ```

   The `private` schema is not exposed via PostgREST, and the table has
   RLS enabled with no policies — so only service role (used by the
   Supabase MCP) can read it. Never commit real values to git.

2. **`pending_candidates.video_id` unique constraint** — required so
   both prompts can use `ON CONFLICT (video_id) DO NOTHING` when
   re-running. The migration adds it.

## Telegram

Both prompts post to chat_id `931432934` using the bot token from
`private.secrets`. If you rotate the token in BotFather, just update
the row — no prompt changes needed.

## Source of truth

The prompts in this directory are the authoritative version. When you
paste a prompt into Claude Code Web's scheduler UI, copy it from here.
Update the markdown file first, then propagate to the scheduler — the
opposite drift is hard to spot.

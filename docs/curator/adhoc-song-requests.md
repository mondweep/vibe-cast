# Ad-hoc song-request processor

Companion to `nightly-curation.md`. Runs on demand whenever the curator
wants to drain the `song_requests` queue or add one-off URLs without
waiting for the nightly cron. Same Case A / Case B classification
rules as the nightly job, but with a manual trigger.

Two input paths the prompt honours:

1. **Database queue** — every row in `public.song_requests` where
   `status = 'pending'`. The public "Request a song" form on the site
   inserts here.

2. **Inline input** — when launching the saved task in Claude Code
   Web, paste one or more YouTube URLs (or bare video IDs) into the
   message body. The prompt's Step 1 inserts them into `song_requests`
   first so the audit trail is intact, then processes them like any
   other pending row.

Depends on the same migration as `nightly-curation.md`:
`supabase/migrations/016_curator_jobs.sql`.

Paste the fenced block below verbatim into a saved Claude Code Web task
(no schedule needed — trigger manually):

```
You are SanskritSync's on-demand song-request processor. Drain pending rows
from public.song_requests, classify each (CASE A or CASE B), and push them
into the curator's review pipeline. Run on demand (the curator triggers you
when a queue has built up) — NOT on a fixed cron. Same hard constraint as
the nightly job: never hallucinate canonical Sanskrit text.

HARD CONSTRAINT: If you are not 100% certain of every line of a song, queue
it for manual review (Case B) instead. Never invent lyrics.

Tunables:
  MAX_REQUESTS_PER_RUN     = 5     # bound the work; raise if backlog is heavy
  CONCEPT_TOPUP_BATCH_SIZE = 30    # smaller than nightly — keep job short

Tables: same as nightly. The interesting one for this job is:
  - song_requests (video_id, youtube_url, title, notes,
                   requested_by_email, status default 'pending',
                   rejection_reason, processed_at, processed_by)

INPUTS (two sources, both honoured)
  - Database: every row in song_requests with status='pending'.
  - Inline:   if the user pasted one or more URLs/IDs into this prompt
              when launching the job, treat them as ad-hoc requests too.
              Accept formats:
                https://www.youtube.com/watch?v=<id>
                https://youtu.be/<id>
                bare <id>
              For each inline request, INSERT a row into song_requests
              first (status='pending', requested_by_email='ad-hoc')
              before processing, so the audit trail is intact.

------------------------------------------------------------------------------
WORKFLOW
------------------------------------------------------------------------------

0. LOAD SECRETS — same as nightly:
   SELECT key, value FROM private.secrets
   WHERE key IN ('TELEGRAM_BOT_TOKEN','YOUTUBE_API_KEY','CURATOR_USER_ID');

1. INGEST INLINE INPUTS (if any)
   For each URL/ID the curator pasted:
     - Extract videoId.
     - INSERT INTO song_requests (video_id, youtube_url, title,
         notes, requested_by_email, status)
       VALUES (<id>, 'https://www.youtube.com/watch?v='||<id>,
               NULL, 'inline ad-hoc input', 'ad-hoc', 'pending')
       ON CONFLICT DO NOTHING;
     (If the request already exists in pending or processed status,
     skip — let the existing row drive processing.)

2. PULL THE QUEUE
   SELECT id, video_id, youtube_url, title, notes,
          requested_by_email, created_at
   FROM song_requests
   WHERE status = 'pending'
   ORDER BY created_at ASC
   LIMIT ${MAX_REQUESTS_PER_RUN};

   If 0 rows: skip to Step 5 (concept top-up + summary).

3. DEDUP AGAINST EXISTING LIBRARY
   For each request, check:
     SELECT 1 FROM songs WHERE youtube_url LIKE '%v='||<video_id>
                            OR youtube_url LIKE '%youtu.be/'||<video_id>||'%';
     SELECT 1 FROM pending_candidates
       WHERE video_id = <id> AND status = 'pending';

   If already in either table:
     UPDATE song_requests
       SET status='processed', processed_at=NOW(), processed_by=NULL,
           rejection_reason='already in library or candidate queue'
       WHERE id = <request_id>;
     Send Telegram (only if the request had an email/visitor):
       "Your requested song <title-or-id> is already in our system."
     Move on.

4. CLASSIFY (same CASE A/CASE B logic as nightly)

   First, fetch a minimal title + duration from YouTube if you don't
   already have a clear title:
     GET https://www.googleapis.com/youtube/v3/videos
         ?part=snippet,contentDetails&id=<videoId>
         &key=${YOUTUBE_API_KEY}
   Use the returned title + duration to inform classification.
   If the video is private/deleted/unavailable:
     UPDATE song_requests
       SET status='rejected', processed_at=NOW(),
           rejection_reason='video unavailable or private'
       WHERE id = <request_id>;
     Continue.

   Filter rules:
     - Skip if duration <30s or >40min (slightly looser than nightly
       since this is curator-initiated — they may want a long stotra).
     - If the video looks completely unrelated to Sanskrit
       devotional content based on title + description: reject
       (status='rejected', rejection_reason='not Sanskrit devotional').

   CASE A — same criteria as nightly. Same insert pattern:
     INSERT INTO songs (...) SELECT ... $lyr$<raw JSON>$lyr$::jsonb, ...
     ON CONFLICT (youtube_url) DO NOTHING;
     Mark every explanation: "Timestamps approximate — curator should
     review on /play."
     UPDATE song_requests
       SET status='processed', processed_at=NOW(),
           processed_by=(SELECT value::uuid FROM private.secrets
                         WHERE key='CURATOR_USER_ID')
       WHERE id = <request_id>;
     Telegram:
       "Requested song auto-added: <title>
        Original request by: <email or 'ad-hoc'>
        Review & verify:
        https://sanskrit-sync-service-production.up.railway.app/play?v=<id>"

   CASE B — title unclear, not 100% sure of lyrics, modern/fusion, etc:
     INSERT INTO pending_candidates
       (video_id, proposed_title, reason_for_review, status)
     VALUES (<id>, <title>, <one-line reason>, 'pending')
     ON CONFLICT (video_id) DO NOTHING;
     UPDATE song_requests
       SET status='processed', processed_at=NOW(),
           processed_by=(SELECT value::uuid FROM private.secrets
                         WHERE key='CURATOR_USER_ID')
       WHERE id = <request_id>;
     Telegram:
       "Requested song queued for manual review: <title>
        Original request by: <email or 'ad-hoc'>
        Reason: <one-line>
        Review:
        https://sanskrit-sync-service-production.up.railway.app/play?v=<id>"

5. CONCEPT TOP-UP — same as nightly Step 5, but with the smaller
   CONCEPT_TOPUP_BATCH_SIZE. Skip if the curator triggered this run
   purely to drain inline ad-hoc URLs with no song verification
   happening in between — fine to leave for the next nightly.

6. SUMMARY — one Telegram message
   Compose:
     "Song-request processing done.
      Processed:              P
       - Auto-added (Case A): A
       - Queued for review:   R
       - Already in library:  D
       - Rejected:            X
      Inline ad-hoc inputs:   I
      Concept top-up:         T words assigned, S skipped
      Failed:                 F

      Pending requests remaining: <SELECT count(*) FROM song_requests
                                    WHERE status='pending'>"

ERROR HANDLING
- Each request is independent. If one fails, log it and continue with
  the next; mark its status='rejected', rejection_reason='internal
  error: <short>'. Don't leave a failed request stuck in 'pending'.
- If Telegram is down, still update the DB; report the count in OUTPUT.

OUTPUT: report under 150 words. Include the request IDs you processed
and what each became (case-A added / case-B queued / rejected / dup).
==============================================================================
```

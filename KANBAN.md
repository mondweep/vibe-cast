# SanskritSync — Kanban

This file is a **read-only mirror** of the live `kanban_items` table in Supabase. The single source of truth is the database; this Markdown copy exists so the board lives in git history and gets a code review trail when it changes.

**Editing.** Don't hand-edit this file to add new items or move them between columns — those changes won't land in the DB and the public `/roadmap` page won't see them. Instead, ask Claude in Cowork ("add ENG-005: X", "move MOD-001 to in_progress", "mark ENG-001 done") and Claude will update the rows directly. Then regenerate this file from the DB to commit.

**Public face.** Everything in `kanban_items` is rendered at `/roadmap`. Authenticated visitors can up-vote backlog items via the `kanban_votes` table; backlog items sort by vote count so the most-wanted ideas rise.

Conventions
- Items have a stable `code` (e.g. `ENG-001`) so we can cross-reference across PRs, commits, and chat.
- Status lanes: `backlog` → `in_progress` → `done`.
- Phase markers (P1, P2, P3) come from the feasibility discussion that spawned the idea.

---

## Backlog (ideas)

### ENG-002 · Line-scoped lyric suggestions from users (Phase 2)
**Goal:** Sanskrit scholars / power-users can tap a specific line in the lyrics panel and submit a structured correction (`devanagari`, `iast`, `english`, `note`). Curator sees a badge next to that line, opens a side-by-side diff, and can apply with one click into `lyrics_json`. Drives lyric quality up via the long tail of users who know specific texts better than the curator.
- Schema: extend `song_comments` with `line_number int`, `type text check in ('comment','suggestion','question')`, optional `suggested_devanagari/iast/english/note` columns (or JSONB `suggestion_payload`)
- Curator UI: `/curator/suggestions` page; diff-and-apply flow that writes a snapshot to `accepted_suggestions` audit table before mutating `lyrics_json`
- Telegram: per-event notification (more important than plain comments — these are potential lyrics improvements)
- Depends on ENG-001 shipping first.

### ENG-003 · Reputation / weighted suggestion ranking (Phase 3)
**Goal:** Once we have a few power-users, climb a `reputation` score when their suggestions get accepted. High-rep users surface first in the curator queue; eventually they may get auto-merge rights for low-risk edits.

### MOD-001 · Comment moderation tools (rate limits, hide/flag, audit log)
**Goal:** Curator can hide a comment without hard-delete; per-user rate limits (e.g. 20 comments/day); profanity prefilter. Add hide_reason + audited curator action log.

### NOTIF-001 · Per-user notification preferences (Slack/Telegram opt-in)
**Goal:** Let signed-in users get notified when their comment is replied to or their suggestion is accepted. Stretch: digest preferences.

### LIB-001 · Like-count sort + "Trending" badge on Library page
**Goal:** Sort the library by like-count; show a "Trending" badge on songs whose like rate is climbing this week.

---

## In progress

### KAN-001 · Public, vote-up Kanban / roadmap page
**Goal:** Promote the Kanban from a private MD file to a public `/roadmap` page with authed vote-ups, so prioritisation is user-led.
- ✅ Migration 018 applied (`kanban_items`, `kanban_votes`, RLS, updated-at trigger)
- ✅ DB seeded with all current items (9 rows)
- ✅ API: `GET /api/kanban`, `POST/DELETE /api/kanban/items/:id/votes`
- ✅ Frontend: `/roadmap` page with three columns (Backlog / In Progress / Done), vote button reusing LikeButton pattern, expandable item bodies; nav link added
- ✅ This `KANBAN.md` repositioned as a read-only mirror of the DB
- Decision: curator edits items via Cowork (chat-driven SQL); no in-app admin form
- ⏳ Needs `git push` + Railway redeploy to go live
- ⏳ Future: simple "regenerate KANBAN.md from DB" script for git-history audit

Started: 2026-05-19 · Built: 2026-05-19

### ENG-001 · Likes + plain song-level comments + curator digest (Phase 1)
**Goal:** Authenticated users can like songs and leave plain comments on the `/play` page. Comments are paginated (20 per page, cursor on `created_at`). Curator gets a daily Telegram digest of new activity. Foundation for ENG-002 and beyond.
- ✅ Migration 017 applied (`song_likes`, `song_comments`, RLS, indexes)
- ✅ API: `GET/POST/DELETE /api/songs/:videoId/likes`, `GET/POST /api/songs/:videoId/comments`, `PATCH/DELETE /api/comments/:id`
- ✅ Frontend: `LikeButton`, `CommentsSection` (composer, edit, delete, curator-hide) on PlayPage below the lyrics
- ✅ Cursor-based pagination on `created_at desc`, 20/page (`Load older comments` button)
- ✅ Type-check passes for both `tsconfig.app.json` and `tsconfig.server.json`
- ⏳ Daily Telegram digest still to do — recommend cron at 09:00 UTC summarising the last 24h
- ⏳ Curator moderation page (cross-song hidden queue) — deferred to MOD-001
- Needs `git push` + Railway redeploy to go live.

Started: 2026-05-19 · Built: 2026-05-19

---

## Done

### TIER2-DISCLAIMER · Fusion-rendition source-text disclaimer banner on /play
**Goal:** When a song is tagged `lyrics-are-source-text`, render an info banner above the lyrics panel explaining that the displayed lyrics are the canonical source text, not a literal transcription. Helps non-Sanskrit-reading curators understand modern fusion tracks.
- Tag applied to: `MlQOghQhMaE` (Asato Mā Sadgamaya), `1YnABwe6C0g` (Khoj - Nasadiya Sukta)
- Frontend: `SourceTextDisclaimerBanner.tsx`, conditionally rendered in `PlayPage.tsx` based on `songs.tags`
- Hook: `useTranslation` now pulls `tags` from `songs` and exposes them
- Verified: VerifyBar doesn't strip tags on Verify & Save (API endpoint preserves `tags` when not in payload)
- Started + completed: 2026-05-19. Needs `git push` + Railway redeploy before going live.

### SURFACE-CANONICAL-FOR-FUSION · Surface canonical verses for fusion tracks
**Goal:** When a modern fusion/post-rock track is based on a canonical mantra/stotra I fully know, surface the canonical verses into the songs table (verified=false, pending_curator_review=true) with the `lyrics-are-source-text` tag, rather than leaving the candidate empty. Lets the non-Sanskrit-reading curator listen and match line-by-line.
- Songs upgraded from `pending_candidates` to `songs`: Asato Mā Sadgamaya, Khoj - Nasadiya Sukta
- Persistent rule saved to memory (`feedback_surface_canonical_for_fusion.md`)
- Completed: 2026-05-19

# Frontend ticket: Render "lyrics are source text" disclaimer banner on `/play`

## Background

For modern fusion / post-rock / ambient / electronic renditions of canonical mantras and stotras, the `lyrics_json` we surface to the curator contains the **canonical source text** that inspired the track — not a literal transcription of what's sung. The track may:

- repeat lines several times
- fragment lines across instrumental sections
- interleave verses out of canonical order
- add original phrases (English hooks, vocalisations, mantra fragments) that aren't in the source text
- omit verses entirely

The curator (who does not necessarily read Sanskrit) needs an explicit, visible disclaimer above the lyrics panel so they don't expect a literal line-by-line transcription when they listen.

## Trigger

Songs in the `public.songs` table that should show the banner carry the tag `lyrics-are-source-text` in the `tags text[]` column.

Currently tagged (as of 2026-05-19):
- `561d921f-6836-4335-aded-39d71cbb2ee9` — Asato Mā Sadgamaya (Samskara Stream)
- `78e76f96-305a-4e68-a91e-18c2dcb60182` — Khoj - Nasadiya Sukta (Samskara Stream)

The auto-ingest pipeline will keep applying this tag to future fusion renditions.

## Acceptance criteria

1. On the `/play?v=<videoId>` page, when the loaded song's `tags` array contains `lyrics-are-source-text`, render an info banner immediately above the lyrics panel.
2. Banner copy:
   > **Lyrics shown are the canonical source text that inspired this track.**  This is a modern fusion rendition — the audio may repeat, fragment, reorder or omit lines, or add original phrases not in the source. Use the timestamps as a starting point and adjust to match what you hear.
3. Banner style: information / neutral (not error / warning). Suggested: subtle blue or neutral-grey background, info icon, readable on both light and dark themes. Dismissible per-session is fine; persistence not required.
4. When the tag is absent, no banner is rendered (default behaviour).
5. Banner must NOT be stripped when the curator clicks **Verify & Save** — the tag persists on the row independently of `verified` / `pending_curator_review`, so the banner continues to show for end-users after verification.
6. The banner appears regardless of whether `verified` is true or false — it's a property of the song (fusion rendition), not of its review state.

## Out of scope (for this ticket)

- Adding a per-song custom disclaimer text. The boilerplate above is sufficient for now; revisit if/when songs need bespoke wording.
- Localising the banner copy.
- Surfacing the tag elsewhere in the UI (e.g. song-card badges). Can come later.

## Test cases

| Scenario | Expected |
|---|---|
| Song has `lyrics-are-source-text` in `tags`, `verified=false` | Banner shown above lyrics panel |
| Song has `lyrics-are-source-text` in `tags`, `verified=true` | Banner still shown |
| Song does not have the tag | No banner |
| Song has tags array but is empty / null | No banner, no crash |
| User dismisses banner during a session | Re-appears on page reload (acceptable v1) |

## Notes for the implementer

- The tag value is a plain string `lyrics-are-source-text` (kebab-case, matching other tags). Compare case-sensitively.
- The `tags` column is `text[]`; in JS this comes through as `string[] | null`.
- Existing tags on other songs include `classical-stotra`, `metal-fusion`, `contemporary`, `rigveda`, `upanishadic`, etc. — those are descriptive metadata and should NOT trigger the banner. Only `lyrics-are-source-text` does.

## Backstory / why this matters

Without the banner, a non-Sanskrit-reading curator opening a 7-minute raga post-rock track on `/play` would see four canonical mantra lines split evenly across the duration and assume the track sings each line for ~108 seconds straight. In reality the track will repeat the four lines a dozen times, mix in English vocalisations, and have long instrumental passages. The banner reframes the expectation so the curator listens for the lines and adjusts timings rather than treating the displayed lyrics as a literal transcript.

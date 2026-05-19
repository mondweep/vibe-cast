/**
 * Disclaimer banner shown above the lyrics panel for songs tagged
 * `lyrics-are-source-text` — i.e. modern fusion / post-rock / ambient
 * renditions where the lyrics_json we surface is the canonical source
 * text that inspired the track, not a literal transcription.
 *
 * The audio may repeat, fragment, reorder, or omit lines, or add
 * original phrases (English hooks, vocalisations) not in the source.
 * Without this banner, a non-Sanskrit-reading curator could mistake
 * the displayed lyrics for a line-by-line transcript.
 *
 * Trigger: songs.tags array contains 'lyrics-are-source-text'.
 * Rendering is fully data-driven — adding the tag in Supabase is
 * enough; no code change per song.
 */
export function SourceTextDisclaimerBanner() {
  return (
    <div
      role="note"
      aria-label="Source text disclaimer"
      className="rounded-md border border-sky-500/30 bg-sky-500/10 text-sky-100 px-4 py-3 text-sm flex gap-3 items-start"
    >
      <span aria-hidden className="text-sky-300 mt-0.5">ℹ️</span>
      <div className="space-y-1">
        <p className="font-medium text-sky-200">
          Lyrics shown are the canonical source text that inspired this track.
        </p>
        <p className="text-sky-100/80">
          This is a modern fusion rendition — the audio may repeat, fragment,
          reorder or omit lines, or add original phrases not in the source.
          Use the timestamps as a starting point and adjust to match what you
          hear.
        </p>
      </div>
    </div>
  );
}

/** Tag string the frontend checks for on songs.tags. Exported so other
 *  components (Library badges, admin tooling) can reuse the same constant
 *  rather than duplicating the literal. */
export const LYRICS_ARE_SOURCE_TEXT_TAG = 'lyrics-are-source-text';

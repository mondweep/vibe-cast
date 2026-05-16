// Curator-only action bar shown above the lyrics panel on /play.
// Surfaces:
//   - "Verified ✓" badge when the loaded song is already in the library
//   - "Edit lines" toggle (puts each line into editable form fields)
//   - "Verify & Save" / "Save changes" — calls /api/songs/verify (upsert)
//   - "Unverify" — calls /api/songs/unverify
//
// Visible only when the signed-in email is in the curator allowlist.

import { useState } from 'react';
import { CheckCircle2, Edit3, Save, X, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../auth/hooks/useAuth';
import { isCuratorEmail, verifySong, unverifySong, type VerifyResult } from '../services/libraryClient';
import type { LyricsLine } from '../../../shared/types/database.types';

interface Props {
  videoId: string;
  lines: LyricsLine[];
  isVerified: boolean;
  transcriptionLanguage: string | null;
  editing: boolean;
  onToggleEdit: () => void;
  /** Called after a successful verify so the page can refresh state. */
  onVerified?: (result: VerifyResult) => void;
  /** Called after a successful unverify. */
  onUnverified?: () => void;
}

export function VerifyBar({
  videoId,
  lines,
  isVerified,
  transcriptionLanguage,
  editing,
  onToggleEdit,
  onVerified,
  onUnverified,
}: Props) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<VerifyResult['wordExtraction'] | null>(null);

  if (!isCuratorEmail(user?.email)) return null;
  if (lines.length === 0) return null;

  async function handleVerify() {
    setBusy(true);
    setError(null);
    setExtraction(null);
    try {
      const result = await verifySong({
        videoId,
        lines,
        language: transcriptionLanguage ?? undefined,
      });
      setExtraction(result.wordExtraction);
      onVerified?.(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleUnverify() {
    if (!confirm('Remove this song from the public library?')) return;
    setBusy(true);
    setError(null);
    try {
      await unverifySong(videoId);
      onUnverified?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-800 bg-gray-900/60 px-3 py-2">
        {isVerified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/70 px-2 py-0.5 text-xs text-emerald-300">
            <CheckCircle2 size={12} /> Verified
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-950/70 px-2 py-0.5 text-xs text-amber-300">
            <AlertTriangle size={12} /> Draft — not in library
          </span>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            onClick={onToggleEdit}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
              editing
                ? 'border border-amber-500/50 bg-amber-500/15 text-amber-300'
                : 'border border-gray-700 text-gray-300 hover:border-amber-500/40 hover:text-amber-300'
            }`}
            disabled={busy}
          >
            {editing ? <X size={14} /> : <Edit3 size={14} />}
            {editing ? 'Exit edit' : 'Edit lines'}
          </button>

          <button
            onClick={handleVerify}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white shadow-sm transition-colors hover:bg-emerald-500 disabled:opacity-50"
          >
            <Save size={14} />
            {busy ? 'Saving…' : isVerified ? 'Save changes' : 'Verify & Save'}
          </button>

          {isVerified && (
            <button
              onClick={handleUnverify}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-md border border-red-900 bg-red-950/30 px-2 py-1 text-xs text-red-300 transition-colors hover:bg-red-900/40 disabled:opacity-50"
              title="Remove from public library"
            >
              <Trash2 size={14} /> Unverify
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-900 bg-red-950/40 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      {extraction && (
        <div className="rounded-md border border-emerald-900 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-200">
          {(() => {
            const ok = extraction.filter((e) => e.words !== undefined);
            const total = ok.reduce((sum, e) => sum + (e.words ?? 0), 0);
            const failed = extraction.length - ok.length;
            return (
              <>
                Saved. Extracted {total} word{total === 1 ? '' : 's'} from{' '}
                {ok.length} line{ok.length === 1 ? '' : 's'} into the canonical
                vocabulary.
                {failed > 0 && (
                  <span className="ml-1 text-amber-300">
                    {failed} line{failed === 1 ? '' : 's'} could not be split —
                    edit those lines and re-save to capture them.
                  </span>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

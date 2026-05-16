// Lazy "library deck" pre-populate.
//
// Every verified song in the public library contributes its words to a
// canonical vocabulary (library_words view). When a signed-in user visits
// /revise we want them to have those words already in their personal SRS
// deck (user_vocabulary), without forcing a separate onboarding step.
//
// Strategy: on revise mount, diff library_words against the user's existing
// user_vocabulary rows. For any words the user doesn't have yet, bulk-insert
// a fresh row with default SRS fields. This is idempotent and cheap to run
// repeatedly — and it also catches newly-verified songs added after the
// user signed up.

import { supabase } from '../../../shared/lib/supabaseClient';

export interface SyncResult {
  added: number;
  alreadyHad: number;
}

export async function syncLibraryDeck(userId: string): Promise<SyncResult> {
  // 1. All distinct word ids that appear in any verified song.
  const { data: libRows, error: libErr } = await (supabase
    .from('library_words')
    .select('id') as any);
  if (libErr) throw new Error(`Library lookup failed: ${libErr.message}`);
  const libraryIds = new Set<string>((libRows as { id: string }[] | null)?.map((r) => r.id) ?? []);

  if (libraryIds.size === 0) return { added: 0, alreadyHad: 0 };

  // 2. Words the user already has.
  const { data: ownedRows, error: ownedErr } = await (supabase
    .from('user_vocabulary')
    .select('word_id')
    .eq('user_id', userId) as any);
  if (ownedErr) throw new Error(`Existing-vocab lookup failed: ${ownedErr.message}`);
  const owned = new Set<string>((ownedRows as { word_id: string }[] | null)?.map((r) => r.word_id) ?? []);

  // 3. Diff.
  const toAdd = [...libraryIds].filter((id) => !owned.has(id));
  if (toAdd.length === 0) {
    return { added: 0, alreadyHad: owned.size };
  }

  // 4. Bulk insert with default SRS fields. RLS allows users to insert their
  // own user_vocabulary rows (policy "Users can manage own vocabulary").
  const rows = toAdd.map((wordId) => ({
    user_id: userId,
    word_id: wordId,
    // encounter_count defaults to 1 in schema; bump to 0 by NOT setting it
    // would violate NOT NULL — leave default so first encounter still counts.
  }));

  const { error: insErr } = await ((supabase
    .from('user_vocabulary') as any)
    .insert(rows));
  if (insErr) {
    // Could race with another tab inserting same rows — ignore unique violations.
    if (!/duplicate key|unique/i.test(insErr.message)) {
      throw new Error(`Pre-populate insert failed: ${insErr.message}`);
    }
  }

  return { added: toAdd.length, alreadyHad: owned.size };
}

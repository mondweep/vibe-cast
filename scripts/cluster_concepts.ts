/**
 * One-off concept clustering pipeline.
 *
 * Reads every distinct (devanagari, iast, meaning) word in the verified
 * library, asks Claude to cluster them into ~20-30 broad concepts, and
 * upserts the result into `concepts` and `word_concepts`.
 *
 * Run with:
 *   SUPABASE_URL=...                  \
 *   SUPABASE_SERVICE_ROLE_KEY=...     \
 *   ANTHROPIC_API_KEY=...             \
 *   npx tsx scripts/cluster_concepts.ts
 *
 * Optional flags:
 *   --dry-run         Print the proposed clustering; don't write to Supabase.
 *   --max-words=N     Cap the input word list (smoke-testing on a slice).
 *   --target-count=N  Ask Claude for N concepts (default 25).
 *
 * Idempotent: re-running upserts on slug. To start over completely, run
 * `delete from word_concepts; delete from concepts;` in SQL first.
 */

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.')
  process.exit(1)
}
if (!ANTHROPIC_API_KEY) {
  console.error('FATAL: ANTHROPIC_API_KEY is required.')
  process.exit(1)
}

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const MAX_WORDS = Number(
  process.argv.find((a) => a.startsWith('--max-words='))?.split('=')[1] || 0
)
const TARGET_COUNT = Number(
  process.argv.find((a) => a.startsWith('--target-count='))?.split('=')[1] || 25
)
const MODEL = process.env.CLUSTER_MODEL || 'claude-sonnet-4-5'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

// ---------------------------------------------------------------------------

type LibraryWord = {
  id: string
  devanagari: string
  iast: string
  meaning_short: string
  meaning_full: string | null
}

type ConceptProposal = {
  slug: string
  label: string
  summary: string
  color: string
  display_order: number
  word_iasts: string[] // matches LibraryWord.iast
}

async function loadLibraryWords(): Promise<LibraryWord[]> {
  console.log('Loading library_words ...')
  // library_words is a view limited to verified songs.
  const { data, error } = await supabase
    .from('library_words')
    .select('id, devanagari, iast, meaning_short, meaning_full')
  if (error) throw new Error(`load library_words: ${error.message}`)
  let rows = data || []
  // Dedupe by iast (the view should already do this, but be defensive).
  const seen = new Set<string>()
  rows = rows.filter((r) => {
    if (seen.has(r.iast)) return false
    seen.add(r.iast)
    return true
  })
  rows.sort((a, b) => a.iast.localeCompare(b.iast))
  if (MAX_WORDS > 0) rows = rows.slice(0, MAX_WORDS)
  console.log(`  ${rows.length} unique words`)
  return rows
}

function buildPrompt(words: LibraryWord[], targetCount: number): string {
  const wordLines = words
    .map((w, i) => `${i + 1}. ${w.iast} (${w.devanagari}) — ${w.meaning_short}`)
    .join('\n')

  return `You are organising Sanskrit liturgical vocabulary into a knowledge graph for a learner.

Cluster the following ${words.length} words into **${targetCount} broad concept groups**. The goal is the same a textbook chapter list — coarse enough that a learner can hold the whole map in their head, fine enough that each group has internal coherence.

GUIDELINES:
- Each concept should cover ~30-50 words on average. If you find yourself making a concept with fewer than 10 words, merge it.
- Prefer thematic groupings over grammatical ones. "Forms of Vishnu" is better than "Compound nouns".
- A word may belong to **at most 2** concepts (primary + secondary). Most words should have just one.
- Concepts should be self-evident to a Sanskrit/Hindu-philosophy learner. Avoid jargon in the label.
- Use a stable slug: lowercase kebab-case, like "forms-of-vishnu", "cosmology-and-creation".
- Pick a distinct hex colour for each concept (so the graph reads visually).
- Order concepts from most-frequent (display_order=0) to least.

WORDS TO CLUSTER:
${wordLines}

OUTPUT FORMAT (strict JSON, no preamble, no markdown fence):
{
  "concepts": [
    {
      "slug": "forms-of-vishnu",
      "label": "Forms of Vishnu",
      "summary": "Names and incarnations of Vishnu — Krishna, Rama, Narasimha, Vamana, etc.",
      "color": "#5B7FFF",
      "display_order": 0,
      "word_iasts": ["viṣṇuḥ", "kṛṣṇaḥ", "rāmaḥ", "..."]
    },
    ...
  ]
}

IMPORTANT:
- Every word from the input list must appear in **at least one** concept's word_iasts. Use the exact iast string as given.
- For words that genuinely fit two concepts, list the iast in **both** word_iasts arrays.
- Do not invent words; only use iasts from the input list.
- Aim for exactly ${targetCount} concepts.`
}

type RawConcept = Omit<ConceptProposal, 'word_iasts'> & { word_iasts: string[] }

async function clusterWithClaude(
  words: LibraryWord[],
  targetCount: number,
): Promise<ConceptProposal[]> {
  console.log(`Asking Claude (${MODEL}) to cluster into ${targetCount} concepts ...`)
  const prompt = buildPrompt(words, targetCount)

  const resp = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 16000,
    temperature: 0.1,
    messages: [{ role: 'user', content: prompt }],
  })

  const textBlock = resp.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned no text block')
  }
  let text = textBlock.text.trim()
  // Strip code fences if Claude wrapped despite instructions.
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  }

  let parsed: { concepts: RawConcept[] }
  try {
    parsed = JSON.parse(text)
  } catch (e) {
    console.error('Claude response was not valid JSON:')
    console.error(text.slice(0, 800))
    throw e
  }

  // Validate that every iast in word_iasts exists in our word list.
  const validIasts = new Set(words.map((w) => w.iast))
  const concepts: ConceptProposal[] = []
  let unknown = 0
  for (const c of parsed.concepts) {
    const known = c.word_iasts.filter((i) => {
      if (validIasts.has(i)) return true
      unknown++
      return false
    })
    concepts.push({
      slug: c.slug,
      label: c.label,
      summary: c.summary,
      color: c.color,
      display_order: c.display_order,
      word_iasts: known,
    })
  }
  if (unknown > 0) {
    console.warn(`  ${unknown} word_iasts in Claude's output didn't match any library word — skipping those`)
  }

  // Coverage report
  const covered = new Set<string>()
  for (const c of concepts) c.word_iasts.forEach((i) => covered.add(i))
  const missing = words.filter((w) => !covered.has(w.iast))
  console.log(`  ${concepts.length} concepts, ${covered.size}/${words.length} words covered`)
  if (missing.length > 0) {
    console.warn(`  ${missing.length} words have no concept:`)
    for (const w of missing.slice(0, 10)) console.warn(`    - ${w.iast} (${w.meaning_short})`)
    if (missing.length > 10) console.warn(`    ... and ${missing.length - 10} more`)
  }

  return concepts
}

async function upsertConcepts(
  proposals: ConceptProposal[],
  words: LibraryWord[],
): Promise<void> {
  console.log('Upserting concepts ...')

  // 1. Upsert concept rows by slug.
  const conceptRows = proposals.map((c) => ({
    slug: c.slug,
    label: c.label,
    summary: c.summary,
    color: c.color,
    display_order: c.display_order,
  }))
  const { data: conceptData, error: conceptErr } = await supabase
    .from('concepts')
    .upsert(conceptRows, { onConflict: 'slug' })
    .select('id, slug')
  if (conceptErr) throw new Error(`upsert concepts: ${conceptErr.message}`)
  if (!conceptData) throw new Error('upsert concepts returned no data')
  console.log(`  ${conceptData.length} concept rows`)
  const slugToId = new Map<string, string>(conceptData.map((c) => [c.slug, c.id]))

  // 2. Build word_concepts rows.
  const iastToWordId = new Map<string, string>(words.map((w) => [w.iast, w.id]))
  type WordConceptRow = { word_id: string; concept_id: string; weight: number }
  const wcRowsMap = new Map<string, WordConceptRow>() // dedupe (word_id, concept_id)

  for (const c of proposals) {
    const conceptId = slugToId.get(c.slug)
    if (!conceptId) continue
    // The first concept a word lands in gets weight 1.0; secondary memberships 0.5.
    for (const iast of c.word_iasts) {
      const wordId = iastToWordId.get(iast)
      if (!wordId) continue
      const key = `${wordId}:${conceptId}`
      if (wcRowsMap.has(key)) continue
      // weight: 1.0 if this is the word's first concept, else 0.5
      const isPrimary = ![...wcRowsMap.values()].some((r) => r.word_id === wordId)
      wcRowsMap.set(key, { word_id: wordId, concept_id: conceptId, weight: isPrimary ? 1.0 : 0.5 })
    }
  }
  const wcRows = [...wcRowsMap.values()]
  console.log(`  ${wcRows.length} word_concepts rows`)

  // 3. Replace strategy: delete all word_concepts for these words, then insert.
  //    This keeps the table clean if Claude re-clusters into different concepts.
  const allWordIds = words.map((w) => w.id)
  // Supabase doesn't love huge IN lists; chunk by 200.
  for (let i = 0; i < allWordIds.length; i += 200) {
    const chunk = allWordIds.slice(i, i + 200)
    const { error } = await supabase.from('word_concepts').delete().in('word_id', chunk)
    if (error) throw new Error(`delete word_concepts: ${error.message}`)
  }
  // Insert in chunks of 500.
  for (let i = 0; i < wcRows.length; i += 500) {
    const chunk = wcRows.slice(i, i + 500)
    const { error } = await supabase.from('word_concepts').insert(chunk)
    if (error) throw new Error(`insert word_concepts: ${error.message}`)
  }
  console.log('  done')
}

// ---------------------------------------------------------------------------

async function main() {
  const words = await loadLibraryWords()
  if (words.length === 0) {
    console.error('No library words found. Did you forget to POST any verified songs?')
    process.exit(2)
  }

  const proposals = await clusterWithClaude(words, TARGET_COUNT)

  if (DRY_RUN) {
    console.log('\n--- DRY RUN: proposed clustering ---')
    for (const c of proposals) {
      console.log(`\n[${c.display_order}] ${c.label}  (${c.slug}, ${c.color})`)
      console.log(`    ${c.summary}`)
      console.log(`    ${c.word_iasts.length} words: ${c.word_iasts.slice(0, 8).join(', ')}${c.word_iasts.length > 8 ? ', ...' : ''}`)
    }
    return
  }

  await upsertConcepts(proposals, words)
  console.log('\nDone. Open /graph to see the result.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

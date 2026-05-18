/**
 * /graph — the concept browser.
 *
 * Two-pane layout: concepts list on the left, word cards on the right.
 * Replaces the earlier React-Flow radial graph, which was unreadable
 * once more than one bucket was open (nodes overlapped and labels
 * stacked on top of each other).
 *
 * Data:
 *   GET /api/concepts          — one trip on mount, populates left list
 *   GET /api/concepts/:slug    — lazy per selection, populates right pane
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, Sparkles, X } from 'lucide-react'

type ConceptRow = {
  id: string
  slug: string
  label: string
  summary: string | null
  color: string | null
  display_order: number
  word_count: number
}

type WordRow = {
  id: string
  devanagari: string
  iast: string
  meaning_short: string
  meaning_full?: string | null
}

type ConceptDetail = { concept: ConceptRow; words: WordRow[] }

export function GraphPage() {
  const [concepts, setConcepts] = useState<ConceptRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [detail, setDetail] = useState<ConceptDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [conceptFilter, setConceptFilter] = useState('')
  const [wordFilter, setWordFilter] = useState('')

  // Cache concept details so re-selecting is instant.
  const [detailCache, setDetailCache] = useState<Map<string, ConceptDetail>>(
    () => new Map(),
  )

  // Initial concept fetch
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const resp = await fetch('/api/concepts')
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const data = await resp.json()
        if (!cancelled) {
          const list: ConceptRow[] = data.concepts || []
          setConcepts(list)
          // Auto-select the first one so the right pane isn't empty.
          if (list.length > 0) setSelectedSlug(list[0].slug)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load concepts')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Lazy-load detail when selection changes
  useEffect(() => {
    if (!selectedSlug) {
      setDetail(null)
      return
    }
    const cached = detailCache.get(selectedSlug)
    if (cached) {
      setDetail(cached)
      setWordFilter('')
      return
    }
    let cancelled = false
    setDetailLoading(true)
    setDetail(null)
    setWordFilter('')
    ;(async () => {
      try {
        const resp = await fetch(`/api/concepts/${encodeURIComponent(selectedSlug)}`)
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const data = (await resp.json()) as ConceptDetail
        if (!cancelled) {
          setDetail(data)
          setDetailCache((prev) => {
            const next = new Map(prev)
            next.set(selectedSlug, data)
            return next
          })
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load concept')
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedSlug, detailCache])

  // Filtered concept list
  const visibleConcepts = useMemo(() => {
    const q = conceptFilter.trim().toLowerCase()
    if (!q) return concepts
    return concepts.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.slug.includes(q) ||
        (c.summary || '').toLowerCase().includes(q),
    )
  }, [concepts, conceptFilter])

  // Filtered word list
  const visibleWords = useMemo(() => {
    if (!detail) return []
    const q = wordFilter.trim().toLowerCase()
    if (!q) return detail.words
    return detail.words.filter(
      (w) =>
        w.iast.toLowerCase().includes(q) ||
        w.devanagari.includes(q) ||
        w.meaning_short.toLowerCase().includes(q),
    )
  }, [detail, wordFilter])

  const handleSelect = useCallback((slug: string) => {
    setSelectedSlug(slug)
  }, [])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-16 text-center text-gray-400">
        <Sparkles className="inline mb-3 text-amber-400/60" size={32} />
        <div>Loading concepts…</div>
      </div>
    )
  }
  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center text-rose-400">
        Failed to load: {error}
      </div>
    )
  }
  if (concepts.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center text-gray-400 space-y-3">
        <Sparkles className="inline text-amber-400/60" size={36} />
        <div className="text-lg text-gray-200">No concepts yet.</div>
        <p className="text-sm">
          Concepts are seeded from the verified library — once seeded, refresh this page.
        </p>
      </div>
    )
  }

  const totalWords = concepts.reduce((acc, c) => acc + c.word_count, 0)
  const selected = concepts.find((c) => c.slug === selectedSlug) || null

  return (
    <div className="-m-6 h-[calc(100vh-160px)] flex flex-col md:flex-row bg-gray-950 text-gray-100">
      {/* LEFT: concept list */}
      <aside className="md:w-80 md:min-w-[260px] md:max-w-[340px] border-b md:border-b-0 md:border-r border-gray-800 flex flex-col bg-gray-900/60">
        <div className="px-4 py-3 border-b border-gray-800">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-200">Concepts</h2>
            <span className="text-[11px] text-gray-500">
              {concepts.length} · {totalWords} words
            </span>
          </div>
          <div className="relative">
            <Search
              size={13}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              value={conceptFilter}
              onChange={(e) => setConceptFilter(e.target.value)}
              placeholder="Filter concepts…"
              className="w-full pl-7 pr-7 py-1.5 bg-gray-950 border border-gray-800 rounded-md text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-gray-700"
            />
            {conceptFilter && (
              <button
                onClick={() => setConceptFilter('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                aria-label="clear filter"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {visibleConcepts.length === 0 ? (
            <div className="px-4 py-6 text-xs text-gray-500 text-center">No matches.</div>
          ) : (
            visibleConcepts.map((c) => {
              const isSel = c.slug === selectedSlug
              const color = c.color || '#5B7FFF'
              return (
                <button
                  key={c.id}
                  onClick={() => handleSelect(c.slug)}
                  className={`w-full text-left px-4 py-2 flex items-center gap-3 transition-colors border-l-2 ${
                    isSel
                      ? 'bg-gray-800/80 border-l-current'
                      : 'border-l-transparent hover:bg-gray-900'
                  }`}
                  style={{ color: isSel ? color : undefined }}
                >
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="flex-1 min-w-0">
                    <span
                      className={`block text-sm leading-tight truncate ${
                        isSel ? '' : 'text-gray-200'
                      }`}
                    >
                      {c.label}
                    </span>
                  </span>
                  <span
                    className={`text-[11px] px-1.5 py-0.5 rounded font-mono ${
                      isSel ? 'bg-gray-900' : 'bg-gray-800 text-gray-500'
                    }`}
                  >
                    {c.word_count}
                  </span>
                </button>
              )
            })
          )}
        </div>
      </aside>

      {/* RIGHT: word pane */}
      <section className="flex-1 flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
            Pick a concept on the left to see its words.
          </div>
        ) : (
          <>
            <header
              className="px-6 py-4 border-b border-gray-800"
              style={{
                background: `linear-gradient(90deg, ${
                  selected.color || '#5B7FFF'
                }14 0%, transparent 80%)`,
              }}
            >
              <div className="flex items-baseline gap-3 mb-1.5">
                <span
                  className="inline-block w-3 h-3 rounded-full"
                  style={{ backgroundColor: selected.color || '#5B7FFF' }}
                />
                <h1 className="text-lg font-semibold text-gray-100">{selected.label}</h1>
                <span className="text-xs text-gray-500">{selected.word_count} words</span>
              </div>
              {selected.summary && (
                <p className="text-sm text-gray-400 leading-snug max-w-3xl">
                  {selected.summary}
                </p>
              )}
              {detail && detail.words.length > 12 && (
                <div className="mt-3 relative max-w-md">
                  <Search
                    size={13}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500"
                  />
                  <input
                    value={wordFilter}
                    onChange={(e) => setWordFilter(e.target.value)}
                    placeholder="Filter words in this concept…"
                    className="w-full pl-7 pr-7 py-1.5 bg-gray-950 border border-gray-800 rounded-md text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-gray-700"
                  />
                  {wordFilter && (
                    <button
                      onClick={() => setWordFilter('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                      aria-label="clear word filter"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              )}
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {detailLoading ? (
                <div className="text-sm text-gray-500">Loading words…</div>
              ) : visibleWords.length === 0 ? (
                <div className="text-sm text-gray-500">
                  {detail && detail.words.length === 0
                    ? 'No words in this concept yet.'
                    : 'No words match the filter.'}
                </div>
              ) : (
                <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
                  {visibleWords.map((w) => (
                    <article
                      key={w.id}
                      className="px-3 py-2.5 bg-gray-900/70 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors"
                      style={{
                        borderLeft: `3px solid ${selected.color || '#5B7FFF'}80`,
                      }}
                    >
                      <div className="text-lg font-medium text-gray-100 leading-tight">
                        {w.devanagari}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 font-mono">{w.iast}</div>
                      <div className="text-xs text-gray-300 mt-1.5 leading-snug">
                        {w.meaning_short}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  )
}

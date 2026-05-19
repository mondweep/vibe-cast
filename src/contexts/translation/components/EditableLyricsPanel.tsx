// Edit-mode replacement for LyricsPanel. Each line is broken into editable
// fields: Devanagari, IAST, poetic English, literal English. Used only when
// the curator clicks "Edit lines" in VerifyBar; otherwise the read-only
// LyricsPanel renders.
//
// Timestamp editing:
//   - "Snap start" / "Snap end" buttons grab the YouTube player's currentTime.
//   - ± 0.5s buttons nudge each value for fine adjustment.
//   - Snapping a line's start also updates the previous line's end_time so
//     adjacent lines stay contiguous; snapping a line's end updates the
//     next line's start_time. Lines that span a gap are fine — adjacent
//     lines are only adjusted when they actually exist.

import type { LyricsLine } from '../../../shared/types/database.types'

interface Props {
  lines: LyricsLine[]
  currentLineIndex: number
  currentTime: number // seconds, from the YouTube player
  onChange: (index: number, patch: Partial<LyricsLine>) => void
}

const NUDGE = 0.5

function clampTime(t: number): number {
  return Math.max(0, Math.round(t * 10) / 10) // one decimal place, no negatives
}

export function EditableLyricsPanel({
  lines,
  currentLineIndex,
  currentTime,
  onChange,
}: Props) {
  if (lines.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 h-64 flex items-center justify-center">
        <p className="text-gray-500 text-sm">No lines to edit yet.</p>
      </div>
    )
  }

  // Bulk update helper: applies patches across multiple lines in a row.
  // The parent's onChange is per-line; we just call it multiple times.
  const applyPatches = (patches: Array<{ i: number; patch: Partial<LyricsLine> }>) => {
    for (const { i, patch } of patches) {
      if (i >= 0 && i < lines.length) onChange(i, patch)
    }
  }

  const snapStart = (i: number) => {
    const t = clampTime(currentTime)
    const patches: Array<{ i: number; patch: Partial<LyricsLine> }> = [
      { i, patch: { start_time: t } },
    ]
    if (i > 0) {
      // Chain: previous line's end becomes this line's start, but only if it
      // would actually move forward — never compress a previous line below its
      // own start.
      const prev = lines[i - 1]
      if (prev.start_time == null || t >= prev.start_time) {
        patches.push({ i: i - 1, patch: { end_time: t } })
      }
    }
    applyPatches(patches)
  }

  const snapEnd = (i: number) => {
    const t = clampTime(currentTime)
    const patches: Array<{ i: number; patch: Partial<LyricsLine> }> = [
      { i, patch: { end_time: t } },
    ]
    if (i < lines.length - 1) {
      const next = lines[i + 1]
      if (next.end_time == null || t <= next.end_time) {
        patches.push({ i: i + 1, patch: { start_time: t } })
      }
    }
    applyPatches(patches)
  }

  const nudge = (i: number, field: 'start_time' | 'end_time', delta: number) => {
    const line = lines[i]
    const current = line[field]
    if (current == null) return
    const next = clampTime(current + delta)
    onChange(i, { [field]: next })
  }

  return (
    <div className="bg-gray-900 rounded-xl p-3 max-h-[28rem] overflow-y-auto space-y-4 scrollbar-thin">
      {lines.map((line, i) => {
        const isActive = i === currentLineIndex
        return (
          <div
            key={i}
            className={`rounded-lg border p-3 space-y-2 ${
              isActive
                ? 'border-amber-500/40 bg-amber-500/5'
                : 'border-gray-800 bg-gray-950/40'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-gray-500">
              <span>Line {i + 1}</span>
              <TimingControls
                line={line}
                onSnapStart={() => snapStart(i)}
                onSnapEnd={() => snapEnd(i)}
                onNudgeStart={(delta) => nudge(i, 'start_time', delta)}
                onNudgeEnd={(delta) => nudge(i, 'end_time', delta)}
              />
            </div>

            <Field
              label="Devanagari"
              value={line.devanagari || ''}
              onChange={(v) => onChange(i, { devanagari: v })}
            />
            <Field
              label="IAST"
              value={line.iast || ''}
              onChange={(v) => onChange(i, { iast: v })}
              italic
            />
            <Field
              label="Poetic English"
              value={line.english_poetic || ''}
              onChange={(v) => onChange(i, { english_poetic: v })}
              multiline
            />
            <Field
              label="Literal English"
              value={line.english_literal || ''}
              onChange={(v) => onChange(i, { english_literal: v })}
              multiline
            />
            <Field
              label="Context / Explanation"
              value={line.explanation || ''}
              onChange={(v) => onChange(i, { explanation: v })}
              multiline
              optional
            />
          </div>
        )
      })}
    </div>
  )
}

function TimingControls({
  line,
  onSnapStart,
  onSnapEnd,
  onNudgeStart,
  onNudgeEnd,
}: {
  line: LyricsLine
  onSnapStart: () => void
  onSnapEnd: () => void
  onNudgeStart: (delta: number) => void
  onNudgeEnd: (delta: number) => void
}) {
  const fmt = (t: number | null | undefined) =>
    t == null ? '–' : `${t.toFixed(1)}s`

  return (
    <div className="flex items-center gap-1 normal-case tracking-normal text-[10px]">
      {/* Start */}
      <div className="flex items-center rounded-md border border-gray-800 bg-gray-950/60 overflow-hidden">
        <button
          type="button"
          onClick={() => onNudgeStart(-NUDGE)}
          className="px-1.5 py-0.5 text-gray-400 hover:bg-gray-800 hover:text-amber-300"
          title="-0.5s"
        >
          −
        </button>
        <button
          type="button"
          onClick={onSnapStart}
          className="px-1.5 py-0.5 text-gray-200 hover:bg-gray-800 hover:text-amber-300 font-mono"
          title="Snap start to current player time"
        >
          {fmt(line.start_time)}
        </button>
        <button
          type="button"
          onClick={() => onNudgeStart(NUDGE)}
          className="px-1.5 py-0.5 text-gray-400 hover:bg-gray-800 hover:text-amber-300"
          title="+0.5s"
        >
          +
        </button>
      </div>

      <span className="text-gray-700">→</span>

      {/* End */}
      <div className="flex items-center rounded-md border border-gray-800 bg-gray-950/60 overflow-hidden">
        <button
          type="button"
          onClick={() => onNudgeEnd(-NUDGE)}
          className="px-1.5 py-0.5 text-gray-400 hover:bg-gray-800 hover:text-amber-300"
          title="-0.5s"
        >
          −
        </button>
        <button
          type="button"
          onClick={onSnapEnd}
          className="px-1.5 py-0.5 text-gray-200 hover:bg-gray-800 hover:text-amber-300 font-mono"
          title="Snap end to current player time"
        >
          {fmt(line.end_time)}
        </button>
        <button
          type="button"
          onClick={() => onNudgeEnd(NUDGE)}
          className="px-1.5 py-0.5 text-gray-400 hover:bg-gray-800 hover:text-amber-300"
          title="+0.5s"
        >
          +
        </button>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  multiline,
  italic,
  optional,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
  italic?: boolean
  optional?: boolean
}) {
  const base =
    'w-full rounded-md border border-gray-800 bg-gray-950 px-2 py-1.5 text-sm text-gray-100 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30'
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">
        {label} {optional && <span className="text-gray-600 normal-case">(optional)</span>}
      </span>
      {multiline ? (
        <textarea
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${base} resize-y ${italic ? 'italic' : ''}`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${base} ${italic ? 'italic' : ''}`}
        />
      )}
    </label>
  )
}

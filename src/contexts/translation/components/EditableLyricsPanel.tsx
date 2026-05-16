// Edit-mode replacement for LyricsPanel. Each line is broken into editable
// fields: Devanagari, IAST, poetic English, literal English. Used only when
// the curator clicks "Edit lines" in VerifyBar; otherwise the read-only
// LyricsPanel renders.

import type { LyricsLine } from '../../../shared/types/database.types';

interface Props {
  lines: LyricsLine[];
  currentLineIndex: number;
  onChange: (index: number, patch: Partial<LyricsLine>) => void;
}

export function EditableLyricsPanel({ lines, currentLineIndex, onChange }: Props) {
  if (lines.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 h-64 flex items-center justify-center">
        <p className="text-gray-500 text-sm">No lines to edit yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl p-3 max-h-[28rem] overflow-y-auto space-y-4 scrollbar-thin">
      {lines.map((line, i) => {
        const isActive = i === currentLineIndex;
        const ts =
          line.start_time != null && line.end_time != null
            ? `${line.start_time.toFixed(1)}-${line.end_time.toFixed(1)}s`
            : '';
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
              <span>{ts}</span>
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
        );
      })}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
  italic,
  optional,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  italic?: boolean;
  optional?: boolean;
}) {
  const base =
    'w-full rounded-md border border-gray-800 bg-gray-950 px-2 py-1.5 text-sm text-gray-100 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30';
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
  );
}

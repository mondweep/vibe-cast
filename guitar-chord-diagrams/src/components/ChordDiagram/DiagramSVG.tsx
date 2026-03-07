import type { ChordVoicing } from '../../types';
import FretBoard, { getStringX, getFretY, DIAGRAM } from './FretBoard';
import FingerDot from './FingerDot';
import BarreIndicator from './BarreIndicator';

interface DiagramSVGProps {
  voicing: ChordVoicing;
  showTitle?: boolean;
}

const NUM_FRETS = 5;

export default function DiagramSVG({ voicing, showTitle = true }: DiagramSVGProps) {
  const totalWidth = DIAGRAM.padLeft + 5 * DIAGRAM.stringSpacing + DIAGRAM.padRight;
  const totalHeight = DIAGRAM.padTop + NUM_FRETS * DIAGRAM.fretSpacing + DIAGRAM.padBottom;

  // Calculate relative frets
  const baseFret = voicing.baseFret;

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      width={totalWidth}
      height={totalHeight}
      className="select-none"
    >
      {/* Title */}
      {showTitle && (
        <text
          x={totalWidth / 2}
          y={14}
          textAnchor="middle"
          fontSize={14}
          fontWeight="bold"
          fill="#1a1a1a"
        >
          {voicing.name}
        </text>
      )}

      {/* Fretboard */}
      <FretBoard baseFret={baseFret} numFrets={NUM_FRETS} />

      {/* Open / Muted string indicators */}
      {voicing.strings.map((fret, i) => {
        const x = getStringX(i);
        const y = DIAGRAM.padTop - 12;

        if (fret === null) {
          return (
            <text
              key={`mute-${i}`}
              x={x}
              y={y}
              textAnchor="middle"
              fontSize={12}
              fontWeight="bold"
              fill="#999"
            >
              ×
            </text>
          );
        }
        if (fret === 0) {
          return (
            <circle
              key={`open-${i}`}
              cx={x}
              cy={y - 3}
              r={5}
              fill="none"
              stroke="#666"
              strokeWidth={1.5}
            />
          );
        }
        return null;
      })}

      {/* Barre indicators (render before dots so dots overlap) */}
      {voicing.barres.map((barre, i) => (
        <BarreIndicator key={`barre-${i}`} barre={barre} baseFret={baseFret} />
      ))}

      {/* Finger dots */}
      {voicing.strings.map((fret, stringIdx) => {
        if (fret === null || fret === 0) return null;

        // Check if this position is covered by a barre
        const isBarre = voicing.barres.some(
          b => fret === b.fret && stringIdx >= b.fromString && stringIdx <= b.toString
        );
        if (isBarre && stringIdx !== voicing.barres[0]?.fromString) {
          // Skip individual dots for barre-covered strings (except edges shown by barre rect)
          return null;
        }

        const relativeFret = fret - baseFret + 1;
        if (relativeFret < 1 || relativeFret > NUM_FRETS) return null;

        return (
          <FingerDot
            key={`dot-${stringIdx}`}
            stringIdx={stringIdx}
            fret={relativeFret}
            finger={voicing.fingers[stringIdx]}
          />
        );
      })}

      {/* Note labels below strings */}
      {voicing.strings.map((fret, i) => {
        if (fret === null) return null;
        const noteIdx = voicing.notes.length > 0
          ? voicing.notes[voicing.strings.slice(0, i + 1).filter(f => f !== null).length - 1]
          : null;

        if (!noteIdx) return null;

        return (
          <text
            key={`note-${i}`}
            x={getStringX(i)}
            y={getFretY(NUM_FRETS) + 16}
            textAnchor="middle"
            fontSize={9}
            fill="#888"
          >
            {noteIdx}
          </text>
        );
      })}

      {/* Category badge */}
      <text
        x={totalWidth / 2}
        y={totalHeight - 2}
        textAnchor="middle"
        fontSize={8}
        fill="#bbb"
        style={{ textTransform: 'uppercase' }}
      >
        {voicing.category}
      </text>
    </svg>
  );
}

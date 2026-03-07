interface FretBoardProps {
  numFrets?: number;
  baseFret: number;
  width?: number;
  height?: number;
}

export const DIAGRAM = {
  padLeft: 30,
  padRight: 15,
  padTop: 35,
  padBottom: 30,
  stringSpacing: 20,
  fretSpacing: 28,
  nutWidth: 4,
} as const;

export function getStringX(stringIdx: number): number {
  return DIAGRAM.padLeft + stringIdx * DIAGRAM.stringSpacing;
}

export function getFretY(fretIdx: number): number {
  return DIAGRAM.padTop + fretIdx * DIAGRAM.fretSpacing;
}

export default function FretBoard({ numFrets = 5, baseFret }: FretBoardProps) {
  const isOpenPosition = baseFret === 1;

  return (
    <g>
      {/* Nut or fret position label */}
      {isOpenPosition ? (
        <rect
          x={DIAGRAM.padLeft - 1}
          y={DIAGRAM.padTop - DIAGRAM.nutWidth}
          width={5 * DIAGRAM.stringSpacing + 2}
          height={DIAGRAM.nutWidth}
          fill="#1a1a1a"
          rx={1}
        />
      ) : (
        <text
          x={DIAGRAM.padLeft - 14}
          y={getFretY(0) + DIAGRAM.fretSpacing / 2 + 5}
          textAnchor="middle"
          fontSize={12}
          fontWeight="bold"
          fill="#666"
        >
          {baseFret}fr
        </text>
      )}

      {/* Fret lines */}
      {Array.from({ length: numFrets + 1 }).map((_, i) => (
        <line
          key={`fret-${i}`}
          x1={DIAGRAM.padLeft}
          y1={getFretY(i)}
          x2={DIAGRAM.padLeft + 5 * DIAGRAM.stringSpacing}
          y2={getFretY(i)}
          stroke="#999"
          strokeWidth={i === 0 && !isOpenPosition ? 1 : 1}
        />
      ))}

      {/* String lines */}
      {Array.from({ length: 6 }).map((_, i) => (
        <line
          key={`string-${i}`}
          x1={getStringX(i)}
          y1={DIAGRAM.padTop}
          x2={getStringX(i)}
          y2={getFretY(numFrets)}
          stroke="#666"
          strokeWidth={1.5 - i * 0.1}
        />
      ))}
    </g>
  );
}

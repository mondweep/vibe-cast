import { getStringX, getFretY, DIAGRAM } from './FretBoard';

interface FingerDotProps {
  stringIdx: number;
  fret: number;       // relative to baseFret
  finger: number | null;
}

export default function FingerDot({ stringIdx, fret, finger }: FingerDotProps) {
  const x = getStringX(stringIdx);
  const y = getFretY(fret - 1) + DIAGRAM.fretSpacing / 2;
  const radius = 8;

  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={radius}
        fill="#1a1a1a"
      />
      {finger !== null && finger > 0 && (
        <text
          x={x}
          y={y + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={10}
          fontWeight="bold"
          fill="white"
        >
          {finger === 5 ? 'T' : finger}
        </text>
      )}
    </g>
  );
}

import type { Barre } from '../../types';
import { getStringX, getFretY, DIAGRAM } from './FretBoard';

interface BarreIndicatorProps {
  barre: Barre;
  baseFret: number;
}

export default function BarreIndicator({ barre, baseFret }: BarreIndicatorProps) {
  const relativeFret = barre.fret - baseFret + 1;
  const x1 = getStringX(barre.fromString);
  const x2 = getStringX(barre.toString);
  const y = getFretY(relativeFret - 1) + DIAGRAM.fretSpacing / 2;
  const height = 14;

  return (
    <rect
      x={x1 - 7}
      y={y - height / 2}
      width={x2 - x1 + 14}
      height={height}
      rx={7}
      ry={7}
      fill="#1a1a1a"
      opacity={0.85}
    />
  );
}

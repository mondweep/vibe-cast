import { CHORD_LIBRARY } from '../domain/chord-data.ts';
import type { ChordName } from '../domain/types.ts';

interface MiniChordDiagramProps {
    chord: ChordName;
    isActive?: boolean;
}

const STRINGS = 6;
const FRETS = 4;
const STRING_NAMES = ['E', 'B', 'G', 'D', 'A', 'E'];

/**
 * A compact chord diagram showing finger positions on a mini fretboard grid.
 * Renders 6 strings × 4 frets with dots at the chord voicing positions.
 */
export function MiniChordDiagram({ chord, isActive = false }: MiniChordDiagramProps) {
    const voicing = CHORD_LIBRARY[chord];
    if (!voicing) return null;

    const positions = voicing.positions;
    const fingering = voicing.fingering;

    return (
        <div className={`mini-chord-diagram ${isActive ? 'mini-chord-diagram--active' : ''}`}>
            <div className="mini-chord-diagram__name">{chord}</div>
            <div className="mini-chord-diagram__grid">
                {/* Fret numbers header */}
                <div className="mini-chord-diagram__fret-numbers">
                    <span className="mini-chord-diagram__corner"></span>
                    {Array.from({ length: FRETS }, (_, f) => (
                        <span key={f} className="mini-chord-diagram__fret-num">{f === 0 ? 'O' : f}</span>
                    ))}
                </div>
                {/* String rows */}
                {Array.from({ length: STRINGS }, (_, sIdx) => {
                    const stringNum = sIdx + 1;
                    return (
                        <div key={stringNum} className="mini-chord-diagram__row">
                            <span className="mini-chord-diagram__string-name">{STRING_NAMES[sIdx]}</span>
                            {Array.from({ length: FRETS }, (_, f) => {
                                const hasPosition = positions.some(p => p.string === stringNum && p.fret === f);
                                const fingerNum = fingering && fingering[sIdx] !== null && hasPosition
                                    ? fingering[sIdx]
                                    : null;

                                return (
                                    <span
                                        key={f}
                                        className={`mini-chord-diagram__cell ${hasPosition ? 'mini-chord-diagram__cell--active' : ''} ${f === 0 ? 'mini-chord-diagram__cell--nut' : ''}`}
                                    >
                                        {hasPosition && (
                                            <span className="mini-chord-diagram__dot">
                                                {fingerNum !== null && fingerNum !== undefined && (
                                                    <span className="mini-chord-diagram__finger">{fingerNum}</span>
                                                )}
                                            </span>
                                        )}
                                    </span>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

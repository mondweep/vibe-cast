
import React from 'react';
import type { ScoreIR } from '@domains/shared-kernel/types';

interface ScoreInspectorProps {
    scoreIR: ScoreIR | null;
    isVisible: boolean;
    onClose: () => void;
}

// Helper to get logic description of note
function getNoteName(midi: number): string {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midi / 12) - 1;
    const note = notes[midi % 12];
    return `${note}${octave}`;
}

// Helper to get theory description
function getNoteDescription(midi: number): string {
    const name = getNoteName(midi);
    const note = name.slice(0, -1);
    const octave = parseInt(name.slice(-1));

    let range = '';
    if (octave === 4) range = 'Middle C range';
    else if (octave > 4) range = 'above Middle C';
    else range = 'below Middle C';

    return `${note} ${range}`;
}

// Helper for velocity
function getVelocityDescription(v: number): string {
    if (v < 30) return 'pp (Very Soft)';
    if (v < 50) return 'p (Soft)';
    if (v < 70) return 'mp (Med-Soft)';
    if (v < 90) return 'mf (Med-Loud)';
    if (v < 110) return 'f (Loud)';
    return 'ff (Very Loud)';
}

export function ScoreInspector({ scoreIR, isVisible, onClose }: ScoreInspectorProps) {
    if (!isVisible || !scoreIR) return null;

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <div style={styles.header}>
                    <h3>Score Inspector</h3>
                    <button onClick={onClose} style={styles.closeButton}>×</button>
                </div>

                <div style={styles.content}>
                    <div style={styles.section}>
                        <h4>Metadata</h4>
                        <pre style={styles.json}>{JSON.stringify(scoreIR.metadata, null, 2)}</pre>
                    </div>

                    <div style={styles.section}>
                        <h4>Staves ({scoreIR.staves.length})</h4>
                        {scoreIR.staves.map((staff, i) => (
                            <div key={staff.id} style={styles.staffBlock}>
                                <h5>Staff {i + 1}: {staff.instrument || 'Unknown'} (Clef: {(staff as any).clef || 'G'})</h5>
                                <div style={styles.measureGrid}>
                                    {staff.measures.map(measure => (
                                        <div key={measure.number} style={styles.measureCard}>
                                            <div style={styles.measureHeader}>Measure {measure.number}</div>
                                            <div style={styles.eventCount}>{measure.events.length} Events</div>
                                            <div style={styles.eventList}>
                                                {measure.events.slice(0, 5).map((e, ei) => (
                                                    <div key={ei} style={styles.eventItem}>
                                                        {e.type === 'note-on' ? (
                                                            <div style={{ fontSize: '10px' }}>
                                                                <div>
                                                                    <strong>{getNoteName(e.pitch)}</strong>
                                                                    <span style={{ color: '#888', marginLeft: '4px' }}>
                                                                        ({getNoteDescription(e.pitch)})
                                                                    </span>
                                                                </div>
                                                                <div style={{ color: '#aaa', marginLeft: '12px' }}>
                                                                    Vol: {e.velocity} ({getVelocityDescription(e.velocity || 80)})
                                                                </div>
                                                                <div style={{ color: '#aaa', marginLeft: '12px' }}>
                                                                    t: {(e.time || 0).toFixed(2)}s | d: {(e.duration || 0).toFixed(2)}s
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            `🔹 ${e.type}`
                                                        )}
                                                    </div>
                                                ))}
                                                {measure.events.length > 5 && <div style={styles.more}>+{measure.events.length - 5} more</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modal: {
        backgroundColor: '#1a1a2e',
        width: '90%',
        height: '90%',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    },
    header: {
        padding: '20px',
        borderBottom: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#16213e',
    },
    closeButton: {
        background: 'none',
        border: 'none',
        color: '#fff',
        fontSize: '24px',
        cursor: 'pointer',
    },
    content: {
        flex: 1,
        padding: '20px',
        overflowY: 'auto',
        color: '#ddd',
    },
    section: {
        marginBottom: '30px',
    },
    json: {
        backgroundColor: '#0f0f1a',
        padding: '10px',
        borderRadius: '6px',
        fontSize: '12px',
    },
    staffBlock: {
        marginBottom: '20px',
        padding: '10px',
        backgroundColor: '#2a2a3e',
        borderRadius: '8px',
    },
    measureGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '10px',
        marginTop: '10px',
    },
    measureCard: {
        backgroundColor: '#1a1a2e',
        padding: '8px',
        borderRadius: '4px',
        fontSize: '11px',
    },
    measureHeader: {
        fontWeight: 'bold',
        color: '#e94560',
        marginBottom: '4px',
    },
    eventCount: {
        color: '#888',
        marginBottom: '4px',
    },
    eventList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
    },
    eventItem: {
        color: '#ccc',
    },
    more: {
        color: '#666',
        fontStyle: 'italic',
    }
};

import React from 'react';

const CohomologyViz = () => {
    // Data from evaluate.js
    const nodes = [
        { id: 0, label: "Meeting @ 3pm", x: 50, y: 20 },
        { id: 1, label: "John Confirmed", x: 80, y: 80 },
        { id: 2, label: "Moved to 4pm", x: 20, y: 80 }
    ];

    const edges = [
        { source: 0, target: 1, weight: 0.9 }, // Strong consistency
        { source: 1, target: 2, weight: 0.5 }, // Weak
        { source: 0, target: 2, weight: 0.2 }  // Contradiction
    ];

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="var(--text-muted)" />
                    </marker>
                </defs>

                {/* Edges */}
                {edges.map((edge, i) => {
                    const s = nodes[edge.source];
                    const t = nodes[edge.target];
                    return (
                        <g key={i}>
                            <line
                                x1={s.x} y1={s.y}
                                x2={t.x} y2={t.y}
                                stroke={edge.weight < 0.3 ? "var(--error)" : "var(--border-focus)"}
                                strokeWidth="2"
                                strokeDasharray={edge.weight < 0.3 ? "4" : "0"}
                                markerEnd="url(#arrowhead)"
                            />
                            {/* Conflict Indicator */}
                            {edge.weight < 0.3 && (
                                <text x={(s.x + t.x) / 2} y={(s.y + t.y) / 2 - 5} fill="var(--error)" fontSize="6" textAnchor="middle">
                                    CONFLICT
                                </text>
                            )}
                        </g>
                    );
                })}

                {/* Nodes */}
                {nodes.map((node) => (
                    <g key={node.id}>
                        <circle
                            cx={node.x} cy={node.y}
                            r="8"
                            fill="var(--bg-card)"
                            stroke="var(--accent-primary)"
                            strokeWidth="2"
                        />
                        <text
                            x={node.x} y={node.y + 16}
                            fill="var(--text-secondary)"
                            fontSize="6"
                            textAnchor="middle"
                        >
                            {node.label}
                        </text>
                    </g>
                ))}
            </svg>
            <div style={{ marginTop: '-20px', fontSize: '0.8rem', color: 'var(--success)' }}>
                Consistency: High Coherence
            </div>
        </div>
    );
};

export default CohomologyViz;

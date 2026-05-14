import React from 'react';

const CausalViz = () => {
    const nodes = [
        { id: 'C', label: 'Confounder', x: 50, y: 15, type: 'confounder' },
        { id: 'T', label: 'Treatment', x: 25, y: 80, type: 'var' },
        { id: 'O', label: 'Outcome', x: 75, y: 80, type: 'var' }
    ];

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <defs>
                    <marker id="arrowhead-causal" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="var(--text-muted)" />
                    </marker>
                </defs>

                {/* Edges */}
                <line x1="50" y1="20" x2="25" y2="75" stroke="var(--border-focus)" strokeWidth="1.5" markerEnd="url(#arrowhead-causal)" />
                <line x1="50" y1="20" x2="75" y2="75" stroke="var(--border-focus)" strokeWidth="1.5" markerEnd="url(#arrowhead-causal)" />
                <line x1="30" y1="80" x2="70" y2="80" stroke="var(--accent-primary)" strokeWidth="2" markerEnd="url(#arrowhead-causal)" />

                {/* Nodes */}
                {nodes.map(n => (
                    <g key={n.id}>
                        <circle
                            cx={n.x} cy={n.y}
                            r={n.type === 'confounder' ? "10" : "12"}
                            fill="var(--bg-card)"
                            stroke={n.type === 'confounder' ? "var(--error)" : "var(--accent-primary)"}
                            strokeWidth="2"
                            strokeDasharray={n.type === 'confounder' ? "2" : "0"}
                        />
                        <text x={n.x} y={n.y + 2} textAnchor="middle" fontSize="10" fill="var(--text-primary)" dy="1">{n.id}</text>
                        <text x={n.x} y={n.y + 22} textAnchor="middle" fontSize="6" fill="var(--text-secondary)">{n.label}</text>
                    </g>
                ))}
            </svg>
        </div>
    );
};

export default CausalViz;

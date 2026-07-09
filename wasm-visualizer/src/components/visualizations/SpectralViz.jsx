import React from 'react';

const SpectralViz = () => {
    // Ring Graph n=4
    const nodes = [
        { id: 0, x: 50, y: 20 },
        { id: 1, x: 80, y: 50 },
        { id: 2, x: 50, y: 80 },
        { id: 3, x: 20, y: 50 }
    ];

    const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0]
    ];

    const eigenvalues = [0, 2, 2, 4]; // Example Laplacian eigenvalues for C4

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', gap: '10px', padding: '10px' }}>
            {/* Graph */}
            <div style={{ flex: 1 }}>
                <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                    {edges.map((e, i) => {
                        const s = nodes[e[0]];
                        const t = nodes[e[1]];
                        return <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="var(--accent-secondary)" strokeWidth="2" />;
                    })}
                    {nodes.map(n => (
                        <circle key={n.id} cx={n.x} cy={n.y} r="6" fill="var(--bg-card)" stroke="var(--accent-secondary)" strokeWidth="2" />
                    ))}
                </svg>
            </div>

            {/* Charts */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: '20px' }}>
                {eigenvalues.map((val, i) => (
                    <div key={i} style={{
                        width: '20%',
                        height: `${val * 20}%`,
                        background: 'var(--accent-secondary)',
                        opacity: 0.6 + (i * 0.1),
                        borderRadius: '2px 2px 0 0',
                        position: 'relative'
                    }}>
                        <span style={{ position: 'absolute', top: '-15px', left: '0', width: '100%', textAlign: 'center', fontSize: '8px' }}>
                            λ{i}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SpectralViz;

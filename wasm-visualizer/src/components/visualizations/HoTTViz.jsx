import React from 'react';

const HoTTViz = () => {
    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 100 100" style={{ width: '80%', height: '80%', overflow: 'visible' }}>
                <defs>
                    <marker id="arrow-hott" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="var(--accent-primary)" />
                    </marker>
                </defs>

                {/* Point 42 */}
                <circle cx="50" cy="80" r="4" fill="var(--text-primary)" />
                <text x="50" y="95" textAnchor="middle" fontSize="10" fill="var(--text-primary)">42 : Nat</text>

                {/* Loop Path (Refl) */}
                <path
                    d="M 48 76 C 20 20, 80 20, 52 76"
                    fill="none"
                    stroke="var(--accent-primary)"
                    strokeWidth="2"
                    markerEnd="url(#arrow-hott)"
                />
                <text x="50" y="30" textAnchor="middle" fontSize="10" fill="var(--accent-primary)">refl_42</text>
            </svg>
        </div>
    );
};

export default HoTTViz;

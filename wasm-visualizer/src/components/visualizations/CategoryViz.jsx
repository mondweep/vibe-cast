import React from 'react';

const CategoryViz = () => {
    // A -> B -> C composition
    return (
        <div style={{ width: '100%', height: '100%' }}>
            <svg viewBox="0 0 100 40" style={{ width: '100%', height: '100%' }}>
                <defs>
                    <marker id="arrow-cat" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                        <polygon points="0 0, 6 2, 0 4" fill="var(--text-muted)" />
                    </marker>
                </defs>

                <circle cx="20" cy="20" r="5" fill="var(--bg-card)" stroke="var(--text-primary)" strokeWidth="2" />
                <text x="20" y="32" textAnchor="middle" fontSize="6" fill="var(--text-primary)">A</text>

                <circle cx="50" cy="20" r="5" fill="var(--bg-card)" stroke="var(--text-primary)" strokeWidth="2" />
                <text x="50" y="32" textAnchor="middle" fontSize="6" fill="var(--text-primary)">B</text>

                <circle cx="80" cy="20" r="5" fill="var(--bg-card)" stroke="var(--text-primary)" strokeWidth="2" />
                <text x="80" y="32" textAnchor="middle" fontSize="6" fill="var(--text-primary)">C</text>

                {/* f: A -> B */}
                <line x1="26" y1="20" x2="43" y2="20" stroke="var(--text-muted)" strokeWidth="1" markerEnd="url(#arrow-cat)" />
                <text x="35" y="16" textAnchor="middle" fontSize="5" fill="var(--text-secondary)">f</text>

                {/* g: B -> C */}
                <line x1="56" y1="20" x2="73" y2="20" stroke="var(--text-muted)" strokeWidth="1" markerEnd="url(#arrow-cat)" />
                <text x="65" y="16" textAnchor="middle" fontSize="5" fill="var(--text-secondary)">g</text>

                {/* g.f: A -> C (curved) */}
                <path d="M 20 14 Q 50 0 80 14" fill="none" stroke="var(--accent-secondary)" strokeWidth="1" strokeDasharray="2" markerEnd="url(#arrow-cat)" />
                <text x="50" y="8" textAnchor="middle" fontSize="5" fill="var(--accent-secondary)">g ∘ f</text>
            </svg>
        </div>
    );
};

export default CategoryViz;

import React from 'react';

const QuantumViz = () => {
    // GHZ State |000> + |111>
    const amplitudes = [
        { state: '000', val: 0.707 },
        { state: '001', val: 0 },
        { state: '010', val: 0 },
        { state: '011', val: 0 },
        { state: '100', val: 0 },
        { state: '101', val: 0 },
        { state: '110', val: 0 },
        { state: '111', val: 0.707 },
    ];

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '10px 20px' }}>
            {amplitudes.map((amp, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '10%' }}>
                    <div style={{
                        width: '100%',
                        height: `${amp.val * 100}px`,
                        background: amp.val > 0 ? 'var(--accent-primary)' : 'var(--border-subtle)',
                        borderRadius: '2px',
                        transition: 'height 0.5s ease'
                    }} />
                    <span style={{ fontSize: '8px', color: 'var(--text-secondary)', marginTop: '4px', transform: 'rotate(-45deg)', transformOrigin: 'left top' }}>
                        |{amp.state}⟩
                    </span>
                </div>
            ))}
            <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '10px', color: 'var(--accent-primary)' }}>
                GHZ State
            </div>
        </div>
    );
};

export default QuantumViz;

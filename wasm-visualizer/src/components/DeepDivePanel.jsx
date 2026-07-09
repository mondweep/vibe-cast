import React from 'react';
import { X, Code, Zap, BookOpen } from 'lucide-react';

const DeepDivePanel = ({ engine, onClose }) => {
    if (!engine) return null;

    return (
        <div className="deep-dive-overlay" onClick={onClose}>
            <div className="deep-dive-panel glass-panel" onClick={e => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}>
                    <X size={24} />
                </button>

                <header className="panel-header">
                    <div style={{ color: 'var(--accent-primary)' }}>{engine.icon}</div>
                    <h2>{engine.name}</h2>
                </header>

                <div className="panel-content">
                    <section className="panel-section">
                        <h3><BookOpen size={18} /> Concept</h3>
                        <p>{engine.details.concept}</p>
                    </section>

                    <section className="panel-section">
                        <h3><Zap size={18} /> Use Case</h3>
                        <p>{engine.details.useCase}</p>
                    </section>

                    <section className="panel-section">
                        <h3><Code size={18} /> Input Data</h3>
                        <pre className="code-block">
                            {JSON.stringify(engine.details.inputData, null, 2)}
                        </pre>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default DeepDivePanel;

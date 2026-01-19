import React, { useState } from 'react';
import { Plus } from 'lucide-react';

interface TaskInputProps {
    onAdd: (text: string) => void;
}

export const TaskInput: React.FC<TaskInputProps> = ({ onAdd }) => {
    const [input, setInput] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            onAdd(input.trim());
            setInput('');
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ position: 'relative', marginBottom: '2rem' }}>
            <input
                type="text"
                className="glass-input"
                placeholder="Add a new task..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoFocus
            />
            <button
                type="submit"
                className="glass-btn"
                style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    minWidth: 'auto'
                }}
                disabled={!input.trim()}
            >
                <Plus size={20} />
            </button>
        </form>
    );
};

import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Check, Edit2, X } from 'lucide-react';
import type { Task } from '../types';

interface TaskItemProps {
    task: Task;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
    onEdit: (id: string, newText: string) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle, onDelete, onEdit }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(task.text);
    const editInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && editInputRef.current) {
            editInputRef.current.focus();
        }
    }, [isEditing]);

    const handleSave = () => {
        if (editText.trim()) {
            onEdit(task.id, editText.trim());
            setIsEditing(false);
        }
    };

    const handleCancel = () => {
        setEditText(task.text);
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') handleCancel();
    };

    return (
        <div className={`glass-panel task-item animate-fade-in ${task.completed ? 'completed' : ''}`}>
            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div
                    className={`task-checkbox ${task.completed ? 'checked' : ''}`}
                    onClick={() => onToggle(task.id)}
                >
                    {task.completed && <Check size={14} color="white" />}
                </div>

                {isEditing ? (
                    <input
                        ref={editInputRef}
                        type="text"
                        className="glass-input"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleSave}
                        style={{ padding: '0.4rem 0.8rem', background: 'rgba(0,0,0,0.3)' }}
                    />
                ) : (
                    <span
                        style={{ fontSize: '1.1rem', cursor: 'pointer' }}
                        onClick={() => onToggle(task.id)}
                    >
                        {task.text}
                    </span>
                )}
            </div>

            <div className="actions">
                {isEditing ? (
                    <>
                        <button className="glass-btn secondary" onClick={handleCancel} style={{ padding: '0.5rem' }}>
                            <X size={16} />
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            className="glass-btn secondary"
                            onClick={() => setIsEditing(true)}
                            style={{ padding: '0.5rem' }}
                        >
                            <Edit2 size={16} />
                        </button>
                        <button
                            className="glass-btn danger"
                            onClick={() => onDelete(task.id)}
                            style={{ padding: '0.5rem' }}
                        >
                            <Trash2 size={16} />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

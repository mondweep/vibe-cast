/**
 * TodoInput Component
 *
 * Input form for adding new todos
 * Accessible: proper labeling, keyboard submit
 */

import { useState, FormEvent, ChangeEvent } from 'react';

interface TodoInputProps {
  onAdd: (text: string) => void;
}

export function TodoInput({ onAdd }: TodoInputProps) {
  const [text, setText] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (trimmed) {
      onAdd(trimmed);
      setText('');
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  };

  return (
    <form onSubmit={handleSubmit} className="todo-form">
      <label htmlFor="todo-input" className="sr-only">
        Add a new todo
      </label>
      <input
        id="todo-input"
        type="text"
        value={text}
        onChange={handleChange}
        placeholder="What needs to be done?"
        className="todo-input"
        aria-label="New todo text"
        autoComplete="off"
      />
      <button type="submit" className="todo-add-btn" aria-label="Add todo">
        Add
      </button>
    </form>
  );
}

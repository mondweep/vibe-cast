/**
 * TodoItem Component
 *
 * Displays a single todo with complete and delete actions
 * Accessible: keyboard navigation, ARIA labels
 */

import { Todo } from '../types/todo';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  const handleToggle = () => onToggle(todo.id);
  const handleDelete = () => onDelete(todo.id);

  return (
    <li
      className={`todo-item ${todo.completed ? 'completed' : ''}`}
      data-testid="todo-item"
    >
      <label className="todo-label">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={handleToggle}
          aria-label={`Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`}
          className="todo-checkbox"
        />
        <span className={`todo-text ${todo.completed ? 'line-through' : ''}`}>
          {todo.text}
        </span>
      </label>
      <button
        onClick={handleDelete}
        aria-label={`Delete "${todo.text}"`}
        className="todo-delete"
        type="button"
      >
        ×
      </button>
    </li>
  );
}

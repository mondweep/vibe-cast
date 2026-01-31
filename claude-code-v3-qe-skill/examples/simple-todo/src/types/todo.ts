/**
 * Todo Domain Model (DDD)
 *
 * Aggregate: Todo
 * - Represents a single todo item
 * - Immutable value object pattern
 */

// Entity: Todo (has identity)
export interface Todo {
  readonly id: string;
  readonly text: string;
  readonly completed: boolean;
  readonly createdAt: Date;
}

// Value Object: Filter (no identity, compared by value)
export type TodoFilter = 'all' | 'active' | 'completed';

// Aggregate Root State
export interface TodoState {
  readonly todos: readonly Todo[];
  readonly filter: TodoFilter;
}

// Domain Events (as Action Types)
export type TodoAction =
  | { type: 'ADD_TODO'; payload: { text: string } }
  | { type: 'TOGGLE_TODO'; payload: { id: string } }
  | { type: 'DELETE_TODO'; payload: { id: string } }
  | { type: 'SET_FILTER'; payload: { filter: TodoFilter } }
  | { type: 'LOAD_TODOS'; payload: { todos: Todo[] } };

// Factory function for creating Todo entities
export function createTodo(text: string): Todo {
  return {
    id: crypto.randomUUID(),
    text: text.trim(),
    completed: false,
    createdAt: new Date(),
  };
}

// Domain logic: filter todos
export function filterTodos(todos: readonly Todo[], filter: TodoFilter): Todo[] {
  switch (filter) {
    case 'active':
      return todos.filter((todo) => !todo.completed);
    case 'completed':
      return todos.filter((todo) => todo.completed);
    case 'all':
    default:
      return [...todos];
  }
}

// Domain logic: count active todos
export function countActiveTodos(todos: readonly Todo[]): number {
  return todos.filter((todo) => !todo.completed).length;
}

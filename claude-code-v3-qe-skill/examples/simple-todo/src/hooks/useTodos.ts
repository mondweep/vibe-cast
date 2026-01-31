/**
 * Todo State Management Hook
 *
 * Uses useReducer for predictable state transitions (ADR-001)
 * Implements localStorage persistence
 */

import { useReducer, useEffect, useCallback } from 'react';
import {
  Todo,
  TodoState,
  TodoAction,
  TodoFilter,
  createTodo,
  filterTodos,
  countActiveTodos,
} from '../types/todo';

const STORAGE_KEY = 'simple-todo-items';

// Initial state
export const initialState: TodoState = {
  todos: [],
  filter: 'all',
};

// Reducer (pure function - easy to test)
export function todoReducer(state: TodoState, action: TodoAction): TodoState {
  switch (action.type) {
    case 'ADD_TODO': {
      const text = action.payload.text.trim();
      if (!text) return state;

      const newTodo = createTodo(text);
      return {
        ...state,
        todos: [newTodo, ...state.todos],
      };
    }

    case 'TOGGLE_TODO': {
      return {
        ...state,
        todos: state.todos.map((todo) =>
          todo.id === action.payload.id
            ? { ...todo, completed: !todo.completed }
            : todo
        ),
      };
    }

    case 'DELETE_TODO': {
      return {
        ...state,
        todos: state.todos.filter((todo) => todo.id !== action.payload.id),
      };
    }

    case 'SET_FILTER': {
      return {
        ...state,
        filter: action.payload.filter,
      };
    }

    case 'LOAD_TODOS': {
      return {
        ...state,
        todos: action.payload.todos,
      };
    }

    default:
      return state;
  }
}

// localStorage helpers
function loadTodosFromStorage(): Todo[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    // Restore Date objects
    return parsed.map((todo: Todo) => ({
      ...todo,
      createdAt: new Date(todo.createdAt),
    }));
  } catch {
    console.error('Failed to load todos from localStorage');
    return [];
  }
}

function saveTodosToStorage(todos: readonly Todo[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch {
    console.error('Failed to save todos to localStorage');
  }
}

// Custom hook
export function useTodos() {
  const [state, dispatch] = useReducer(todoReducer, initialState);

  // Load from localStorage on mount
  useEffect(() => {
    const savedTodos = loadTodosFromStorage();
    if (savedTodos.length > 0) {
      dispatch({ type: 'LOAD_TODOS', payload: { todos: savedTodos } });
    }
  }, []);

  // Save to localStorage when todos change
  useEffect(() => {
    saveTodosToStorage(state.todos);
  }, [state.todos]);

  // Memoized actions
  const addTodo = useCallback((text: string) => {
    dispatch({ type: 'ADD_TODO', payload: { text } });
  }, []);

  const toggleTodo = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_TODO', payload: { id } });
  }, []);

  const deleteTodo = useCallback((id: string) => {
    dispatch({ type: 'DELETE_TODO', payload: { id } });
  }, []);

  const setFilter = useCallback((filter: TodoFilter) => {
    dispatch({ type: 'SET_FILTER', payload: { filter } });
  }, []);

  // Derived state
  const filteredTodos = filterTodos(state.todos, state.filter);
  const activeCount = countActiveTodos(state.todos);
  const completedCount = state.todos.length - activeCount;

  return {
    todos: filteredTodos,
    allTodos: state.todos,
    filter: state.filter,
    activeCount,
    completedCount,
    totalCount: state.todos.length,
    addTodo,
    toggleTodo,
    deleteTodo,
    setFilter,
  };
}

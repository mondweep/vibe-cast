/**
 * Todo Reducer Tests (TDD)
 *
 * Following red-green-refactor cycle:
 * - Write failing test first
 * - Implement minimum code to pass
 * - Refactor while keeping green
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { todoReducer, initialState } from '../src/hooks/useTodos';
import { Todo, TodoState, createTodo, filterTodos, countActiveTodos } from '../src/types/todo';

describe('Todo Domain Model', () => {
  describe('createTodo', () => {
    it('should_create_todo_with_unique_id_when_given_text', () => {
      const todo = createTodo('Buy groceries');

      expect(todo.id).toBeDefined();
      expect(todo.id.length).toBeGreaterThan(0);
      expect(todo.text).toBe('Buy groceries');
      expect(todo.completed).toBe(false);
      expect(todo.createdAt).toBeInstanceOf(Date);
    });

    it('should_trim_whitespace_when_creating_todo', () => {
      const todo = createTodo('  Buy groceries  ');

      expect(todo.text).toBe('Buy groceries');
    });

    it('should_create_unique_ids_when_called_multiple_times', () => {
      const todo1 = createTodo('Todo 1');
      const todo2 = createTodo('Todo 2');

      expect(todo1.id).not.toBe(todo2.id);
    });
  });

  describe('filterTodos', () => {
    const todos: Todo[] = [
      { id: '1', text: 'Active todo', completed: false, createdAt: new Date() },
      { id: '2', text: 'Completed todo', completed: true, createdAt: new Date() },
      { id: '3', text: 'Another active', completed: false, createdAt: new Date() },
    ];

    it('should_return_all_todos_when_filter_is_all', () => {
      const result = filterTodos(todos, 'all');

      expect(result).toHaveLength(3);
    });

    it('should_return_only_active_todos_when_filter_is_active', () => {
      const result = filterTodos(todos, 'active');

      expect(result).toHaveLength(2);
      expect(result.every((t) => !t.completed)).toBe(true);
    });

    it('should_return_only_completed_todos_when_filter_is_completed', () => {
      const result = filterTodos(todos, 'completed');

      expect(result).toHaveLength(1);
      expect(result.every((t) => t.completed)).toBe(true);
    });
  });

  describe('countActiveTodos', () => {
    it('should_return_count_of_incomplete_todos', () => {
      const todos: Todo[] = [
        { id: '1', text: 'Active', completed: false, createdAt: new Date() },
        { id: '2', text: 'Done', completed: true, createdAt: new Date() },
        { id: '3', text: 'Active 2', completed: false, createdAt: new Date() },
      ];

      expect(countActiveTodos(todos)).toBe(2);
    });

    it('should_return_zero_when_all_todos_completed', () => {
      const todos: Todo[] = [
        { id: '1', text: 'Done', completed: true, createdAt: new Date() },
      ];

      expect(countActiveTodos(todos)).toBe(0);
    });

    it('should_return_zero_when_no_todos', () => {
      expect(countActiveTodos([])).toBe(0);
    });
  });
});

describe('todoReducer', () => {
  let state: TodoState;

  beforeEach(() => {
    state = initialState;
  });

  describe('ADD_TODO', () => {
    it('should_add_new_todo_when_add_action_dispatched', () => {
      const newState = todoReducer(state, {
        type: 'ADD_TODO',
        payload: { text: 'New todo' },
      });

      expect(newState.todos).toHaveLength(1);
      expect(newState.todos[0].text).toBe('New todo');
      expect(newState.todos[0].completed).toBe(false);
    });

    it('should_prepend_new_todo_to_list', () => {
      const stateWithTodo: TodoState = {
        ...state,
        todos: [{ id: '1', text: 'Existing', completed: false, createdAt: new Date() }],
      };

      const newState = todoReducer(stateWithTodo, {
        type: 'ADD_TODO',
        payload: { text: 'New todo' },
      });

      expect(newState.todos).toHaveLength(2);
      expect(newState.todos[0].text).toBe('New todo');
      expect(newState.todos[1].text).toBe('Existing');
    });

    it('should_not_add_todo_when_text_is_empty', () => {
      const newState = todoReducer(state, {
        type: 'ADD_TODO',
        payload: { text: '   ' },
      });

      expect(newState.todos).toHaveLength(0);
    });
  });

  describe('TOGGLE_TODO', () => {
    it('should_toggle_completed_status_when_toggle_action_dispatched', () => {
      const stateWithTodo: TodoState = {
        ...state,
        todos: [{ id: '1', text: 'Todo', completed: false, createdAt: new Date() }],
      };

      const newState = todoReducer(stateWithTodo, {
        type: 'TOGGLE_TODO',
        payload: { id: '1' },
      });

      expect(newState.todos[0].completed).toBe(true);
    });

    it('should_toggle_back_to_incomplete_when_already_completed', () => {
      const stateWithTodo: TodoState = {
        ...state,
        todos: [{ id: '1', text: 'Todo', completed: true, createdAt: new Date() }],
      };

      const newState = todoReducer(stateWithTodo, {
        type: 'TOGGLE_TODO',
        payload: { id: '1' },
      });

      expect(newState.todos[0].completed).toBe(false);
    });

    it('should_not_modify_other_todos_when_toggling', () => {
      const stateWithTodos: TodoState = {
        ...state,
        todos: [
          { id: '1', text: 'Todo 1', completed: false, createdAt: new Date() },
          { id: '2', text: 'Todo 2', completed: false, createdAt: new Date() },
        ],
      };

      const newState = todoReducer(stateWithTodos, {
        type: 'TOGGLE_TODO',
        payload: { id: '1' },
      });

      expect(newState.todos[0].completed).toBe(true);
      expect(newState.todos[1].completed).toBe(false);
    });
  });

  describe('DELETE_TODO', () => {
    it('should_remove_todo_when_delete_action_dispatched', () => {
      const stateWithTodo: TodoState = {
        ...state,
        todos: [{ id: '1', text: 'Todo', completed: false, createdAt: new Date() }],
      };

      const newState = todoReducer(stateWithTodo, {
        type: 'DELETE_TODO',
        payload: { id: '1' },
      });

      expect(newState.todos).toHaveLength(0);
    });

    it('should_only_remove_specified_todo', () => {
      const stateWithTodos: TodoState = {
        ...state,
        todos: [
          { id: '1', text: 'Todo 1', completed: false, createdAt: new Date() },
          { id: '2', text: 'Todo 2', completed: false, createdAt: new Date() },
        ],
      };

      const newState = todoReducer(stateWithTodos, {
        type: 'DELETE_TODO',
        payload: { id: '1' },
      });

      expect(newState.todos).toHaveLength(1);
      expect(newState.todos[0].id).toBe('2');
    });
  });

  describe('SET_FILTER', () => {
    it('should_update_filter_when_set_filter_dispatched', () => {
      const newState = todoReducer(state, {
        type: 'SET_FILTER',
        payload: { filter: 'active' },
      });

      expect(newState.filter).toBe('active');
    });

    it('should_preserve_todos_when_changing_filter', () => {
      const stateWithTodo: TodoState = {
        ...state,
        todos: [{ id: '1', text: 'Todo', completed: false, createdAt: new Date() }],
      };

      const newState = todoReducer(stateWithTodo, {
        type: 'SET_FILTER',
        payload: { filter: 'completed' },
      });

      expect(newState.todos).toHaveLength(1);
      expect(newState.filter).toBe('completed');
    });
  });

  describe('LOAD_TODOS', () => {
    it('should_load_todos_from_storage', () => {
      const savedTodos: Todo[] = [
        { id: '1', text: 'Saved todo', completed: true, createdAt: new Date() },
      ];

      const newState = todoReducer(state, {
        type: 'LOAD_TODOS',
        payload: { todos: savedTodos },
      });

      expect(newState.todos).toHaveLength(1);
      expect(newState.todos[0].text).toBe('Saved todo');
    });
  });
});

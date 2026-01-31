/**
 * Component Integration Tests
 *
 * Tests the React components with user interactions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';

describe('SimpleTodo App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Adding todos', () => {
    it('should_display_new_todo_when_user_adds_one', async () => {
      const user = userEvent.setup();
      render(<App />);

      const input = screen.getByPlaceholderText('What needs to be done?');
      const addButton = screen.getByRole('button', { name: /add/i });

      await user.type(input, 'Buy groceries');
      await user.click(addButton);

      expect(screen.getByText('Buy groceries')).toBeInTheDocument();
    });

    it('should_clear_input_after_adding_todo', async () => {
      const user = userEvent.setup();
      render(<App />);

      const input = screen.getByPlaceholderText('What needs to be done?');
      await user.type(input, 'Test todo');
      await user.keyboard('{Enter}');

      expect(input).toHaveValue('');
    });

    it('should_not_add_empty_todo', async () => {
      const user = userEvent.setup();
      render(<App />);

      const addButton = screen.getByRole('button', { name: /add/i });
      await user.click(addButton);

      expect(screen.getByText('No todos to display')).toBeInTheDocument();
    });
  });

  describe('Completing todos', () => {
    it('should_toggle_completed_when_checkbox_clicked', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Add a todo
      const input = screen.getByPlaceholderText('What needs to be done?');
      await user.type(input, 'Test todo');
      await user.keyboard('{Enter}');

      // Toggle it
      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(checkbox).toBeChecked();
    });

    it('should_apply_strikethrough_style_when_completed', async () => {
      const user = userEvent.setup();
      render(<App />);

      const input = screen.getByPlaceholderText('What needs to be done?');
      await user.type(input, 'Test todo');
      await user.keyboard('{Enter}');

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      const todoText = screen.getByText('Test todo');
      expect(todoText).toHaveClass('line-through');
    });
  });

  describe('Deleting todos', () => {
    it('should_remove_todo_when_delete_clicked', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Add a todo
      const input = screen.getByPlaceholderText('What needs to be done?');
      await user.type(input, 'Todo to delete');
      await user.keyboard('{Enter}');

      expect(screen.getByText('Todo to delete')).toBeInTheDocument();

      // Delete it
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      expect(screen.queryByText('Todo to delete')).not.toBeInTheDocument();
    });
  });

  describe('Filtering todos', () => {
    it('should_show_only_active_todos_when_active_filter_selected', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Add two todos
      const input = screen.getByPlaceholderText('What needs to be done?');
      await user.type(input, 'Active todo');
      await user.keyboard('{Enter}');
      await user.type(input, 'Completed todo');
      await user.keyboard('{Enter}');

      // Complete one
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Complete "Completed todo" (most recent, first in list)

      // Filter by active
      const activeFilter = screen.getByRole('button', { name: /active/i });
      await user.click(activeFilter);

      expect(screen.getByText('Active todo')).toBeInTheDocument();
      expect(screen.queryByText('Completed todo')).not.toBeInTheDocument();
    });

    it('should_show_only_completed_todos_when_completed_filter_selected', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Add and complete a todo
      const input = screen.getByPlaceholderText('What needs to be done?');
      await user.type(input, 'Done task');
      await user.keyboard('{Enter}');

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      // Filter by completed
      const completedFilter = screen.getByRole('button', { name: /completed/i });
      await user.click(completedFilter);

      expect(screen.getByText('Done task')).toBeInTheDocument();
    });
  });

  describe('Counter', () => {
    it('should_display_correct_items_left_count', async () => {
      const user = userEvent.setup();
      render(<App />);

      const input = screen.getByPlaceholderText('What needs to be done?');
      await user.type(input, 'Todo 1');
      await user.keyboard('{Enter}');
      await user.type(input, 'Todo 2');
      await user.keyboard('{Enter}');

      expect(screen.getByText('2 items left')).toBeInTheDocument();

      // Complete one
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);

      expect(screen.getByText('1 item left')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should_have_accessible_input_label', () => {
      render(<App />);

      const input = screen.getByLabelText(/new todo text/i);
      expect(input).toBeInTheDocument();
    });

    it('should_have_accessible_filter_navigation', () => {
      render(<App />);

      const nav = screen.getByRole('navigation', { name: /filter todos/i });
      expect(nav).toBeInTheDocument();
    });

    it('should_be_keyboard_navigable', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Tab to input and type
      await user.tab();
      await user.keyboard('New todo');
      await user.tab(); // to add button
      await user.keyboard('{Enter}');

      expect(screen.getByText('New todo')).toBeInTheDocument();
    });
  });
});

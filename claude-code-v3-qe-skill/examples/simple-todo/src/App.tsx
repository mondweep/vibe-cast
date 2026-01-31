/**
 * SimpleTodo App
 *
 * Main application component
 * Built with: DDD + ADR + TDD methodology
 */

import { useTodos } from './hooks/useTodos';
import { TodoInput } from './components/TodoInput';
import { TodoList } from './components/TodoList';
import { TodoFilter } from './components/TodoFilter';
import './App.css';

export function App() {
  const {
    todos,
    filter,
    activeCount,
    completedCount,
    totalCount,
    addTodo,
    toggleTodo,
    deleteTodo,
    setFilter,
  } = useTodos();

  return (
    <main className="todo-app">
      <header className="app-header">
        <h1>SimpleTodo</h1>
        <p className="subtitle">Built with TDD</p>
      </header>

      <section className="todo-container">
        <TodoInput onAdd={addTodo} />

        <TodoFilter
          current={filter}
          onChange={setFilter}
          activeCount={activeCount}
          completedCount={completedCount}
        />

        <TodoList
          todos={todos}
          onToggle={toggleTodo}
          onDelete={deleteTodo}
        />

        {totalCount > 0 && (
          <footer className="todo-footer">
            <span className="todo-count">
              {activeCount} item{activeCount !== 1 ? 's' : ''} left
            </span>
          </footer>
        )}
      </section>
    </main>
  );
}

export default App;

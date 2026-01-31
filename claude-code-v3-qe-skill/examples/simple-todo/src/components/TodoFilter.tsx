/**
 * TodoFilter Component
 *
 * Filter tabs for All, Active, Completed
 * Accessible: keyboard navigation, ARIA current
 */

import { TodoFilter as FilterType } from '../types/todo';

interface TodoFilterProps {
  current: FilterType;
  onChange: (filter: FilterType) => void;
  activeCount: number;
  completedCount: number;
}

export function TodoFilter({
  current,
  onChange,
  activeCount,
  completedCount,
}: TodoFilterProps) {
  const filters: { value: FilterType; label: string; count?: number }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active', count: activeCount },
    { value: 'completed', label: 'Completed', count: completedCount },
  ];

  return (
    <nav className="todo-filters" aria-label="Filter todos">
      <ul className="filter-list">
        {filters.map(({ value, label, count }) => (
          <li key={value}>
            <button
              onClick={() => onChange(value)}
              className={`filter-btn ${current === value ? 'active' : ''}`}
              aria-current={current === value ? 'page' : undefined}
              type="button"
            >
              {label}
              {count !== undefined && <span className="count"> ({count})</span>}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

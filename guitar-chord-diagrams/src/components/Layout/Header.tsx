import DarkModeToggle from './DarkModeToggle';

type Theme = 'light' | 'dark' | 'system';

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
}

export default function Header({ theme, onToggleTheme }: HeaderProps) {
  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50 print:hidden">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Chord<span className="text-indigo-600 dark:text-indigo-400">Lab</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-400 hidden sm:block">Guitar Chord Diagram Explorer</p>
          <DarkModeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>
    </header>
  );
}

import DarkModeToggle from './DarkModeToggle';
import UserMenu from '../Auth/UserMenu';
import type { User } from '@supabase/supabase-js';

type Theme = 'light' | 'dark' | 'system';

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
  user: User | null;
  isConfigured: boolean;
  onSignInClick: () => void;
  onSignOut: () => void;
  onViewHistory: () => void;
  onAboutClick: () => void;
}

export default function Header({ theme, onToggleTheme, user, isConfigured, onSignInClick, onSignOut, onViewHistory, onAboutClick }: HeaderProps) {
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
          <button
            onClick={onAboutClick}
            className="text-sm text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 hidden sm:block transition-colors"
          >
            About
          </button>
          <DarkModeToggle theme={theme} onToggle={onToggleTheme} />
          {isConfigured && (
            user ? (
              <UserMenu user={user} onSignOut={onSignOut} onViewHistory={onViewHistory} />
            ) : (
              <button
                onClick={onSignInClick}
                className="px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
              >
                Sign In
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
}

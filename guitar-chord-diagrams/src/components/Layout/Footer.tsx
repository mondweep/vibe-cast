export default function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 mt-auto print:hidden">
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-400 dark:text-gray-500">
        <span>
          ChordLab — Built by{' '}
          <a
            href="https://www.linkedin.com/in/mondweepchakravorty"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
          >
            Mondweep Chakravorty
          </a>
        </span>
        <a
          href="https://github.com/mondweep/vibe-cast"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          GitHub
        </a>
      </div>
    </footer>
  );
}

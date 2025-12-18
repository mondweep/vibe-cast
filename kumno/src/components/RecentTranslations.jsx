import { useState, useEffect } from 'react';
import { getRecentTranslations } from '../utils/db';

export function RecentTranslations() {
  const [translations, setTranslations] = useState([]);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    loadTranslations();
  }, []);

  const loadTranslations = async () => {
    const recent = await getRecentTranslations(5);
    setTranslations(recent);
  };

  const handleCopy = async (translation) => {
    try {
      await navigator.clipboard.writeText(translation.khasi);
      setCopied(translation.id);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (translations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <span className="text-2xl">🕐</span>
        <div>
          <h2 className="text-lg font-semibold text-white">Recent Translations</h2>
          <p className="text-xs text-slate-400">Available offline</p>
        </div>
      </div>

      {/* Translations List */}
      <div className="space-y-2">
        {translations.map((translation) => (
          <div
            key={translation.id}
            className="card p-3 hover:border-slate-600 transition-all"
          >
            <div className="flex justify-between items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-slate-400 text-xs truncate">{translation.englishOriginal}</p>
                <p className="text-white text-sm font-medium truncate">{translation.khasi}</p>
              </div>
              <button
                onClick={() => handleCopy(translation)}
                className={`shrink-0 p-1.5 rounded-lg transition-all duration-200 ${
                  copied === translation.id
                    ? 'bg-khasi-green text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                {copied === translation.id ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

function SkeletonLoader() {
  return (
    <div className="space-y-3 p-4 bg-slate-800/50 rounded-xl">
      <div className="skeleton h-4 w-3/4" />
      <div className="skeleton h-6 w-full" />
      <div className="skeleton h-4 w-1/2" />
    </div>
  );
}

function TranslationResult({ result, onCopy }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.assamese);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="card border-axom-accent/30">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs px-2 py-0.5 bg-axom-accent/20 text-axom-accent rounded-full">
              {result.fromCache ? 'Cached' : 'AI Translation'}
            </span>
          </div>
          <p className="text-slate-400 text-sm mb-1">{result.english}</p>
          <p className="text-white text-lg font-medium mb-1">{result.assamese}</p>
          <p className="text-axom-accent text-sm italic">{result.phonetic}</p>
        </div>

        <button
          onClick={handleCopy}
          className={`shrink-0 p-2 rounded-lg transition-all duration-200 ${
            copied
              ? 'bg-axom-green text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
          }`}
          title="Copy to clipboard"
        >
          {copied ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

export function LiveTranslate() {
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState(null);
  const { translate, isLoading, error, monthlyUsage, usageLimit } = useTranslation();
  const isOnline = useOnlineStatus();

  const handleTranslate = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const translationResult = await translate(inputText);
    if (translationResult) {
      setResult(translationResult);
    }
  };

  const usagePercentage = (monthlyUsage / usageLimit) * 100;

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <span className="text-2xl">🤖</span>
        <div>
          <h2 className="text-lg font-semibold text-white">Live-Talk AI Bridge</h2>
          <p className="text-xs text-slate-400">
            {isOnline ? 'Translate any phrase with AI' : 'Requires internet connection'}
          </p>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-sm text-amber-200">
        <p>
          ⚠️ AI translations are experimental. Use verified phrases from the Vault for essential safety/directions.
        </p>
      </div>

      {/* Input Form */}
      <form onSubmit={handleTranslate} className="space-y-3">
        <div className="relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isOnline ? "Type English phrase to translate..." : "Go online to use AI translation"}
            disabled={!isOnline}
            className="input-field min-h-[100px] resize-none pr-16 disabled:opacity-50 disabled:cursor-not-allowed"
            maxLength={500}
          />
          <span className="absolute bottom-3 right-3 text-xs text-slate-500">
            {inputText.length}/500
          </span>
        </div>

        <button
          type="submit"
          disabled={!isOnline || isLoading || !inputText.trim()}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Translating...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6" />
              </svg>
              Translate to Assamese
            </>
          )}
        </button>
      </form>

      {/* Loading State */}
      {isLoading && <SkeletonLoader />}

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-300">
          <p>❌ {error}</p>
        </div>
      )}

      {/* Result */}
      {result && !isLoading && (
        <TranslationResult result={result} />
      )}

      {/* Usage Indicator */}
      <div className="bg-slate-800/50 rounded-xl p-3">
        <div className="flex justify-between text-xs text-slate-400 mb-2">
          <span>Monthly Usage</span>
          <span>{monthlyUsage.toLocaleString()} / {usageLimit.toLocaleString()} chars</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              usagePercentage > 90 ? 'bg-red-500' : usagePercentage > 70 ? 'bg-amber-500' : 'bg-axom-green'
            }`}
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

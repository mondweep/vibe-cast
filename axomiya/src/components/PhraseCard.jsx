import { useState } from 'react';

export function PhraseCard({ phrase, respectMode }) {
  const [copied, setCopied] = useState(false);

  // Determine which text to show based on respect mode
  const getAssameseText = () => {
    if (respectMode === 'male' && phrase.respectMale) {
      return phrase.respectMale;
    }
    if (respectMode === 'female' && phrase.respectFemale) {
      return phrase.respectFemale;
    }
    return phrase.assamese;
  };

  const getPhoneticText = () => {
    if (respectMode === 'male' && phrase.phoneticMale) {
      return phrase.phoneticMale;
    }
    if (respectMode === 'female' && phrase.phoneticFemale) {
      return phrase.phoneticFemale;
    }
    return phrase.phonetic;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getAssameseText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="card hover:border-axom-accent/50 transition-all duration-200">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-slate-400 text-sm mb-1">{phrase.english}</p>
          <p className="text-white text-lg font-medium mb-1">{getAssameseText()}</p>
          <p className="text-axom-accent text-sm italic">{getPhoneticText()}</p>
          {phrase.context && (
            <p className="text-slate-500 text-xs mt-2">{phrase.context}</p>
          )}
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

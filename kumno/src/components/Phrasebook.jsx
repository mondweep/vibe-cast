import { useState } from 'react';
import phrasebookData from '../data/phrasebook.json';
import { PhraseCard } from './PhraseCard';
import { RespectToggle } from './RespectToggle';

export function Phrasebook() {
  const [selectedCategory, setSelectedCategory] = useState(phrasebookData.categories[0].id);
  const [respectMode, setRespectMode] = useState('neutral');
  const [searchQuery, setSearchQuery] = useState('');

  const currentCategory = phrasebookData.categories.find(
    (cat) => cat.id === selectedCategory
  );

  const filteredPhrases = searchQuery
    ? phrasebookData.categories
        .flatMap((cat) => cat.phrases)
        .filter(
          (phrase) =>
            phrase.english.toLowerCase().includes(searchQuery.toLowerCase()) ||
            phrase.khasi.toLowerCase().includes(searchQuery.toLowerCase())
        )
    : currentCategory?.phrases || [];

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📚</span>
          <div>
            <h2 className="text-lg font-semibold text-white">Street-Verified Vault</h2>
            <p className="text-xs text-slate-400">Works offline</p>
          </div>
        </div>
        <RespectToggle value={respectMode} onChange={setRespectMode} />
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search phrases..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field pl-10"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      </div>

      {/* Category Pills */}
      {!searchQuery && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {phrasebookData.categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
                selectedCategory === category.id
                  ? 'bg-khasi-accent text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span>{category.icon}</span>
              <span className="text-sm font-medium">{category.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Phrases Grid */}
      <div className="grid gap-3">
        {filteredPhrases.map((phrase) => (
          <PhraseCard
            key={phrase.id}
            phrase={phrase}
            respectMode={respectMode}
          />
        ))}
      </div>

      {filteredPhrases.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <p>No phrases found</p>
        </div>
      )}
    </div>
  );
}

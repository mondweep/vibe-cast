export function RespectToggle({ value, onChange }) {
  return (
    <div className="flex items-center gap-2 bg-slate-800 rounded-xl p-1">
      <button
        onClick={() => onChange('neutral')}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          value === 'neutral'
            ? 'bg-axom-accent text-axom-dark'
            : 'text-slate-400 hover:text-white'
        }`}
      >
        Casual
      </button>
      <button
        onClick={() => onChange('male')}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          value === 'male'
            ? 'bg-blue-500 text-white'
            : 'text-slate-400 hover:text-white'
        }`}
        title="Deuta - Respectful address for elder males"
      >
        Deuta
      </button>
      <button
        onClick={() => onChange('female')}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          value === 'female'
            ? 'bg-pink-500 text-white'
            : 'text-slate-400 hover:text-white'
        }`}
        title="Maa - Respectful address for elder females"
      >
        Maa
      </button>
    </div>
  );
}

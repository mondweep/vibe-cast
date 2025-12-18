export function TabNavigation({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'vault', label: 'Vault', icon: '📚' },
    { id: 'translate', label: 'Live Talk', icon: '🤖' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-khasi-dark/95 backdrop-blur-sm border-t border-slate-700/50 safe-area-bottom">
      <div className="max-w-lg mx-auto px-4">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all ${
                activeTab === tab.id
                  ? 'text-khasi-accent'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs font-medium">{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 h-0.5 w-12 bg-khasi-accent rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

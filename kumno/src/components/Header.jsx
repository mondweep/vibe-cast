import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function Header() {
  const isOnline = useOnlineStatus();

  return (
    <header className="sticky top-0 z-50 bg-khasi-dark/95 backdrop-blur-sm border-b border-slate-700/50">
      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-khasi-accent to-blue-600 rounded-xl flex items-center justify-center text-xl">
              🗣️
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Kumno</h1>
              <p className="text-xs text-slate-400">Khasi Companion</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">
              {isOnline ? 'Online' : 'Offline'}
            </span>
            <div
              className={`w-3 h-3 rounded-full ${
                isOnline
                  ? 'bg-khasi-green shadow-lg shadow-khasi-green/50'
                  : 'bg-khasi-amber shadow-lg shadow-khasi-amber/50'
              } animate-pulse`}
              title={isOnline ? 'Online - Live translation available' : 'Offline - Using cached phrases only'}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

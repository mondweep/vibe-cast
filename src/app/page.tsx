import { Shell } from '@/components/layout/Shell';
import { Globe } from '@/components/visuals/Globe';

export default function Home() {
  return (
    <Shell>
      <div className="flex flex-col h-full relative">
        {/* Overlay Header */}
        <div className="absolute top-0 left-0 w-full p-8 z-10 pointer-events-none">
          <div className="max-w-4xl">
            <h1 className="text-5xl font-extrabold tracking-tight text-white mb-2 font-sans">
              Global <span className="text-cyan-400">Connectivity</span> Pulse
            </h1>
            <p className="text-lg text-slate-400 max-w-xl">
              Real-time monitoring of fleet status, active sessions, and network health across 190+ countries.
            </p>
          </div>

          <div className="mt-8 flex gap-6">
            <div className="p-4 bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-xl">
              <div className="text-slate-400 text-sm font-mono uppercase">Active SIMs</div>
              <div className="text-3xl font-bold text-white">142,893</div>
            </div>
            <div className="p-4 bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-xl">
              <div className="text-slate-400 text-sm font-mono uppercase">Data Today</div>
              <div className="text-3xl font-bold text-cyan-400">8.4 TB</div>
            </div>
            <div className="p-4 bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-xl">
              <div className="text-slate-400 text-sm font-mono uppercase">Alerts</div>
              <div className="text-3xl font-bold text-red-500">3</div>
            </div>
          </div>
        </div>

        {/* 3D Visualization */}
        <div className="flex-1 w-full h-full bg-black relative">
          <Globe />
        </div>
      </div>
    </Shell>
  );
}

import React from 'react';
import { Sidebar } from './Sidebar';

interface ShellProps {
    children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
    return (
        <div className="flex h-screen w-full bg-slate-950 text-white overflow-hidden font-sans selection:bg-cyan-500/30">
            <Sidebar />
            <main className="flex-1 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black z-0" />
                <div className="relative z-10 w-full h-full">
                    {children}
                </div>
            </main>
        </div>
    );
}

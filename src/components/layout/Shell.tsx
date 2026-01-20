"use client";

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';

interface ShellProps {
    children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    console.log('DEBUG: Shell render. isMobileMenuOpen:', isMobileMenuOpen);

    return (
        <div className="flex flex-col md:flex-row h-screen w-full bg-slate-950 text-white overflow-hidden font-sans selection:bg-cyan-500/30">
            {/* Mobile Header - Visible only on small screens */}
            <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 z-50">
                <div className="font-bold text-lg text-cyan-400 tracking-tighter">MOVE<span className="text-white">CMD</span></div>
                <button
                    onClick={() => {
                        console.log('DEBUG: Mobile toggle clicked. Current:', isMobileMenuOpen, 'Next:', !isMobileMenuOpen);
                        setIsMobileMenuOpen(!isMobileMenuOpen);
                    }}
                    className="p-2 text-slate-400 hover:text-white"
                >
                    <Menu className="w-6 h-6" />
                </button>
            </div>

            {/* Sidebar - Pass mobile state */}
            <Sidebar
                isMobileOpen={isMobileMenuOpen}
                onMobileClose={() => setIsMobileMenuOpen(false)}
            />

            {/* Main Content Area */}
            <main className="flex-1 relative overflow-hidden flex flex-col h-full">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black z-0 pointer-events-none" />

                {/* Scrollable Content Container */}
                <div className="relative z-10 w-full h-full overflow-y-auto overflow-x-hidden">
                    {children}
                </div>
            </main>
        </div>
    );
}

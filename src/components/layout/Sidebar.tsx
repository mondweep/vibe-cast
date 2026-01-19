"use client";

import React, { useState } from 'react';
import { Globe, Smartphone, Truck, Menu, X, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  currentInfo?: string;
}

const navItems = [
  { id: 'global-pulse', label: 'Global Pulse', icon: Globe, path: '/' },
  { id: 'esim-factory', label: 'eSIM Factory', icon: Smartphone, path: '/esim-factory' },
  { id: 'fleet-health', label: 'Fleet Health', icon: Truck, path: '/fleet-health' },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const pathname = usePathname();

  return (
    <>
      <motion.div
        initial={{ width: 240 }}
        animate={{ width: isOpen ? 240 : 80 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="h-screen bg-slate-900/90 backdrop-blur-xl border-r border-slate-700/50 flex flex-col relative z-50 text-slate-100"
      >
        {/* Header */}
        <div className="p-6 flex items-center justify-between">
          <AnimatePresence mode='wait'>
            {isOpen ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 font-bold text-xl tracking-tighter text-cyan-400"
              >
                <Activity className="w-6 h-6" />
                <span>MOVE<span className="text-white">CMD</span></span>
              </motion.div>
            ) : (
              <div className="mx-auto">
                <Activity className="w-6 h-6 text-cyan-400" />
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <nav className="flex-1 mt-8 space-y-2 px-3">
          {navItems.map((item) => {
            const isActive = pathname === item.path;

            return (
              <Link key={item.id} href={item.path} passHref className="block w-full">
                <div
                  className={clsx(
                    "w-full flex items-center p-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                    isActive
                      ? "bg-cyan-500/10 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.2)] border border-cyan-500/20"
                      : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-pill"
                      className="absolute inset-0 bg-cyan-400/5 rounded-xl"
                      transition={{ type: "spring", duration: 0.6 }}
                    />
                  )}
                  <item.icon className={clsx("w-6 h-6 flex-shrink-0", isOpen ? "mr-3" : "mx-auto")} />

                  <AnimatePresence>
                    {isOpen && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="font-medium whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer / User */}
        <div className="p-4 border-t border-slate-700/50">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-colors"
            title={isOpen ? "Collapse" : "Expand"}
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </motion.div>
    </>
  );
}

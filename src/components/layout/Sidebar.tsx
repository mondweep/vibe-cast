"use client";

import React, { useState, useEffect } from 'react';
import { Globe, Smartphone, Truck, Menu, X, Activity, Play, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTour } from './TourProvider';

interface SidebarProps {
  currentInfo?: string;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const navItems = [
  { id: 'global-pulse', label: 'Global Pulse', icon: Globe, path: '/' },
  { id: 'esim-factory', label: 'eSIM Factory', icon: Smartphone, path: '/esim-factory' },
  { id: 'fleet-health', label: 'Fleet Health', icon: Truck, path: '/fleet-health' },
  { id: 'about', label: 'Project Context', icon: Info, path: '/about' },
];

export function Sidebar({ isMobileOpen = false, onMobileClose }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const { startTour } = useTour();

  // Close mobile menu on route change
  useEffect(() => {
    if (onMobileClose) {
      onMobileClose();
    }
  }, [pathname, onMobileClose]); // Added onMobileClose to dep array, technically stable but good practice

  // Determine effective open state based on screen size
  // On Desktop: !isCollapsed
  // On Mobile: isMobileOpen
  const isDesktopOpen = !isCollapsed;

  const sidebarVariants = {
    mobileHidden: { x: "-100%" },
    mobileVisible: { x: 0 },
    desktopExpanded: { width: 240 },
    desktopCollapsed: { width: 80 }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onMobileClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      <motion.div
        // Apply different animations based on screen size (handled via className + Framer variants not mixing well with simple media queries in JS, so we use conditionals)
        // Going with the safe fix: Remove the empty 'animate' object and ensure className logic is sound.
        // Also boosting z-index.
        className={clsx(
          "fixed inset-y-0 left-0 z-[100] bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 flex flex-col text-slate-100 transition-transform duration-300 ease-in-out",
          // Mobile Positioning: Fixed and toggled via translate
          "md:translate-x-0 md:relative",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop Width
          isDesktopOpen ? "md:w-60" : "md:w-20",
          "w-64" // Fixed width on mobile
        )}
      >
        {/* Header */}
        <div className="p-6 flex items-center justify-between">
          <AnimatePresence mode='wait'>
            {(isDesktopOpen || isMobileOpen) ? (
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
              <div className="mx-auto hidden md:block">
                <Activity className="w-6 h-6 text-cyan-400" />
              </div>
            )}
          </AnimatePresence>

          {/* Mobile Close Button */}
          <button onClick={onMobileClose} className="md:hidden text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 mt-8 space-y-2 px-3">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const showLabel = isDesktopOpen || isMobileOpen;

            return (
              <Link
                key={item.id}
                href={item.path}
                className={clsx(
                  "block w-full flex items-center p-3 rounded-xl transition-all duration-200 group relative overflow-hidden mb-1",
                  isActive
                    ? "bg-cyan-500/10 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.2)] border border-cyan-500/20"
                    : "hover:bg-white/10"
                )}
                style={{ color: isActive ? '#22d3ee' : '#FFFFFF', textDecoration: 'none' }}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 bg-cyan-400/5 rounded-xl"
                    transition={{ type: "spring", duration: 0.6 }}
                  />
                )}
                <item.icon className={clsx("w-6 h-6 flex-shrink-0", (showLabel) ? "mr-3" : "mx-auto")} />

                <AnimatePresence>
                  {(showLabel) && (
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
              </Link>
            );
          })}
        </nav>

        {/* Footer / User */}
        <div className="p-4 border-t border-slate-700/50 space-y-2">
          {(isDesktopOpen || isMobileOpen) && (
            <button
              onClick={startTour}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all hover:scale-[1.02]"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Start Demo</span>
            </button>
          )}

          {/* Desktop Collapse Toggle - Hidden on Mobile */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full md:flex items-center justify-center p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-colors hidden"
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? <Menu className="w-5 h-5" /> : <Menu className="w-5 h-5 rotate-90" />}
            {/* Using Rotate instead of X for collapse to distinguish from Close */}
          </button>
        </div>
      </motion.div >
    </>
  );
}

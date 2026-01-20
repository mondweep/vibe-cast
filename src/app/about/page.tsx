"use client";

import { Shell } from '@/components/layout/Shell';
import { motion } from 'framer-motion';
import { BookOpen, Cpu, Globe, Info, Layers, Server, Shield, Zap, Anchor, Box, Activity, Lock, Smartphone } from 'lucide-react';
import clsx from 'clsx';

export default function AboutPage() {
    return (
        <Shell>
            <div className="min-h-full p-6 md:p-12 max-w-7xl mx-auto pb-24 space-y-12">

                {/* Header Section */}
                <header className="space-y-6 max-w-4xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-widest"
                    >
                        <Info className="w-3 h-3" /> Project Architecture
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight"
                    >
                        The <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Global Nervous System</span> for IoT.
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-lg md:text-xl text-slate-400 leading-relaxed font-light"
                    >
                        We turned complex telecommunications APIs into a tangible, living 3D experience. This is not just a dashboard; it's a mission control for the invisible network that runs our world.
                    </motion.p>
                </header>

                {/* Bento Grid Layout */}
                <motion.section
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-[minmax(180px,auto)]"
                >

                    {/* Card: The Mission */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2 bg-slate-900/50 border border-slate-700 p-8 rounded-3xl relative overflow-hidden group hover:border-cyan-500/30 transition-colors">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-700">
                            <Globe className="w-64 h-64 text-cyan-400" />
                        </div>
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div>
                                <div className="mb-4 p-3 bg-cyan-500/10 w-fit rounded-xl">
                                    <Globe className="w-6 h-6 text-cyan-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-4">Visualizing the Invisible</h3>
                                <p className="text-slate-400 leading-relaxed max-w-md">
                                    Connectivity is abstract. SIM cards, networks, and data flows are hard to see. We solve the "PoC Struggle" by rendering these invisible assets as interactive 3D nodes on a global scale.
                                </p>
                            </div>
                            <div className="mt-8 flex gap-4">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-white">190+</div>
                                    <div className="text-xs text-slate-500 uppercase tracking-widest">Countries</div>
                                </div>
                                <div className="w-px bg-slate-700" />
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-cyan-400">14ms</div>
                                    <div className="text-xs text-slate-500 uppercase tracking-widest">Latency</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card: Stack */}
                    <div className="col-span-1 md:col-span-1 lg:col-span-1 bg-slate-900/50 border border-slate-700 p-6 rounded-3xl relative group hover:border-purple-500/30 transition-colors">
                        <div className="mb-4">
                            <Layers className="w-8 h-8 text-purple-400 mb-2" />
                            <h3 className="text-lg font-bold text-white">Modern Stack</h3>
                        </div>
                        <ul className="space-y-2 text-sm text-slate-400 font-mono">
                            <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-white" /> Next.js 15</li>
                            <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> React Three Fiber</li>
                            <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Tailwind CSS</li>
                        </ul>
                    </div>

                    {/* Card: AI */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-1 bg-slate-900/50 border border-slate-700 p-6 rounded-3xl relative group hover:border-amber-500/30 transition-colors flex flex-col justify-between">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Zap className="w-24 h-24 text-amber-500" />
                        </div>
                        <div className="relative z-10">
                            <Zap className="w-8 h-8 text-amber-400 mb-4" />
                            <h3 className="text-lg font-bold text-white mb-2">AI-Powered</h3>
                            <p className="text-sm text-slate-400">
                                Integrated with Google Gemini to synthesize network patterns into human-readable insights.
                            </p>
                        </div>
                    </div>

                    {/* Card: eSIM Factory */}
                    <div className="col-span-1 lg:col-span-2 bg-slate-900/50 border border-slate-700 p-6 rounded-3xl relative group hover:border-pink-500/30 transition-colors overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
                            <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700">
                                <Smartphone className="w-8 h-8 text-pink-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">The eSIM Factory</h3>
                                <p className="text-slate-400 text-sm max-w-lg">
                                    Simulating the entire Over-the-Air (OTA) provisioning supply chain. We visualize the handshake between the RSP platform and the device profile interactively.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Card: Realtime Control */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-2 bg-slate-900/50 border border-slate-700 p-8 rounded-3xl relative group hover:border-red-500/30 transition-colors">
                        <div className="absolute top-4 right-4 flex gap-2">
                            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                            <div className="text-xs font-mono text-red-500 uppercase">Live</div>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                            <Activity className="w-6 h-6 text-red-400" /> Real-Time Architecture
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                                <div className="text-xs text-slate-500 uppercase mb-1">Update Frequency</div>
                                <div className="text-white font-mono font-bold">100ms</div>
                            </div>
                            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                                <div className="text-xs text-slate-500 uppercase mb-1">State Sync</div>
                                <div className="text-white font-mono font-bold">Optimistic UI</div>
                            </div>
                        </div>
                    </div>

                </motion.section>

                {/* Footer Quote */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-center pt-12 pb-8 border-t border-slate-800"
                >
                    <p className="text-sm text-slate-500 font-mono">
                        "Any sufficiently advanced technology is indistinguishable from magic."
                    </p>
                </motion.div>

            </div>
        </Shell>
    );
}

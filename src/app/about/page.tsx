"use client";

import { Shell } from '@/components/layout/Shell';
import { motion } from 'framer-motion';
import { BookOpen, Cpu, Globe, Info, Layers, Server, Shield, Zap } from 'lucide-react';

export default function AboutPage() {
    return (
        <Shell>
            <div className="min-h-full p-8 space-y-12 max-w-5xl mx-auto pb-24">

                {/* Header */}
                <header className="space-y-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-widest"
                    >
                        <Info className="w-3 h-3" /> Project Context
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-5xl font-extrabold text-white tracking-tight"
                    >
                        Why <span className="text-cyan-400">MOVE</span> Connectivity Commander?
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-lg text-slate-400 max-w-2xl leading-relaxed"
                    >
                        This application serves as a high-fidelity "Proof of Value" demonstration, designed to solve the challenge of explaining complex IoT connectivity APIs to non-technical stakeholders.
                    </motion.p>
                </header>

                {/* Mission Section */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="grid md:grid-cols-2 gap-8"
                >
                    <div className="bg-slate-900/50 border border-slate-700 p-6 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Layers className="w-24 h-24 text-cyan-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Globe className="w-5 h-5 text-cyan-400" /> The "PoC Struggle"
                        </h3>
                        <p className="text-slate-400 leading-relaxed">
                            Stakeholders often struggle to grasp the power of the MOVE platform through API documentation alone. The "invisible" nature of connectivity—SIMs, networks, data flows—makes it hard to demonstrate control and value.
                        </p>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-700 p-6 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Zap className="w-24 h-24 text-green-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-green-400" /> The Solution
                        </h3>
                        <p className="text-slate-400 leading-relaxed">
                            A "Mission Control" interface that visualizes the invisible. By turning API calls into 3D visualizations and automated workflows, we demonstrate **Operational Supremacy**, not just technical connectivity.
                        </p>
                    </div>
                </motion.section>

                {/* API Research & Mapping */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="space-y-6"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <BookOpen className="w-6 h-6 text-purple-400" />
                        <h2 className="text-2xl font-bold text-white">MOVE API Research & Integration</h2>
                    </div>

                    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-800/50">
                                <tr>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Application Feature</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Powering MOVE API</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Value Demonstrated</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                <tr className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 text-white font-medium">Global Pulse (Globe)</td>
                                    <td className="p-4 font-mono text-sm text-cyan-400">move-sim-connect-api</td>
                                    <td className="p-4 text-slate-400 text-sm">Real-time visibility of global breakdown & fleet status.</td>
                                </tr>
                                <tr className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 text-white font-medium">eSIM Factory</td>
                                    <td className="p-4 font-mono text-sm text-cyan-400">move-esim-hub-api</td>
                                    <td className="p-4 text-slate-400 text-sm">Visualizing the abstract "Profile Download" & Activation process.</td>
                                </tr>
                                <tr className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 text-white font-medium">Crisis Mode Alerts</td>
                                    <td className="p-4 font-mono text-sm text-cyan-400">move-iot-connect-api-v8</td>
                                    <td className="p-4 text-slate-400 text-sm">Handling bulk alerts and device lifecycle states.</td>
                                </tr>
                                <tr className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 text-white font-medium">Live Inspector (Kill Switch)</td>
                                    <td className="p-4 font-mono text-sm text-cyan-400">move-sim-connect-rt-api-v4</td>
                                    <td className="p-4 text-slate-400 text-sm">Demonstrating **Real-Time Control** to stop rogue sessions instantly.</td>
                                </tr>
                                <tr className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 text-white font-medium">Co-Pilot Intelligence</td>
                                    <td className="p-4 font-mono text-sm text-purple-400">Google Gemini 1.5 Pro</td>
                                    <td className="p-4 text-slate-400 text-sm">Synthesizing platform data into executive-level insights.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </motion.section>

                {/* Tech Stack */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                        <Cpu className="w-6 h-6 text-blue-400" /> Technical Architecture
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Next.js 15 (App Router)', icon: Server },
                            { label: 'TailwindCSS + Framer Motion', icon: Layers },
                            { label: 'Three.js / R3F (WebGL)', icon: Globe },
                            { label: 'Google Gemini AI', icon: Zap },
                        ].map((item, i) => (
                            <div key={i} className="bg-slate-900/50 border border-slate-700 p-4 rounded-xl flex flex-col items-center justify-center text-center gap-3 hover:border-cyan-500/50 transition-colors">
                                <item.icon className="w-8 h-8 text-slate-400" />
                                <span className="text-sm font-bold text-slate-300">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </motion.section>

            </div>
        </Shell>
    );
}

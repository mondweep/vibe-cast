"use client";

import React, { useEffect, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { FleetStats } from '@/lib/mock-data';
import { AlertTriangle, Activity, BarChart3, Database, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FleetHealth() {
    const [stats, setStats] = useState<FleetStats | null>(null);
    const [report, setReport] = useState<string | null>(null);
    const [loadingReport, setLoadingReport] = useState(false);

    useEffect(() => {
        fetch('/api/move/fleet/stats')
            .then(res => res.json())
            .then(data => setStats(data));
    }, []);

    const generateReport = async () => {
        if (!stats) return;
        setLoadingReport(true);
        setReport(null);

        try {
            const res = await fetch('/api/move/intelligence/report', {
                method: 'POST',
                body: JSON.stringify({
                    fleetStats: stats,
                    alerts: [
                        { type: 'Data Cap Exceeded', simId: '890123...456', region: 'Brazil' },
                        { type: 'Data Cap Exceeded', simId: '890123...457', region: 'Brazil' },
                        { type: 'Data Cap Exceeded', simId: '890123...458', region: 'Brazil' },
                    ]
                }),
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            const data = await res.json();
            if (data.success) {
                setReport(data.report);
            } else {
                setReport(`Error: ${data.error}`);
            }
        } catch (e) {
            console.error(e);
            setReport("Error: Connection failed. Please check your network.");
        } finally {
            setLoadingReport(false);
        }
    };

    if (!stats) return <Shell><div className="flex h-full items-center justify-center text-cyan-500">Loading Fleet Data...</div></Shell>;

    return (
        <Shell>
            <div className="p-8 h-full overflow-y-auto">
                <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">Fleet <span className="text-cyan-400">Health</span></h1>
                        <p className="text-slate-400">Operational status and anomaly detection.</p>
                    </div>
                    <button
                        onClick={generateReport}
                        disabled={loadingReport}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loadingReport ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                        {loadingReport ? 'Analyzing Fleet...' : 'Ask Co-Pilot'}
                    </button>
                </header>

                {/* AI Insight Card */}
                <AnimatePresence>
                    {report && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="mb-8 bg-indigo-950/30 border border-indigo-500/30 p-6 rounded-2xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                            <h3 className="text-indigo-400 font-bold mb-4 flex items-center gap-2">
                                <Sparkles className="w-4 h-4" />
                                Executive AI Summary
                            </h3>
                            <div className="prose prose-invert prose-sm max-w-none text-indigo-100 whitespace-pre-wrap font-sans leading-relaxed">
                                {report}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Top Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-slate-900/50 border border-slate-700 p-6 rounded-2xl flex flex-col">
                        <div className="text-slate-400 text-sm uppercase font-bold mb-2 flex items-center gap-2">
                            <Activity className="w-4 h-4" /> Total Active
                        </div>
                        <div className="text-3xl font-bold text-white">{stats.totalActive.toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-700 p-6 rounded-2xl flex flex-col">
                        <div className="text-slate-400 text-sm uppercase font-bold mb-2 flex items-center gap-2">
                            <Database className="w-4 h-4" /> Data Usage
                        </div>
                        <div className="text-3xl font-bold text-cyan-400">{stats.totalData}</div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-700 p-6 rounded-2xl flex flex-col">
                        <div className="text-slate-400 text-sm uppercase font-bold mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500" /> Critical Alerts
                        </div>
                        <div className="text-3xl font-bold text-red-500">{stats.alerts}</div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-700 p-6 rounded-2xl flex flex-col">
                        <div className="text-slate-400 text-sm uppercase font-bold mb-2 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" /> Health Score
                        </div>
                        <div className="text-3xl font-bold text-green-400">{stats.healthScore}%</div>
                    </div>
                </div>

                {/* Alerts Section */}
                <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 mb-8">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        Active Alerts
                    </h3>
                    <div className="space-y-4">
                        {[1, 2, 3].map((_, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-red-500/10 rounded-xl border border-red-500/10">
                                <div>
                                    <div className="font-bold text-red-200">Data Cap Exceeded</div>
                                    <div className="text-sm text-red-200/60">Sim ID: 890123...456 • Region: Brazil</div>
                                </div>
                                <button className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg text-sm font-semibold transition-colors">
                                    Resolve
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Shell>
    );
}

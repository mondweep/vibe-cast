"use client";

import React, { useEffect, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { EsimProfile } from '@/lib/mock-data';
import { Download, CheckCircle, Wifi, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function EsimFactory() {
    const [profiles, setProfiles] = useState<EsimProfile[]>([]);
    const [downloading, setDownloading] = useState<string | null>(null);
    const [activeProfiles, setActiveProfiles] = useState<string[]>([]);
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        fetch('/api/move/esim/inventory')
            .then(res => res.json())
            .then(data => setProfiles(data));
    }, []);

    const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 5));

    const handleDownload = async (profileId: string) => {
        setDownloading(profileId);
        addLog(`Initiating download for profile: ${profileId}...`);

        try {
            const res = await fetch('/api/move/esim/download', {
                method: 'POST',
                body: JSON.stringify({ profileId }),
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();

            if (data.success) {
                setActiveProfiles(prev => [...prev, profileId]);
                addLog(`SUCCESS: ${data.message} (ICCID: ${data.iccid})`);
            }
        } catch (e) {
            addLog("ERROR: Download failed.");
        } finally {
            setDownloading(null);
        }
    };

    return (
        <Shell>
            <div className="p-8 h-full overflow-y-auto">
                <header className="mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">eSIM <span className="text-cyan-400">Factory</span></h1>
                    <p className="text-slate-400">Provision and manage global connectivity profiles instantly.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Inventory Grid */}
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {profiles.map((profile) => (
                            <motion.div
                                key={profile.id}
                                layout
                                className="bg-slate-900/50 border border-slate-700 p-6 rounded-2xl backdrop-blur-sm hover:border-cyan-500/50 transition-colors"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-cyan-950/30 rounded-full text-cyan-400">
                                        <Wifi className="w-6 h-6" />
                                    </div>
                                    <span className="text-xl font-bold text-white">{profile.price}</span>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-1">{profile.name}</h3>
                                <p className="text-slate-400 text-sm mb-4">{profile.provider} • {profile.country} • {profile.dataLimit}</p>

                                <button
                                    onClick={() => handleDownload(profile.id)}
                                    disabled={downloading !== null || activeProfiles.includes(profile.id)}
                                    className="w-full py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold flex items-center justify-center gap-2 transition-all"
                                >
                                    {activeProfiles.includes(profile.id) ? (
                                        <>
                                            <CheckCircle className="w-5 h-5" />
                                            Active
                                        </>
                                    ) : downloading === profile.id ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Downloading...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-5 h-5" />
                                            Download Profile
                                        </>
                                    )}
                                </button>
                            </motion.div>
                        ))}
                    </div>

                    {/* Live Logs */}
                    <div className="bg-black/40 border border-slate-800 rounded-2xl p-6 h-fit">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Provisioning Logs</h3>
                        <div className="space-y-3 font-mono text-sm">
                            <AnimatePresence mode='popLayout'>
                                {logs.length === 0 && <span className="text-slate-600 italic">Waiting for operations...</span>}
                                {logs.map((log, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="flex gap-2"
                                    >
                                        <span className="text-cyan-500">➜</span>
                                        <span className="text-slate-300">{log}</span>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </Shell>
    );
}

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
    const [showInfo, setShowInfo] = useState(true); // Default to open for demo


    // Modal State
    const [selectedProfile, setSelectedProfile] = useState<EsimProfile | null>(null);
    const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

    // Mock Target Devices
    const targetDevices = [
        { id: 'dev_01', name: 'BMW 5-Series #001', region: 'Germany', status: 'Offline' },
        { id: 'dev_02', name: 'Logistics Truck #88', region: 'Brazil', status: 'Active (Low Data)' },
        { id: 'dev_03', name: 'Smart Meter Cluster A', region: 'India', status: 'Active' },
        { id: 'dev_04', name: 'Test Device X1', region: 'Lab', status: 'Offline' },
    ];

    useEffect(() => {
        fetch('/api/move/esim/inventory')
            .then(res => res.json())
            .then(data => setProfiles(data));
    }, []);

    const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 5));

    const initiateDownload = (profile: EsimProfile) => {
        setSelectedProfile(profile);
        setSelectedDevice(null); // Reset selection
    };

    const confirmDownload = async () => {
        if (!selectedProfile || !selectedDevice) return;

        const profileId = selectedProfile.id;
        const deviceName = targetDevices.find(d => d.id === selectedDevice)?.name;

        // Close modal
        setSelectedProfile(null);

        // Start Process
        setDownloading(profileId);
        addLog(`Initiating download for ${selectedProfile.name} to ${deviceName}...`);

        try {
            const res = await fetch('/api/move/esim/download', {
                method: 'POST',
                body: JSON.stringify({ profileId, deviceId: selectedDevice }),
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();

            if (data.success) {
                setActiveProfiles(prev => [...prev, profileId]);
                addLog(`SUCCESS: Profile active on ${deviceName} (ICCID: ${data.iccid})`);
            }
        } catch (e) {
            addLog("ERROR: Download failed.");
        } finally {
            setDownloading(null);
        }
    };

    return (
        <Shell>
            <div className="p-8 h-full overflow-y-auto relative">
                <header className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-4xl font-bold text-white">eSIM <span className="text-cyan-400">Factory</span></h1>
                        <button
                            onClick={() => setShowInfo(!showInfo)}
                            className="text-cyan-400 text-sm font-bold hover:text-cyan-300 underline underline-offset-4"
                        >
                            {showInfo ? 'Hide Context' : 'How it works?'}
                        </button>
                    </div>
                    <p className="text-slate-400 mb-6">Provision and manage global connectivity profiles instantly.</p>

                    <AnimatePresence>
                        {showInfo && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-cyan-950/30 border border-cyan-500/20 rounded-xl p-4 overflow-hidden"
                            >
                                <h3 className="text-cyan-300 font-bold mb-2 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                    Digital Supply Chain Demo
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-slate-300">
                                    <div>
                                        <strong className="text-white block mb-1">Software, Not Plastic</strong>
                                        Instead of physically swapping SIM cards, we "manufacture" connectivity by pushing digital profiles over-the-air.
                                    </div>
                                    <div>
                                        <strong className="text-white block mb-1">Just-in-Time Logic</strong>
                                        A vehicle lands in Brazil, detects its location, and instantly downloads a local Brazilian profile to avoid roaming charges.
                                    </div>
                                    <div>
                                        <strong className="text-white block mb-1">The Simulation</strong>
                                        Clicking "Download" simulates the secure cryptographic handshake between the Cloud and the chip (eUICC) in the device.
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
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
                                    onClick={() => initiateDownload(profile)}
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

                {/* Device Selector Modal */}
                <AnimatePresence>
                    {selectedProfile && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl"
                            >
                                <h2 className="text-2xl font-bold text-white mb-2">Select Target Device</h2>
                                <p className="text-slate-400 mb-6">Choose a device to provision with <strong>{selectedProfile.name}</strong>.</p>

                                <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                                    {targetDevices.map(dev => (
                                        <button
                                            key={dev.id}
                                            onClick={() => setSelectedDevice(dev.id)}
                                            className={`w-full text-left p-4 rounded-xl border transition-all ${selectedDevice === dev.id
                                                ? 'border-cyan-500 bg-cyan-500/10 text-white'
                                                : 'border-slate-800 bg-slate-800/50 text-slate-300 hover:bg-slate-800'
                                                }`}
                                        >
                                            <div className="font-bold">{dev.name}</div>
                                            <div className="text-xs opacity-70 flex justify-between">
                                                <span>{dev.region}</span>
                                                <span>{dev.status}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setSelectedProfile(null)}
                                        className="flex-1 py-3 px-4 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmDownload}
                                        disabled={!selectedDevice}
                                        className="flex-1 py-3 px-4 rounded-xl bg-cyan-500 text-black font-bold hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Start Download
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </Shell>
    );
}

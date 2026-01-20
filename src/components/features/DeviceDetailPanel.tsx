"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wifi, AlertTriangle, Activity, Zap, Shield, Ban, Signal } from 'lucide-react';
import { SimCard } from '@/lib/mock-data';

interface DeviceDetailPanelProps {
    sim: SimCard | null;
    onClose: () => void;
}

export function DeviceDetailPanel({ sim, onClose }: DeviceDetailPanelProps) {
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [sessionStatus, setSessionStatus] = useState<'active' | 'term'>('active');
    const [toast, setToast] = useState<{ msg: string, type: 'success' | 'info' } | null>(null);

    // Reset state when opening a new SIM
    React.useEffect(() => {
        if (sim?.id) {
            setSessionStatus('active');
            setActionLoading(null);
            setToast(null);
        }
    }, [sim?.id]);

    if (!sim) return null;

    const handleAction = (action: string) => {
        setActionLoading(action);
        // Simulate API latency
        setTimeout(() => {
            setActionLoading(null);
            if (action === 'kill') {
                setSessionStatus('term');
                setToast({ msg: 'Session Terminated: PDP Context Detached', type: 'success' });
            }
            if (action === 'throttle') {
                setToast({ msg: 'QoS Profile Updated: GOLD → SILVER', type: 'info' });
            }

            // Clear toast
            setTimeout(() => setToast(null), 3000);
        }, 1500);
    };

    return (
        <AnimatePresence>
            {sim && (
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed top-0 right-0 h-full w-96 border-l border-slate-700 shadow-2xl z-50 overflow-y-auto"
                    style={{ backgroundColor: 'rgba(15, 23, 42, 0.98)' }} // Force opaque slate-900
                >
                    {/* Header */}
                    <div className="p-6 border-b border-slate-700 flex justify-between items-start bg-slate-800/50 relative">
                        {/* Toast Overlay */}
                        <AnimatePresence>
                            {toast && (
                                <motion.div
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className={`absolute inset-0 flex items-center justify-center ${toast.type === 'success' ? 'bg-red-500/90' : 'bg-cyan-500/90'} backdrop-blur-sm z-10`}
                                >
                                    <span className="text-white font-bold text-sm tracking-wide flex items-center gap-2">
                                        {toast.type === 'success' ? <Ban className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                                        {toast.msg}
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className={`w-2 h-2 rounded-full ${sim.status === 'active' ? 'bg-cyan-400' : 'bg-red-500'} animate-pulse`} />
                                <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">Live Inspector</span>
                            </div>
                            <h2 className="text-xl font-bold text-white">SIM-{sim.id.slice(0, 8)}</h2>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-8">
                        {/* Technical Identity */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <Shield className="w-3 h-3" /> Identity Matrix
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                                    <div className="text-[10px] text-slate-400 mb-1">ICCID</div>
                                    <div className="text-xs font-mono text-white truncate" title={sim.iccid}>{sim.iccid}</div>
                                </div>
                                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                                    <div className="text-[10px] text-slate-400 mb-1">IMSI</div>
                                    <div className="text-xs font-mono text-white">899124...</div>
                                </div>
                                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 col-span-2">
                                    <div className="text-[10px] text-slate-400 mb-1">IP ADDRESS (FIXED)</div>
                                    <div className="text-xs font-mono text-cyan-400">10.128.44.92</div>
                                </div>
                            </div>
                        </div>

                        {/* Real-Time Telemetry */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <Activity className="w-3 h-3" /> Network Telemetry
                            </h3>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                                    <span className="text-sm text-slate-300">Carrier</span>
                                    <span className="text-sm font-bold text-white text-right">{sim.operator}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                                    <span className="text-sm text-slate-300">Signal Strength (RSRP)</span>
                                    <span className="text-sm font-mono text-green-400">-84 dBm</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                                    <span className="text-sm text-slate-300">Data Session</span>
                                    <span className={`text-sm font-bold ${sessionStatus === 'active' ? 'text-green-400' : 'text-red-500'}`}>
                                        {sessionStatus === 'active' ? 'ESTABLISHED' : 'TERMINATED'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Control Actions */}
                        <div className="space-y-4 pt-4 border-t border-slate-700">
                            <h3 className="text-xs font-bold text-red-400 uppercase flex items-center gap-2">
                                <Zap className="w-3 h-3" /> Critical Actions
                            </h3>

                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    onClick={() => handleAction('kill')}
                                    disabled={actionLoading !== null || sessionStatus === 'term'}
                                    className="group relative w-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/50 rounded-lg p-4 transition-all overflow-hidden"
                                >
                                    <div className="flex items-center justify-center gap-3 relative z-10">
                                        {actionLoading === 'kill' ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <Ban className="w-5 h-5" />
                                        )}
                                        <div className="text-left">
                                            <div className="font-bold text-sm">STOP SESSION</div>
                                            <div className="text-[10px] opacity-70">Force Packet Data Context Detach</div>
                                        </div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleAction('throttle')}
                                    disabled={actionLoading !== null}
                                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 rounded-lg p-3 text-sm font-bold transition-colors flex items-center justify-center gap-2"
                                >
                                    <Signal className="w-4 h-4" />
                                    Change QoS Profile
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-500 text-center">
                                Actions are executed immediately via <span className="font-mono text-cyan-500">move-sim-connect-rt-api-v4</span>
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

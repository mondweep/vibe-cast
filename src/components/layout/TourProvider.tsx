"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, ArrowRight, X } from 'lucide-react';

interface TourContextType {
    startTour: () => void;
    nextStep: () => void;
    endTour: () => void;
    currentStep: number;
    isActive: boolean;
}

const TourContext = createContext<TourContextType | null>(null);

export const useTour = () => {
    const context = useContext(TourContext);
    if (!context) throw new Error("useTour must be used within a TourProvider");
    return context;
};


export function TourProvider({ children }: { children: React.ReactNode }) {
    const [isActive, setIsActive] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    const tourSteps = [
        {
            id: 0,
            path: '/',
            title: "Welcome to Command",
            content: "This represents the 'Global Pulse' of your IoT connectivity. You can see active nodes, real-time latency, and global health status in a single pane of glass.",
            target: "Center Screen"
        },
        {
            id: 1,
            path: '/esim-factory',
            title: "The eSIM Factory",
            content: "Provisioning profiles used to be hard. Here, we simulate the Over-the-Air (OTA) supply chain. Click 'Download' on a profile to see the secure handshake in action.",
            target: "Sidebar > eSIM Factory"
        },
        {
            id: 2,
            path: '/fleet-health',
            title: "Intelligent Operations",
            content: "This is where the magic happens. We aggregate millions of data points into actionable insights. Try the 'Ask Co-Pilot' button to get an AI-generated network analysis.",
            target: "Header > Ask Co-Pilot"
        }
    ];

    // Initialize from sessionStorage on mount
    useEffect(() => {
        setMounted(true);
        const storedActive = sessionStorage.getItem('tour_active');
        const storedStep = sessionStorage.getItem('tour_step');

        if (storedActive === 'true') {
            setIsActive(true);
            if (storedStep) setCurrentStep(parseInt(storedStep));
        }
    }, []);

    // Sync state to sessionStorage
    useEffect(() => {
        if (!mounted) return;
        sessionStorage.setItem('tour_active', String(isActive));
        sessionStorage.setItem('tour_step', String(currentStep));
    }, [isActive, currentStep, mounted]);

    const startTour = () => {
        console.log("Start Tour triggered!");
        setIsActive(true);
        setCurrentStep(0);
        // Force state update immediately before nav
        sessionStorage.setItem('tour_active', 'true');
        sessionStorage.setItem('tour_step', '0');

        if (pathname !== '/') {
            router.push('/');
        }
    };

    const nextStep = () => {
        const next = currentStep + 1;
        if (next >= tourSteps.length) {
            endTour();
        } else {
            setCurrentStep(next);
            router.push(tourSteps[next].path);
        }
    };

    const endTour = () => {
        setIsActive(false);
        setCurrentStep(0);
        sessionStorage.removeItem('tour_active');
        sessionStorage.removeItem('tour_step');
    };

    const currentStepData = tourSteps[currentStep];

    // Don't render overlay until mounted to avoid hydration mismatch
    if (!mounted) return <TourContext.Provider value={{ startTour, nextStep, endTour, currentStep, isActive }}>{children}</TourContext.Provider>;

    return (
        <TourContext.Provider value={{ startTour, nextStep, endTour, currentStep, isActive }}>
            {children}
            {isActive && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border-2 border-cyan-500 p-8 rounded-2xl shadow-2xl max-w-lg relative">
                        <button
                            onClick={endTour}
                            className="absolute top-4 right-4 text-white hover:text-cyan-400"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-2">
                            Guided Tour • Step {currentStep + 1}/{tourSteps.length}
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4">{currentStepData.title}</h2>
                        <p className="text-slate-300 mb-8 leading-relaxed">
                            {currentStepData.content}
                        </p>

                        <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500 italic">
                                Navigating to: {currentStepData.path}
                            </span>
                            <button
                                onClick={nextStep}
                                className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-2 px-6 rounded-lg flex items-center gap-2 transition-colors"
                            >
                                {currentStep === tourSteps.length - 1 ? 'Finish Tour' : 'Next Step'}
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </TourContext.Provider>
    );
}

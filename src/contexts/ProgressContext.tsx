"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  ProgressTracker,
  createProgressTracker,
  recordLessonComplete,
  recordModuleScore,
  getModuleProgress,
  CompletionEvent,
} from "@/domains/progress/entities/ProgressTracker";
import { PersonaType } from "@/types";

const STORAGE_KEY = "aws-course-progress";
const PERSONA_KEY = "aws-course-persona";

interface ProgressContextValue {
  tracker: ProgressTracker;
  persona: PersonaType;
  setPersona: (p: PersonaType) => void;
  completeLesson: (moduleId: string, lessonId: string, minutes: number) => void;
  setModuleScore: (moduleId: string, score: number) => void;
  getProgress: (moduleId: string, totalLessons: number) => number;
  resetProgress: () => void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [tracker, setTracker] = useState<ProgressTracker>(() => createProgressTracker("local-learner"));
  const [persona, setPersonaState] = useState<PersonaType>("student");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setTracker(JSON.parse(raw));
      const saved = localStorage.getItem(PERSONA_KEY) as PersonaType | null;
      if (saved) setPersonaState(saved);
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tracker)); } catch {}
  }, [tracker, hydrated]);

  const setPersona = useCallback((p: PersonaType) => {
    setPersonaState(p);
    try { localStorage.setItem(PERSONA_KEY, p); } catch {}
  }, []);

  const completeLesson = useCallback((moduleId: string, lessonId: string, minutes: number) => {
    const event: CompletionEvent = { moduleId, lessonId, completedAt: new Date(), timeSpentMinutes: minutes };
    setTracker(t => recordLessonComplete(t, event));
  }, []);

  const setModuleScore = useCallback((moduleId: string, score: number) => {
    setTracker(t => recordModuleScore(t, moduleId, score));
  }, []);

  const getProgress = useCallback((moduleId: string, totalLessons: number) =>
    getModuleProgress(tracker, moduleId, totalLessons), [tracker]);

  const resetProgress = useCallback(() => {
    const fresh = createProgressTracker("local-learner");
    setTracker(fresh);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  return (
    <ProgressContext.Provider value={{ tracker, persona, setPersona, completeLesson, setModuleScore, getProgress, resetProgress }}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used within ProgressProvider");
  return ctx;
}

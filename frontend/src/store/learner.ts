import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { LearnerSession } from '../types/index';
import { sessionAPI } from '../services/api';

interface LearnerStore {
  session: LearnerSession | null;
  isLoading: boolean;
  error: string | null;
  loginUser: (userId: string, email: string, name: string) => Promise<void>;
  startSession: () => void;
  setCurrentModule: (moduleId: number) => Promise<void>;
  markModuleComplete: (moduleId: number) => Promise<void>;
  getProgress: () => number;
  logoutUser: () => void;
}

export const useLearnerStore = create<LearnerStore>()(
  devtools(
    persist(
      (set, get) => ({
        session: null,
        isLoading: false,
        error: null,

        loginUser: async (userId, email, displayName) => {
          set({ isLoading: true, error: null });
          try {
            // Try to create session on backend
            const backendSession = await sessionAPI.create(userId, email, displayName);
            set({
              session: backendSession,
              isLoading: false,
            });
          } catch (error) {
            // Fallback to local session if backend fails
            console.warn('Backend session creation failed, using local session:', error);
            const sessionId = `session_${Date.now()}`;
            set({
              session: {
                user_id: userId,
                session_id: sessionId,
                module_id: 0,
                completed_modules: [],
                started_at: new Date(),
                last_interaction_at: new Date(),
              },
              isLoading: false,
              error: null, // Don't show error for fallback - it's expected behavior
            });
          }
        },

        startSession: () => {
          set((state) => {
            if (!state.session) return state;
            return {
              session: {
                ...state.session,
                started_at: new Date(),
              },
            };
          });
        },

        setCurrentModule: async (moduleId) => {
          set((state) => {
            if (!state.session) return state;
            return {
              session: {
                ...state.session,
                module_id: moduleId,
                last_interaction_at: new Date(),
              },
            };
          });

          // Try to sync with backend
          const session = get().session;
          if (session?.user_id) {
            try {
              await sessionAPI.updateProgress(session.user_id, moduleId);
            } catch (error) {
              console.warn('Failed to sync module change to backend:', error);
              // Continue with local state - it's already updated
            }
          }
        },

        markModuleComplete: async (moduleId) => {
          set((state) => {
            if (!state.session) return state;
            const completed = new Set(state.session.completed_modules);
            completed.add(moduleId);
            return {
              session: {
                ...state.session,
                completed_modules: Array.from(completed),
                last_interaction_at: new Date(),
              },
            };
          });

          // Try to sync with backend
          const session = get().session;
          if (session?.user_id) {
            try {
              await sessionAPI.updateProgress(session.user_id, moduleId);
            } catch (error) {
              console.warn('Failed to sync module completion to backend:', error);
              // Continue with local state - it's already updated
            }
          }
        },

        getProgress: () => {
          const session = get().session;
          if (!session) return 0;
          // 9 modules total (0-8)
          return (session.completed_modules.length / 9) * 100;
        },

        logoutUser: () => {
          set({ session: null, error: null });
        },
      }),
      {
        name: 'learner-storage',
      }
    )
  )
);

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { LearnerSession } from '../types/index';

interface LearnerStore {
  session: LearnerSession | null;
  loginUser: (userId: string, email: string, name: string) => void;
  startSession: () => void;
  setCurrentModule: (moduleId: number) => void;
  markModuleComplete: (moduleId: number) => void;
  getProgress: () => number;
  logoutUser: () => void;
}

export const useLearnerStore = create<LearnerStore>()(
  devtools(
    persist(
      (set, get) => ({
        session: null,

        loginUser: (userId, _email, _name) => {
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
          });
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

        setCurrentModule: (moduleId) => {
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
        },

        markModuleComplete: (moduleId) => {
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
        },

        getProgress: () => {
          const session = get().session;
          if (!session) return 0;
          // 9 modules total (0-8)
          return (session.completed_modules.length / 9) * 100;
        },

        logoutUser: () => {
          set({ session: null });
        },
      }),
      {
        name: 'learner-storage',
      }
    )
  )
);

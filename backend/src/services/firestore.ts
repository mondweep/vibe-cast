import * as admin from 'firebase-admin';
import { LearnerSession, UserProfile } from '../types/index';

const db = (): admin.firestore.Firestore => admin.firestore();

export const firebaseService = {
  async getUserSession(userId: string): Promise<LearnerSession | null> {
    const doc = await db().collection('sessions').doc(userId).get();
    return doc.exists ? (doc.data() as LearnerSession) : null;
  },

  async createUserSession(
    userId: string,
    email: string,
    displayName: string
  ): Promise<LearnerSession> {
    const sessionId = `session_${Date.now()}`;
    const session: LearnerSession = {
      user_id: userId,
      session_id: sessionId,
      module_id: 0,
      completed_modules: [],
      started_at: new Date(),
      last_interaction_at: new Date(),
    };

    await db().collection('sessions').doc(userId).set(session);

    const profile: UserProfile = {
      uid: userId,
      email,
      display_name: displayName,
      created_at: new Date(),
      last_login: new Date(),
      progress: 0,
    };

    await db().collection('users').doc(userId).set(profile);

    return session;
  },

  async updateUserProgress(
    userId: string,
    moduleId: number
  ): Promise<LearnerSession> {
    const sessionRef = db().collection('sessions').doc(userId);
    const session = await sessionRef.get();

    if (!session.exists) {
      throw new Error('Session not found');
    }

    const data = session.data() as LearnerSession;
    const completedModules = new Set(data.completed_modules);
    completedModules.add(moduleId);

    const updatedSession: LearnerSession = {
      ...data,
      completed_modules: Array.from(completedModules),
      module_id: moduleId,
      last_interaction_at: new Date(),
    };

    await sessionRef.update({
      completed_modules: Array.from(completedModules),
      module_id: moduleId,
      last_interaction_at: new Date(),
    });

    return updatedSession;
  },

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const doc = await db().collection('users').doc(userId).get();
    return doc.exists ? (doc.data() as UserProfile) : null;
  },

  async saveAssessmentAnswer(
    userId: string,
    questionId: string,
    answer: string,
    isCorrect: boolean
  ): Promise<void> {
    await db()
      .collection('assessments')
      .doc(userId)
      .collection('answers')
      .add({
        question_id: questionId,
        user_answer: answer,
        is_correct: isCorrect,
        timestamp: new Date(),
      });
  },

  async getSimulationState(userId: string): Promise<Record<string, unknown> | null> {
    const doc = await db()
      .collection('simulations')
      .doc(userId)
      .get();
    return doc.exists ? doc.data() || null : null;
  },

  async saveSimulationState(
    userId: string,
    state: Record<string, unknown>
  ): Promise<void> {
    await db().collection('simulations').doc(userId).set({
      ...state,
      updated_at: new Date(),
    });
  },
};

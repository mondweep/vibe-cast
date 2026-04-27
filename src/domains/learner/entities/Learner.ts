import { PersonaType } from "@/types";

export interface PreferenceProfile {
  preferredDifficulty: "foundation" | "specialty";
  preferVisualContent: boolean;
  dailyGoalMinutes: number;
}

export interface Learner {
  id: string;
  email: string;
  displayName: string;
  persona: PersonaType;
  enrolledAt: Date;
  preferences: PreferenceProfile;
}

export function createLearner(
  id: string,
  email: string,
  displayName: string,
  persona: PersonaType
): Learner {
  if (!email.includes("@")) throw new Error("Invalid email");
  if (!displayName.trim()) throw new Error("displayName is required");
  return {
    id,
    email,
    displayName,
    persona,
    enrolledAt: new Date(),
    preferences: {
      preferredDifficulty: "foundation",
      preferVisualContent: true,
      dailyGoalMinutes: 30,
    },
  };
}

export function updatePersona(learner: Learner, persona: PersonaType): Learner {
  return { ...learner, persona };
}

// Shared value types across bounded contexts

export type PersonaType = "student" | "teacher" | "practitioner";

export type DifficultyLevel = "foundation" | "associate" | "professional" | "specialty";

export type ModuleDomain =
  | "design"
  | "operations"
  | "security"
  | "automation"
  | "exam-prep";

export interface Result<T> {
  ok: true;
  value: T;
}

export interface Failure {
  ok: false;
  error: string;
}

export type Outcome<T> = Result<T> | Failure;

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = (error: string): Failure => ({ ok: false, error });

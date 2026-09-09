// Simulation State Types
export interface SimulationParameters {
  viscosity: number; // μ [0.001, 0.1]
  pressure_gradient: [number, number]; // ∇p
  density: number; // ρ
  reynolds_number: number; // Re
}

export interface SimulationState {
  parameters: SimulationParameters;
  velocity_field: Float32Array | null;
  pressure_field: Float32Array | null;
  divergence: number;
  grid_resolution: 128 | 256;
  timestep_count: number;
  solver_converged: boolean;
  is_simulating: boolean;
}

// Learner State Types
export interface LearnerSession {
  user_id: string;
  session_id: string;
  module_id: number;
  completed_modules: number[];
  started_at: Date;
  last_interaction_at: Date;
}

// Assessment Types
export interface AssessmentAnswer {
  test_id: string;
  submitted_answer: unknown;
  submitted_at: Date;
  score?: number;
  feedback?: string;
}

export interface ModuleConfig {
  module_id: number;
  title: string;
  description: string;
  duration_minutes: number;
  simulators: string[];
  assessments: AssessmentType[];
}

export type AssessmentType =
  | 'concept_mapping'
  | 'predictive_challenge'
  | 'parameter_tuning'
  | 'free_form_analysis';

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface LoginResponse {
  userId: string;
  sessionToken: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export interface SessionData {
  sessionId: string;
  userId: string;
  moduleId: number;
  completedModules: number[];
  createdAt: string;
}

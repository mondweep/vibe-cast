export interface LearnerSession {
  user_id: string;
  session_id: string;
  module_id: number;
  completed_modules: number[];
  started_at: Date;
  last_interaction_at: Date;
}

export interface SimulationParameters {
  viscosity: number;
  pressure_gradient: [number, number];
  density: number;
  reynolds_number: number;
}

export interface SimulationState {
  parameters: SimulationParameters;
  velocity_field: Float32Array | null;
  pressure_field: Float32Array | null;
  divergence: number;
  grid_resolution: number;
  timestep_count: number;
  solver_converged: boolean;
  is_simulating: boolean;
}

export interface AssessmentAnswer {
  question_id: string;
  user_answer: string;
  is_correct: boolean;
  timestamp: Date;
}

export interface UserProfile {
  uid: string;
  email: string;
  display_name: string;
  created_at: Date;
  last_login: Date;
  progress: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

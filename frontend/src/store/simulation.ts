import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  SimulationState,
  SimulationParameters,
} from '../types/index';

interface SimulationStore extends SimulationState {
  updateParameters: (params: Partial<SimulationParameters>) => void;
  setVelocityField: (field: Float32Array) => void;
  setPressureField: (field: Float32Array) => void;
  setDivergence: (div: number) => void;
  setSimulating: (simulating: boolean) => void;
  setGridResolution: (resolution: 128 | 256) => void;
  reset: () => void;
  serialize: () => string;
  deserialize: (data: string) => void;
}

const initialState: SimulationState = {
  parameters: {
    viscosity: 0.01,
    pressure_gradient: [0, 0],
    density: 1.0,
    reynolds_number: 100,
  },
  velocity_field: null,
  pressure_field: null,
  divergence: 0,
  grid_resolution: 256,
  timestep_count: 0,
  solver_converged: false,
  is_simulating: false,
};

export const useSimulationStore = create<SimulationStore>()(
  devtools((set, get) => ({
    ...initialState,

    updateParameters: (params) =>
      set((state) => ({
        parameters: { ...state.parameters, ...params },
        timestep_count: 0,
      })),

    setVelocityField: (field) =>
      set({ velocity_field: field }),

    setPressureField: (field) =>
      set({ pressure_field: field }),

    setDivergence: (div) =>
      set({ divergence: div }),

    setSimulating: (simulating) =>
      set({ is_simulating: simulating }),

    setGridResolution: (resolution) =>
      set({ grid_resolution: resolution, timestep_count: 0 }),

    reset: () =>
      set(initialState),

    serialize: (): string => {
      const state = get();
      return JSON.stringify({
        parameters: state.parameters,
        grid_resolution: state.grid_resolution,
      });
    },

    deserialize: (data: string): void => {
      try {
        const parsed = JSON.parse(data) as Partial<SimulationState>;
        set((state: SimulationState) => ({
          ...state,
          parameters: parsed.parameters || state.parameters,
          grid_resolution: parsed.grid_resolution || state.grid_resolution,
        }));
      } catch (error) {
        console.error('Failed to deserialize simulation state:', error);
      }
    },
  }))
);

import { useSimulationStore } from '../simulation';

beforeEach(() => {
  useSimulationStore.getState().reset();
});

describe('useSimulationStore setGridResolution', () => {
  it('updates grid_resolution', () => {
    useSimulationStore.getState().setGridResolution(128);
    expect(useSimulationStore.getState().grid_resolution).toBe(128);
  });

  it('resets the timestep count, like other parameter changes', () => {
    useSimulationStore.setState({ timestep_count: 42 });
    useSimulationStore.getState().setGridResolution(128);
    expect(useSimulationStore.getState().timestep_count).toBe(0);
  });
});

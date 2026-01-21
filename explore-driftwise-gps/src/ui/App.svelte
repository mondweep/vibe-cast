<script lang="ts">
  import { AppState, StateManager } from '@domains/config/StateManager';
  import { onMount, onDestroy } from 'svelte';

  let stateManager: StateManager;
  let currentState: AppState = AppState.IDLE;
  let lastFact: string = 'No fact delivered yet';
  let pollingInterval: number = 5 * 60 * 1000;
  let lastLocation: string = 'Unknown';
  let isRunning: boolean = false;
  let unsubscribeState: (() => void) | null = null;

  onMount(() => {
    stateManager = new StateManager();
    pollingInterval = stateManager.getPollingInterval();

    // Subscribe to state changes
    unsubscribeState = stateManager.onStateChange((state: AppState) => {
      currentState = state;
    });
  });

  onDestroy(() => {
    if (unsubscribeState) {
      unsubscribeState();
    }
    if (isRunning) {
      stateManager.stopPolling();
    }
  });

  function startCycle() {
    isRunning = true;
    stateManager.startPolling(() => {
      console.log('Poll tick - would execute FactDeliveryCycle here');
      // This is where FactDeliveryCycle.execute() would be called
    });
  }

  function stopCycle() {
    isRunning = false;
    stateManager.stopPolling();
  }

  function handleIntervalChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const newInterval = parseInt(target.value);
    stateManager.setPollingInterval(newInterval);
    pollingInterval = newInterval;
  }

  function getMinutesFromMs(ms: number): number {
    return Math.round(ms / (60 * 1000));
  }

  function getStateColor(): string {
    switch (currentState) {
      case AppState.IDLE:
        return '#6c757d';
      case AppState.LOCATING:
        return '#0d6efd';
      case AppState.GEOCODING:
        return '#0dcaf0';
      case AppState.RESEARCHING:
        return '#0d6efd';
      case AppState.SPEAKING:
        return '#198754';
      case AppState.LISTENING:
        return '#ffc107';
      case AppState.PAUSED:
        return '#fd7e14';
      case AppState.ERROR:
        return '#dc3545';
      default:
        return '#6c757d';
    }
  }
</script>

<main class="app-container">
  <header class="app-header">
    <h1>Driftwise</h1>
    <p class="subtitle">Voice-Driven Historical Discovery</p>
  </header>

  <div class="status-panel">
    <div class="state-display">
      <div class="state-label">Current State</div>
      <div class="state-value" style="background-color: {getStateColor()}">
        {currentState}
      </div>
    </div>

    <div class="stats">
      <div class="stat-item">
        <span class="stat-label">Last Fact:</span>
        <span class="stat-value">{lastFact}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Last Location:</span>
        <span class="stat-value">{lastLocation}</span>
      </div>
    </div>
  </div>

  <div class="controls-panel">
    <div class="button-group">
      {#if !isRunning}
        <button class="btn btn-primary" on:click={startCycle}>
          Start Polling
        </button>
      {:else}
        <button class="btn btn-danger" on:click={stopCycle}>
          Stop Polling
        </button>
      {/if}
    </div>
  </div>

  <div class="settings-panel">
    <h2>Settings</h2>

    <div class="setting-item">
      <label for="polling-interval">Polling Interval: {getMinutesFromMs(pollingInterval)} minutes</label>
      <input
        id="polling-interval"
        type="range"
        min={2 * 60 * 1000}
        max={15 * 60 * 1000}
        step={60 * 1000}
        value={pollingInterval}
        on:change={handleIntervalChange}
      />
    </div>
  </div>

  <footer class="app-footer">
    <p>
      Driftwise v0.1.0 • <a href="https://github.com/jjohare/driftwise">GitHub</a> •
      Phase 5-6 Implementation
    </p>
  </footer>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    color: #333;
  }

  .app-container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    padding: 20px;
    max-width: 800px;
    margin: 0 auto;
  }

  .app-header {
    text-align: center;
    color: white;
    margin-bottom: 30px;
    padding: 20px 0;
  }

  .app-header h1 {
    margin: 0;
    font-size: 2.5em;
    font-weight: bold;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  }

  .subtitle {
    margin: 10px 0 0 0;
    font-size: 1.1em;
    opacity: 0.9;
  }

  .status-panel {
    background: white;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .state-display {
    margin-bottom: 20px;
  }

  .state-label {
    font-size: 0.9em;
    color: #6c757d;
    margin-bottom: 8px;
    font-weight: 600;
  }

  .state-value {
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-weight: bold;
    font-size: 1.2em;
    text-align: center;
    transition: all 0.3s ease;
  }

  .stats {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid #e9ecef;
  }

  .stat-item:last-child {
    border-bottom: none;
  }

  .stat-label {
    font-weight: 600;
    color: #495057;
  }

  .stat-value {
    color: #212529;
    word-break: break-word;
    text-align: right;
    flex: 1;
    margin-left: 20px;
  }

  .controls-panel {
    background: white;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .button-group {
    display: flex;
    gap: 10px;
  }

  .btn {
    flex: 1;
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-size: 1em;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .btn-primary {
    background: #667eea;
    color: white;
  }

  .btn-primary:hover {
    background: #5568d3;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .btn-danger {
    background: #dc3545;
    color: white;
  }

  .btn-danger:hover {
    background: #c82333;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4);
  }

  .settings-panel {
    background: white;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .settings-panel h2 {
    margin: 0 0 20px 0;
    font-size: 1.2em;
    color: #212529;
  }

  .setting-item {
    margin-bottom: 20px;
  }

  .setting-item label {
    display: block;
    margin-bottom: 10px;
    font-weight: 600;
    color: #495057;
  }

  .setting-item input[type='range'] {
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: #e9ecef;
    outline: none;
    -webkit-appearance: none;
  }

  .setting-item input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #667eea;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .setting-item input[type='range']::-webkit-slider-thumb:hover {
    background: #5568d3;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
  }

  .setting-item input[type='range']::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #667eea;
    cursor: pointer;
    border: none;
    transition: all 0.3s ease;
  }

  .setting-item input[type='range']::-moz-range-thumb:hover {
    background: #5568d3;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
  }

  .app-footer {
    text-align: center;
    color: rgba(255, 255, 255, 0.8);
    margin-top: auto;
    padding-top: 30px;
    font-size: 0.9em;
  }

  .app-footer a {
    color: rgba(255, 255, 255, 1);
    text-decoration: none;
    font-weight: 600;
  }

  .app-footer a:hover {
    text-decoration: underline;
  }

  @media (max-width: 600px) {
    .app-container {
      padding: 10px;
    }

    .app-header h1 {
      font-size: 2em;
    }

    .stat-item {
      flex-direction: column;
    }

    .stat-value {
      text-align: left;
      margin-left: 0;
      margin-top: 5px;
    }
  }
</style>

import '@testing-library/jest-dom';

// Mock AudioContext for tests
class MockAudioContext {
  state = 'running';
  sampleRate = 44100;
  destination = {};

  createGain() {
    return {
      gain: { value: 1, setValueAtTime: () => {} },
      connect: () => {},
      disconnect: () => {},
    };
  }

  createOscillator() {
    return {
      frequency: { value: 440, setValueAtTime: () => {} },
      type: 'sine',
      connect: () => {},
      disconnect: () => {},
      start: () => {},
      stop: () => {},
    };
  }

  createBufferSource() {
    return {
      buffer: null,
      connect: () => {},
      disconnect: () => {},
      start: () => {},
      stop: () => {},
    };
  }

  close() {
    return Promise.resolve();
  }
}

// @ts-expect-error - Mock for testing
globalThis.AudioContext = MockAudioContext;
// @ts-expect-error - Mock for testing
globalThis.webkitAudioContext = MockAudioContext;

// Mock SharedArrayBuffer if not available
if (typeof SharedArrayBuffer === 'undefined') {
  // @ts-expect-error - Polyfill for testing
  globalThis.SharedArrayBuffer = ArrayBuffer;
}

// Mock Web Worker
class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;

  postMessage(_data: unknown) {
    // Mock implementation
  }

  terminate() {
    // Mock implementation
  }
}

// @ts-expect-error - Mock for testing
globalThis.Worker = MockWorker;

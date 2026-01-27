export * from './shared-memory';

// Worker URLs will be resolved at build time by Vite
export const OMR_WORKER_URL = new URL('./omr.worker.ts', import.meta.url);

// AudioWorklet module path
export const AUDIO_WORKLET_URL = new URL('./audio.worklet.ts', import.meta.url);

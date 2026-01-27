/**
 * SharedArrayBuffer Memory Management
 * Enables zero-copy data sharing between workers
 * See ADR-007 for memory layout details
 */

// Memory layout constants (from ADR-007)
export const MEMORY_SIZE = 16 * 1024 * 1024; // 16 MB total
export const CONTROL_BLOCK_SIZE = 4 * 1024; // 4 KB
export const SCORE_IR_SIZE = 2 * 1024 * 1024; // 2 MB
export const AUDIO_BUFFER_SIZE = 8 * 1024 * 1024; // 8 MB
export const OMR_WORKING_SIZE = 6 * 1024 * 1024; // 6 MB

// Memory offsets
export const CONTROL_OFFSET = 0x0000;
export const SCORE_IR_OFFSET = 0x1000;
export const AUDIO_BUFFER_OFFSET = 0x200000;
export const OMR_WORKING_OFFSET = 0xa00000;

// Control block field indices
export const CONTROL_VERSION = 0;
export const CONTROL_WRITE_LOCK = 1;
export const CONTROL_PLAYBACK_POSITION = 2;
export const CONTROL_CURRENT_MEASURE = 3;

/**
 * Check if SharedArrayBuffer is available
 */
export function isSharedMemorySupported(): boolean {
  return typeof SharedArrayBuffer !== 'undefined';
}

/**
 * Create the shared memory buffer
 */
export function createSharedMemory(): SharedArrayBuffer | null {
  if (!isSharedMemorySupported()) {
    console.warn('SharedArrayBuffer not supported, falling back to message passing');
    return null;
  }

  try {
    return new SharedArrayBuffer(MEMORY_SIZE);
  } catch (error) {
    console.error('Failed to create SharedArrayBuffer:', error);
    return null;
  }
}

/**
 * Acquire write lock using Atomics
 * Blocks until lock is available
 */
export function acquireWriteLock(control: Int32Array): void {
  while (Atomics.compareExchange(control, CONTROL_WRITE_LOCK, 0, 1) !== 0) {
    Atomics.wait(control, CONTROL_WRITE_LOCK, 1);
  }
}

/**
 * Release write lock
 */
export function releaseWriteLock(control: Int32Array): void {
  Atomics.store(control, CONTROL_WRITE_LOCK, 0);
  Atomics.notify(control, CONTROL_WRITE_LOCK);
}

/**
 * Write Score IR data to shared memory
 */
export function writeScoreIR(sab: SharedArrayBuffer, irJson: string): void {
  const control = new Int32Array(sab, CONTROL_OFFSET, 16);
  const dataView = new DataView(sab);
  const data = new Uint8Array(sab, SCORE_IR_OFFSET + 4, SCORE_IR_SIZE - 4);

  // Acquire lock
  acquireWriteLock(control);

  try {
    // Encode JSON
    const encoded = new TextEncoder().encode(irJson);

    if (encoded.length > SCORE_IR_SIZE - 4) {
      throw new Error(`Score IR too large: ${encoded.length} bytes`);
    }

    // Write length prefix
    dataView.setUint32(SCORE_IR_OFFSET, encoded.length, true);

    // Write data
    data.set(encoded);

    // Increment version
    Atomics.add(control, CONTROL_VERSION, 1);
  } finally {
    // Release lock
    releaseWriteLock(control);
  }
}

/**
 * Read Score IR data from shared memory
 */
export function readScoreIR(sab: SharedArrayBuffer): string | null {
  const dataView = new DataView(sab);

  // Read length
  const length = dataView.getUint32(SCORE_IR_OFFSET, true);

  if (length === 0 || length > SCORE_IR_SIZE - 4) {
    return null;
  }

  // Read data
  const data = new Uint8Array(sab, SCORE_IR_OFFSET + 4, length);
  return new TextDecoder().decode(data);
}

/**
 * Get current playback position (in samples)
 */
export function getPlaybackPosition(sab: SharedArrayBuffer): number {
  const control = new Int32Array(sab, CONTROL_OFFSET, 16);
  return Atomics.load(control, CONTROL_PLAYBACK_POSITION);
}

/**
 * Set playback position (from audio thread)
 */
export function setPlaybackPosition(sab: SharedArrayBuffer, position: number): void {
  const control = new Int32Array(sab, CONTROL_OFFSET, 16);
  Atomics.store(control, CONTROL_PLAYBACK_POSITION, position);
}

/**
 * Get current measure index
 */
export function getCurrentMeasure(sab: SharedArrayBuffer): number {
  const control = new Int32Array(sab, CONTROL_OFFSET, 16);
  return Atomics.load(control, CONTROL_CURRENT_MEASURE);
}

/**
 * Set current measure (for cursor sync)
 */
export function setCurrentMeasure(sab: SharedArrayBuffer, measure: number): void {
  const control = new Int32Array(sab, CONTROL_OFFSET, 16);
  Atomics.store(control, CONTROL_CURRENT_MEASURE, measure);
}

/**
 * Get the data version (for change detection)
 */
export function getDataVersion(sab: SharedArrayBuffer): number {
  const control = new Int32Array(sab, CONTROL_OFFSET, 16);
  return Atomics.load(control, CONTROL_VERSION);
}

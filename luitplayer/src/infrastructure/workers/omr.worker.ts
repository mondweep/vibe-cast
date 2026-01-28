/**
 * OMR (Optical Music Recognition) Web Worker
 * Processes PDF pages using OpenCV WASM to extract musical notation
 * See ADR-001 for architecture details
 */

import type { ScoreIR, StaffIR, MeasureIR, NoteEvent } from '@domains/shared-kernel/types';

// Worker message types
export interface OMRWorkerMessage {
  type: 'init' | 'process-page' | 'get-cache' | 'clear-cache';
  payload?: unknown;
}

export interface OMRInitMessage {
  type: 'init';
  payload: {
    wasmUrl?: string;
  };
}

export interface OMRProcessPageMessage {
  type: 'process-page';
  payload: {
    pageNumber: number;
    imageData: ImageData;
    options?: OMROptions;
  };
}

export interface OMROptions {
  detectStaves?: boolean;
  detectNotes?: boolean;
  detectDynamics?: boolean;
  detectTempo?: boolean;
}

export interface OMRResultMessage {
  type: 'result' | 'init-complete' | 'cache-result';
  payload: {
    success: boolean;
    pageNumber?: number;
    staves?: StaffIR[];
    scoreIR?: Partial<ScoreIR>;
    processingTime?: number;
    error?: string;
  };
}

interface DetectedStaff {
  y: number;
  height: number;
  linePositions: number[];
}

interface DetectedBarLine {
  x: number;
  staffIndex: number;
}

interface DetectedNote {
  x: number;
  y: number;
  staffIndex: number;
  pitch: number;
  duration: number;
}

// Worker state
let isInitialized = false;
const pageCache = new Map<number, StaffIR[]>();
const CACHE_MAX_SIZE = 20;

// Staff detection parameters
const STAFF_LINE_SPACING = 8; // pixels between staff lines
const STAFF_HEIGHT = STAFF_LINE_SPACING * 4; // 5 lines = 4 spaces
const MIN_STAFF_WIDTH_RATIO = 0.6; // minimum staff width as ratio of page width

/**
 * Initialize OMR Worker (OpenCV.js would be loaded here in production)
 */
async function initializeOMR(wasmUrl?: string): Promise<void> {
  try {
    console.log('[OMR Worker] Initializing OMR engine...', wasmUrl ? `from ${wasmUrl}` : '');

    // In production, load OpenCV.js here:
    // importScripts(wasmUrl || 'https://docs.opencv.org/4.x/opencv.js');
    // await cv.onRuntimeInitialized;

    // For now, use JavaScript-based image processing
    await new Promise((resolve) => setTimeout(resolve, 50));

    isInitialized = true;
    console.log('[OMR Worker] OMR engine initialized');

    self.postMessage({
      type: 'init-complete',
      payload: { success: true },
    } as OMRResultMessage);
  } catch (error) {
    self.postMessage({
      type: 'init-complete',
      payload: {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize OMR',
      },
    } as OMRResultMessage);
  }
}

/**
 * Convert ImageData to grayscale array
 */
function toGrayscale(imageData: ImageData): Uint8Array {
  const gray = new Uint8Array(imageData.width * imageData.height);
  const data = imageData.data;

  for (let i = 0; i < gray.length; i++) {
    const idx = i * 4;
    // Luminosity method
    gray[i] = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
  }

  return gray;
}

/**
 * Apply horizontal projection to detect staff line regions
 */
function horizontalProjection(gray: Uint8Array, width: number, height: number): number[] {
  const projection = new Array(height).fill(0);
  const threshold = 128; // Binary threshold

  for (let y = 0; y < height; y++) {
    let blackPixels = 0;
    for (let x = 0; x < width; x++) {
      if (gray[y * width + x] < threshold) {
        blackPixels++;
      }
    }
    projection[y] = blackPixels;
  }

  return projection;
}

/**
 * Detect staff systems using horizontal projection analysis
 */
function detectStaffSystems(imageData: ImageData): DetectedStaff[] {
  const { width, height } = imageData;
  const gray = toGrayscale(imageData);
  const projection = horizontalProjection(gray, width, height);

  // Find peaks in projection (staff line candidates)
  const minPeakWidth = width * MIN_STAFF_WIDTH_RATIO;
  const peaks: number[] = [];

  for (let y = 1; y < height - 1; y++) {
    if (projection[y] > minPeakWidth &&
      projection[y] >= projection[y - 1] &&
      projection[y] >= projection[y + 1]) {
      peaks.push(y);
    }
  }

  // Group peaks into staff systems (5 lines each)
  const staffs: DetectedStaff[] = [];
  let currentLines: number[] = [];

  for (let i = 0; i < peaks.length; i++) {
    if (currentLines.length === 0) {
      currentLines.push(peaks[i]);
    } else {
      const lastLine = currentLines[currentLines.length - 1];
      const gap = peaks[i] - lastLine;

      // Check if this line belongs to current staff
      if (gap >= STAFF_LINE_SPACING * 0.7 && gap <= STAFF_LINE_SPACING * 1.5) {
        currentLines.push(peaks[i]);

        if (currentLines.length === 5) {
          // Complete staff found
          staffs.push({
            y: currentLines[0],
            height: currentLines[4] - currentLines[0],
            linePositions: [...currentLines],
          });
          currentLines = [];
        }
      } else if (gap > STAFF_LINE_SPACING * 3) {
        // Too large gap, start new staff
        currentLines = [peaks[i]];
      }
    }
  }

  // If no staves detected, create estimated positions
  if (staffs.length === 0) {
    const estimatedStaffCount = Math.max(1, Math.floor(height / 150));
    const staffSpacing = height / (estimatedStaffCount + 1);

    for (let i = 0; i < estimatedStaffCount; i++) {
      const y = Math.round(staffSpacing * (i + 0.5));
      staffs.push({
        y,
        height: STAFF_HEIGHT,
        linePositions: [y, y + 8, y + 16, y + 24, y + 32],
      });
    }
  }

  console.log(`[OMR Worker] Detected ${staffs.length} staff systems`);
  return staffs;
}

/**
 * Detect vertical bar lines for measure segmentation
 */
function detectBarLines(imageData: ImageData, staffs: DetectedStaff[]): DetectedBarLine[] {
  const { width, height } = imageData;
  const gray = toGrayscale(imageData);
  const barLines: DetectedBarLine[] = [];

  // Vertical projection for each staff region
  for (let staffIdx = 0; staffIdx < staffs.length; staffIdx++) {
    const staff = staffs[staffIdx];
    const staffTop = Math.max(0, staff.y - 10);
    const staffBottom = Math.min(height, staff.y + staff.height + 10);

    const projection = new Array(width).fill(0);
    const threshold = 100;

    for (let x = 0; x < width; x++) {
      let blackPixels = 0;
      for (let y = staffTop; y < staffBottom; y++) {
        if (gray[y * width + x] < threshold) {
          blackPixels++;
        }
      }
      projection[x] = blackPixels;
    }

    // Find peaks (bar line candidates)
    const minBarHeight = (staffBottom - staffTop) * 0.8;
    for (let x = 5; x < width - 5; x++) {
      if (projection[x] > minBarHeight &&
        projection[x] > projection[x - 1] &&
        projection[x] > projection[x + 1]) {
        barLines.push({ x, staffIndex: staffIdx });
      }
    }
  }

  // If no bar lines detected, estimate 4 measures per page
  if (barLines.length === 0) {
    const measureWidth = width / 4;
    for (let i = 0; i <= 4; i++) {
      for (let staffIdx = 0; staffIdx < staffs.length; staffIdx++) {
        barLines.push({ x: Math.round(i * measureWidth), staffIndex: staffIdx });
      }
    }
  }

  return barLines;
}

/**
 * Map Y position to MIDI pitch based on staff position
 */
function yToMidiPitch(y: number, staff: DetectedStaff, clef: 'treble' | 'bass' = 'treble'): number {
  const middleLineY = staff.linePositions[2]; // Middle line of staff
  const lineSpacing = staff.height / 4;

  // Distance from middle line in half-steps
  const distance = (middleLineY - y) / (lineSpacing / 2);

  // Middle line pitch: B4 (71) for treble, D3 (50) for bass
  const middlePitch = clef === 'treble' ? 71 : 50;

  // Map distance to pitch (diatonic scale approximation)
  const pitch = middlePitch + Math.round(distance);

  return Math.max(21, Math.min(108, pitch)); // Piano range
}

/**
 * Detect note heads in staff region (simplified blob detection)
 */
function detectNotes(imageData: ImageData, staffs: DetectedStaff[], _barLines: DetectedBarLine[]): DetectedNote[] {
  const { width, height } = imageData;
  const gray = toGrayscale(imageData);
  const notes: DetectedNote[] = [];

  const threshold = 80;
  const minBlobSize = 20;
  const maxBlobSize = 200;

  // Process each staff
  for (let staffIdx = 0; staffIdx < staffs.length; staffIdx++) {
    const staff = staffs[staffIdx];
    const staffTop = Math.max(0, staff.y - 20);
    const staffBottom = Math.min(height, staff.y + staff.height + 20);

    // Get bar lines for this staff
//    const _staffBarLines = barLines
//      .filter(bl => bl.staffIndex === staffIdx)
//      .map(bl => bl.x)
//      .sort((a, b) => a - b);

    // Simple blob detection using connected component analysis
    const visited = new Set<number>();

    for (let y = staffTop; y < staffBottom; y++) {
      for (let x = 10; x < width - 10; x++) {
        const idx = y * width + x;

        if (visited.has(idx) || gray[idx] >= threshold) continue;

        // Flood fill to find blob
        const blob: { x: number; y: number }[] = [];
        const queue = [{ x, y }];

        while (queue.length > 0 && blob.length < maxBlobSize * 2) {
          const p = queue.shift()!;
          const pidx = p.y * width + p.x;

          if (visited.has(pidx)) continue;
          if (p.x < 0 || p.x >= width || p.y < staffTop || p.y >= staffBottom) continue;
          if (gray[pidx] >= threshold) continue;

          visited.add(pidx);
          blob.push(p);

          queue.push({ x: p.x + 1, y: p.y });
          queue.push({ x: p.x - 1, y: p.y });
          queue.push({ x: p.x, y: p.y + 1 });
          queue.push({ x: p.x, y: p.y - 1 });
        }

        // Check if blob is note-head sized
        if (blob.length >= minBlobSize && blob.length <= maxBlobSize) {
          const avgX = blob.reduce((s, p) => s + p.x, 0) / blob.length;
          const avgY = blob.reduce((s, p) => s + p.y, 0) / blob.length;

          // Determine duration based on blob characteristics (filled vs hollow)
          const centerBrightness = gray[Math.round(avgY) * width + Math.round(avgX)];
          const duration = centerBrightness < 60 ? 1 : 2; // Quarter vs half note

          notes.push({
            x: avgX,
            y: avgY,
            staffIndex: staffIdx,
            pitch: yToMidiPitch(avgY, staff),
            duration,
          });
        }
      }
    }
  }

  console.log(`[OMR Worker] Detected ${notes.length} notes`);
  return notes;
}

/**
 * Convert detected elements to Score IR format
 */
function buildScoreIR(
  pageNumber: number,
  imageData: ImageData,
  staffs: DetectedStaff[],
  barLines: DetectedBarLine[],
  notes: DetectedNote[]
): StaffIR[] {
  const { width: _width } = imageData;
  const staves: StaffIR[] = [];

  // Instrument mapping based on staff index
  const instruments = [
    'soprano', 'lead-vocal', 'space-synth', 'piano',
    'acoustic-guitar-strum', 'acoustic-guitar-lead', 'bass-guitar', 'drums'
  ] as const;

  for (let staffIdx = 0; staffIdx < staffs.length; staffIdx++) {
    const instrument = instruments[staffIdx % instruments.length];

    // Get bar lines for this staff
    const staffBarLines = barLines
      .filter(bl => bl.staffIndex === staffIdx)
      .map(bl => bl.x)
      .sort((a, b) => a - b);

    // Get notes for this staff
    const staffNotes = notes.filter(n => n.staffIndex === staffIdx);

    // Build measures
    const measures: MeasureIR[] = [];

    for (let i = 0; i < staffBarLines.length - 1; i++) {
      const measureStart = staffBarLines[i];
      const measureEnd = staffBarLines[i + 1];
      const measureWidth = measureEnd - measureStart;

      // Get notes in this measure
      const measureNotes = staffNotes.filter(
        n => n.x >= measureStart && n.x < measureEnd
      );

      // Convert to events
      const events: NoteEvent[] = measureNotes.map(note => {
        const relativeX = (note.x - measureStart) / measureWidth;
        const beatPosition = relativeX * 4; // 4 beats per measure

        return {
          type: 'note-on' as const,
          pitch: note.pitch,
          time: beatPosition,
          duration: note.duration,
          velocity: 80,
        };
      });

      const measureNumber = (pageNumber - 1) * 4 + i + 1;

      measures.push({
        number: measureNumber,
        startTime: (measureNumber - 1) * 4,
        events,
        dynamics: 'mf',
      });
    }

    // Ensure at least 4 measures per page
    while (measures.length < 4) {
      const measureNumber = (pageNumber - 1) * 4 + measures.length + 1;
      measures.push({
        number: measureNumber,
        startTime: (measureNumber - 1) * 4,
        events: [],
        dynamics: 'mf',
      });
    }

    staves.push({
      id: `page-${pageNumber}-staff-${staffIdx + 1}`,
      instrument,
      measures,
    });
  }

  return staves;
}

/**
 * Process a single PDF page with full OMR pipeline
 */
function processPage(pageNumber: number, imageData: ImageData, options: OMROptions = {}): StaffIR[] {
  if (!isInitialized) {
    throw new Error('OMR Worker not initialized');
  }

  const startTime = performance.now();

  // Check cache first
  if (pageCache.has(pageNumber)) {
    console.log(`[OMR Worker] Page ${pageNumber} found in cache`);
    return pageCache.get(pageNumber)!;
  }

  console.log(`[OMR Worker] Processing page ${pageNumber} (${imageData.width}x${imageData.height})`);

  // Stage 1: Detect staff systems
  const staffs = options.detectStaves !== false ? detectStaffSystems(imageData) : [];

  // Stage 2: Detect bar lines
  const barLines = detectBarLines(imageData, staffs);

  // Stage 3: Detect notes
  const notes = options.detectNotes !== false ? detectNotes(imageData, staffs, barLines) : [];

  // Stage 4: Build Score IR
  const staves = buildScoreIR(pageNumber, imageData, staffs, barLines, notes);

  const processingTime = performance.now() - startTime;
  console.log(`[OMR Worker] Page ${pageNumber} processed in ${processingTime.toFixed(2)}ms`);

  // Cache result
  if (pageCache.size >= CACHE_MAX_SIZE) {
    const oldestKey = pageCache.keys().next().value;
    if (oldestKey !== undefined) {
      pageCache.delete(oldestKey);
    }
  }
  pageCache.set(pageNumber, staves);

  return staves;
}

// Message handler
self.onmessage = async (event: MessageEvent<OMRWorkerMessage>) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'init': {
      const initPayload = payload as OMRInitMessage['payload'] | undefined;
      await initializeOMR(initPayload?.wasmUrl);
      break;
    }

    case 'process-page': {
      try {
        const processPayload = payload as OMRProcessPageMessage['payload'];
        const startTime = performance.now();

        const staves = processPage(
          processPayload.pageNumber,
          processPayload.imageData,
          processPayload.options
        );

        self.postMessage({
          type: 'result',
          payload: {
            success: true,
            pageNumber: processPayload.pageNumber,
            staves,
            processingTime: performance.now() - startTime,
          },
        } as OMRResultMessage);
      } catch (error) {
        self.postMessage({
          type: 'result',
          payload: {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        } as OMRResultMessage);
      }
      break;
    }

    case 'get-cache': {
      self.postMessage({
        type: 'cache-result',
        payload: {
          success: true,
          cacheSize: pageCache.size,
          cachedPages: Array.from(pageCache.keys()),
        },
      });
      break;
    }

    case 'clear-cache': {
      pageCache.clear();
      console.log('[OMR Worker] Cache cleared');
      self.postMessage({
        type: 'cache-result',
        payload: { success: true, cacheSize: 0 },
      });
      break;
    }

    default:
      console.warn('[OMR Worker] Unknown message type:', type);
  }
};

// Export for type checking
export type { ScoreIR };

'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { fetchOsmData } = require('./pipeline/osm');
const { fetchElevation } = require('./pipeline/elevation');
const { enrichBuildings } = require('./pipeline/enrich');
const { runArnis } = require('./pipeline/arnis');
const { packageWorld, cleanupTempFiles } = require('./pipeline/package');
const { bboxAreaKm2, estimateBlocks } = require('./utils/coords');

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const MAX_AREA_KM2 = parseFloat(process.env.MAX_AREA_KM2 || '25');
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(__dirname, '..', 'output');
const CLEANUP_HOURS = parseFloat(process.env.CLEANUP_HOURS || '1');
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT || '2', 10);

// Ensure output directory exists
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

app.use(express.json({ limit: '1mb' }));

// Serve frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));

// Job tracking
const jobs = new Map();
let activeJobs = 0;
const jobQueue = [];

/**
 * POST /api/generate
 * Start a world generation pipeline.
 */
app.post('/api/generate', (req, res) => {
  const { bbox, scale = 1.0, groundLevel = -10, spawnLat, spawnLng, llmKey, llmProvider } = req.body;

  // Validate bbox
  if (!bbox || !Array.isArray(bbox) || bbox.length !== 4) {
    return res.status(400).json({ error: 'bbox must be an array of [minLat, minLng, maxLat, maxLng]' });
  }

  const [minLat, minLng, maxLat, maxLng] = bbox;

  if (typeof minLat !== 'number' || typeof minLng !== 'number' || typeof maxLat !== 'number' || typeof maxLng !== 'number') {
    return res.status(400).json({ error: 'bbox values must be numbers' });
  }

  if (minLat >= maxLat || minLng >= maxLng) {
    return res.status(400).json({ error: 'Invalid bbox: min values must be less than max values' });
  }

  // Validate area
  const areaKm2 = bboxAreaKm2(minLat, minLng, maxLat, maxLng);
  if (areaKm2 > MAX_AREA_KM2) {
    return res.status(400).json({
      error: `Area too large: ${areaKm2.toFixed(2)} km² exceeds limit of ${MAX_AREA_KM2} km²`,
    });
  }

  // Validate scale
  const validScale = Math.max(0.1, Math.min(10, parseFloat(scale) || 1.0));
  const blockEstimate = estimateBlocks(minLat, minLng, maxLat, maxLng, validScale);
  if (blockEstimate > 25000000) {
    return res.status(400).json({
      error: `Estimated ${(blockEstimate / 1e6).toFixed(1)}M blocks exceeds 25M limit. Reduce area or scale.`,
    });
  }

  // Validate ground level
  const validGroundLevel = Math.max(-64, Math.min(200, parseInt(groundLevel) || -10));

  // Create job
  const jobId = uuidv4();
  const jobDir = path.join(OUTPUT_DIR, jobId);
  fs.mkdirSync(jobDir, { recursive: true });

  const job = {
    id: jobId,
    status: 'queued',
    progress: 0,
    message: 'Queued for processing',
    bbox: [minLat, minLng, maxLat, maxLng],
    scale: validScale,
    groundLevel: validGroundLevel,
    spawnLat: spawnLat || null,
    spawnLng: spawnLng || null,
    llmKey: llmKey || null,
    llmProvider: llmProvider || null,
    areaKm2,
    blockEstimate,
    createdAt: Date.now(),
    zipFile: null,
    error: null,
  };

  jobs.set(jobId, job);

  // Queue or start immediately
  if (activeJobs < MAX_CONCURRENT) {
    startJob(job, jobDir);
  } else {
    jobQueue.push({ job, jobDir });
    job.message = `Queued (position ${jobQueue.length})`;
  }

  res.json({
    jobId,
    areaKm2: parseFloat(areaKm2.toFixed(2)),
    blockEstimate,
    message: job.message,
  });
});

/**
 * GET /api/status/:jobId
 * Get pipeline progress.
 */
app.get('/api/status/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  res.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    message: job.message,
    areaKm2: parseFloat(job.areaKm2.toFixed(2)),
    blockEstimate: job.blockEstimate,
    error: job.error,
    hasDownload: !!job.zipFile,
  });
});

/**
 * GET /api/download/:jobId
 * Download the generated world zip.
 */
app.get('/api/download/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (!job.zipFile) return res.status(400).json({ error: 'World not ready for download' });

  if (!fs.existsSync(job.zipFile)) {
    return res.status(410).json({ error: 'Download expired. Please generate again.' });
  }

  const filename = `terracraft-world-${job.id.slice(0, 8)}.zip`;
  res.download(job.zipFile, filename);
});

/**
 * DELETE /api/jobs/:jobId
 * Clean up a job.
 */
app.delete('/api/jobs/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const jobDir = path.join(OUTPUT_DIR, job.id);
  try {
    fs.rmSync(jobDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
  jobs.delete(job.id);
  res.json({ deleted: true });
});

/**
 * GET /api/health
 * Health check.
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', activeJobs, queuedJobs: jobQueue.length });
});

// Catch-all: serve index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

/**
 * Run the full generation pipeline for a job.
 */
async function startJob(job, jobDir) {
  activeJobs++;
  job.status = 'running';

  const updateProgress = (progress, message) => {
    job.progress = progress;
    job.message = message;
  };

  try {
    // Step 1: Fetch OSM data (0-30%)
    updateProgress(5, 'Fetching OpenStreetMap data...');
    const osmResult = await fetchOsmData(
      job.bbox[0], job.bbox[1], job.bbox[2], job.bbox[3],
      jobDir,
      (msg) => updateProgress(Math.min(job.progress + 1, 28), msg)
    );
    updateProgress(30, `OSM data ready: ${osmResult.elementCount} elements`);

    // Step 2: Elevation (30-35%)
    updateProgress(32, 'Preparing elevation data...');
    const elevationFile = await fetchElevation(
      job.bbox, jobDir,
      { geeProject: process.env.GEE_PROJECT, geeCredentials: process.env.GEE_CREDENTIALS_PATH },
      (msg) => updateProgress(34, msg)
    );
    updateProgress(35, 'Elevation ready');

    // Step 3: LLM enrichment (35-45%)
    if (job.llmKey) {
      updateProgress(36, 'Enriching buildings with LLM...');
      await enrichBuildings(
        osmResult.file, job.bbox,
        { llmKey: job.llmKey, llmProvider: job.llmProvider },
        (msg) => updateProgress(Math.min(job.progress + 1, 44), msg)
      );
    }
    updateProgress(45, 'Starting world generation...');

    // Step 4: Run arnis (45-85%)
    const arnisBuildDir = path.join(jobDir, 'build');
    fs.mkdirSync(arnisBuildDir, { recursive: true });

    const arsnisResult = await runArnis({
      osmFile: osmResult.file,
      bbox: job.bbox,
      scale: job.scale,
      groundLevel: job.groundLevel,
      outputDir: arnisBuildDir,
      elevationFile,
      spawnLat: job.spawnLat,
      spawnLng: job.spawnLng,
      onProgress: (msg) => {
        // Parse arnis step numbers like [3/7]
        const stepMatch = msg.match(/\[(\d+)\/(\d+)\]/);
        if (stepMatch) {
          const step = parseInt(stepMatch[1]);
          const total = parseInt(stepMatch[2]);
          const arnisProg = 45 + (step / total) * 40;
          updateProgress(Math.min(Math.round(arnisProg), 84), msg);
        } else {
          updateProgress(Math.min(job.progress + 0.5, 84), msg);
        }
      },
    });
    updateProgress(85, 'World generated, packaging...');

    // Step 5: Package (85-100%)
    const zipFile = path.join(jobDir, 'world.zip');
    await packageWorld(arsnisResult.worldDir, zipFile, (msg) => updateProgress(92, msg));

    // Clean up temp files
    cleanupTempFiles(jobDir);

    job.zipFile = zipFile;
    job.status = 'complete';
    updateProgress(100, 'World ready for download');
  } catch (err) {
    job.status = 'failed';
    job.error = err.message;
    job.message = `Generation failed: ${err.message}`;
    console.error(`Job ${job.id} failed:`, err);
  } finally {
    activeJobs--;
    processQueue();
  }
}

/**
 * Process next job in the queue.
 */
function processQueue() {
  while (activeJobs < MAX_CONCURRENT && jobQueue.length > 0) {
    const { job, jobDir } = jobQueue.shift();
    startJob(job, jobDir);
  }
}

/**
 * Periodic cleanup of expired jobs.
 */
function cleanupExpiredJobs() {
  const maxAge = CLEANUP_HOURS * 60 * 60 * 1000;
  const now = Date.now();

  for (const [id, job] of jobs.entries()) {
    if (job.status === 'complete' || job.status === 'failed') {
      if (now - job.createdAt > maxAge) {
        const jobDir = path.join(OUTPUT_DIR, id);
        try {
          fs.rmSync(jobDir, { recursive: true, force: true });
        } catch {
          // ignore
        }
        jobs.delete(id);
      }
    }
  }
}

// Run cleanup every 10 minutes
setInterval(cleanupExpiredJobs, 10 * 60 * 1000);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TerraCraft server running on http://0.0.0.0:${PORT}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log(`Max area: ${MAX_AREA_KM2} km², Max concurrent: ${MAX_CONCURRENT}`);
});

module.exports = app;

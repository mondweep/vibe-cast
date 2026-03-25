'use strict';

/* global L */

// ---- State ----
let map;
let drawnItems;
let drawControl;
let currentRect = null;
let currentJobId = null;
let pollInterval = null;

// Default: Times Square, NYC
const DEFAULT_CENTER = [40.758, -73.9855];
const DEFAULT_ZOOM = 16;

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initControls();
});

function initMap() {
  map = L.map('map', {
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    zoomControl: true,
    attributionControl: true,
  });

  // Dark-ish tiles
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20,
  }).addTo(map);

  // Drawing layer
  drawnItems = new L.FeatureGroup();
  map.addLayer(drawnItems);

  drawControl = new L.Control.Draw({
    position: 'topleft',
    draw: {
      rectangle: {
        shapeOptions: {
          color: '#4f8ff7',
          weight: 2,
          fillOpacity: 0.1,
        },
      },
      polygon: false,
      circle: false,
      circlemarker: false,
      marker: false,
      polyline: false,
    },
    edit: {
      featureGroup: drawnItems,
      remove: true,
    },
  });
  map.addControl(drawControl);

  map.on(L.Draw.Event.CREATED, (e) => {
    drawnItems.clearLayers();
    currentRect = e.layer;
    drawnItems.addLayer(currentRect);
    updateAreaInfo();
  });

  map.on(L.Draw.Event.EDITED, () => {
    const layers = drawnItems.getLayers();
    if (layers.length > 0) {
      currentRect = layers[0];
      updateAreaInfo();
    }
  });

  map.on(L.Draw.Event.DELETED, () => {
    currentRect = null;
    clearAreaInfo();
  });

  // Draw a default small rectangle around Times Square
  const defaultBounds = [
    [40.7565, -73.988],
    [40.7595, -73.983],
  ];
  currentRect = L.rectangle(defaultBounds, {
    color: '#4f8ff7',
    weight: 2,
    fillOpacity: 0.1,
  });
  drawnItems.addLayer(currentRect);
  updateAreaInfo();
}

function initControls() {
  // Generate button
  document.getElementById('generate-btn').addEventListener('click', startGeneration);

  // Collapsible sections
  document.querySelectorAll('.collapsible-header').forEach((header) => {
    header.addEventListener('click', () => {
      header.classList.toggle('open');
      const body = header.nextElementSibling;
      body.classList.toggle('open');
    });
  });

  // Scale change updates estimates
  document.getElementById('scale-select').addEventListener('change', updateAreaInfo);

  // Sidebar toggle (mobile)
  const toggle = document.getElementById('sidebar-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });
  }
}

// ---- Area Info ----
function updateAreaInfo() {
  if (!currentRect) return;

  const bounds = currentRect.getBounds();
  const minLat = bounds.getSouth();
  const minLng = bounds.getWest();
  const maxLat = bounds.getNorth();
  const maxLng = bounds.getEast();

  const areaKm2 = calcAreaKm2(minLat, minLng, maxLat, maxLng);
  const scale = parseFloat(document.getElementById('scale-select').value) || 1.0;
  const blocks = estimateBlocks(minLat, minLng, maxLat, maxLng, scale);

  document.getElementById('area-value').textContent = areaKm2.toFixed(3) + ' km\u00B2';
  document.getElementById('blocks-value').textContent = formatNumber(blocks) + ' blocks';

  // Time estimate: ~1000 blocks/sec for arnis
  const seconds = Math.max(10, Math.round(blocks / 1000));
  const minutes = Math.ceil(seconds / 60);
  document.getElementById('time-value').textContent = minutes < 2 ? '~' + seconds + 's' : '~' + minutes + ' min';

  // Warnings
  const warningEl = document.getElementById('area-warning');
  if (areaKm2 > 4 && scale >= 1.0) {
    warningEl.textContent = 'Large area at 1:1 scale. Generation may take significant time and produce a very large world.';
    warningEl.classList.add('visible');
  } else if (blocks > 2000000) {
    warningEl.textContent = 'High block count (' + formatNumber(blocks) + '). Consider reducing scale.';
    warningEl.classList.add('visible');
  } else {
    warningEl.classList.remove('visible');
  }

  // Enable generate button
  document.getElementById('generate-btn').disabled = false;
  document.getElementById('instruction-text').style.display = 'none';
}

function clearAreaInfo() {
  document.getElementById('area-value').textContent = '--';
  document.getElementById('blocks-value').textContent = '--';
  document.getElementById('time-value').textContent = '--';
  document.getElementById('area-warning').classList.remove('visible');
  document.getElementById('generate-btn').disabled = true;
  document.getElementById('instruction-text').style.display = 'block';
}

// ---- Generation ----
async function startGeneration() {
  if (!currentRect) return;

  const bounds = currentRect.getBounds();
  const bbox = [bounds.getSouth(), bounds.getWest(), bounds.getNorth(), bounds.getEast()];
  const scale = parseFloat(document.getElementById('scale-select').value) || 1.0;
  const groundLevel = parseInt(document.getElementById('ground-level').value) || -10;
  const llmKey = document.getElementById('llm-key').value.trim() || null;
  const llmProvider = document.getElementById('llm-provider').value || null;

  const body = { bbox, scale, groundLevel };
  if (llmKey) {
    body.llmKey = llmKey;
    body.llmProvider = llmProvider;
  }

  // Reset UI
  setProgress(0, 'Starting...');
  showSection('progress');
  hideSection('download');
  hideSection('error');
  document.getElementById('generate-btn').disabled = true;

  try {
    const resp = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await resp.json();

    if (!resp.ok) {
      showError(data.error || 'Failed to start generation');
      document.getElementById('generate-btn').disabled = false;
      return;
    }

    currentJobId = data.jobId;
    startPolling();
  } catch (err) {
    showError('Network error: ' + err.message);
    document.getElementById('generate-btn').disabled = false;
  }
}

function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(pollStatus, 1500);
}

async function pollStatus() {
  if (!currentJobId) return;

  try {
    const resp = await fetch('/api/status/' + currentJobId);
    const data = await resp.json();

    if (!resp.ok) {
      stopPolling();
      showError(data.error || 'Failed to get status');
      return;
    }

    setProgress(data.progress, data.message);

    if (data.status === 'complete') {
      stopPolling();
      showSection('download');
      document.getElementById('download-btn').onclick = () => {
        window.location.href = '/api/download/' + currentJobId;
      };
      document.getElementById('generate-btn').disabled = false;
    } else if (data.status === 'failed') {
      stopPolling();
      showError(data.error || 'Generation failed');
      document.getElementById('generate-btn').disabled = false;
    }
  } catch {
    // Ignore transient fetch errors during polling
  }
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

// ---- UI Helpers ----
function setProgress(percent, message) {
  showSection('progress');
  document.querySelector('.progress-bar-fill').style.width = percent + '%';
  document.getElementById('progress-percent').textContent = Math.round(percent) + '%';
  document.getElementById('progress-text').textContent = message || '';
}

function showError(msg) {
  const el = document.getElementById('error-section');
  el.textContent = msg;
  el.classList.add('visible');
  hideSection('progress');
}

function showSection(id) {
  document.getElementById(id + '-section').classList.add('visible');
}

function hideSection(id) {
  document.getElementById(id + '-section').classList.remove('visible');
}

// ---- Math ----
function calcAreaKm2(minLat, minLng, maxLat, maxLng) {
  const R = 6371;
  const dLat = ((maxLat - minLat) * Math.PI) / 180;
  const dLng = ((maxLng - minLng) * Math.PI) / 180;
  const midLat = (((minLat + maxLat) / 2) * Math.PI) / 180;
  return dLat * R * dLng * R * Math.cos(midLat);
}

function estimateBlocks(minLat, minLng, maxLat, maxLng, scale) {
  const areaKm2 = calcAreaKm2(minLat, minLng, maxLat, maxLng);
  return Math.round(areaKm2 * 1e6 * scale * scale);
}

function formatNumber(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return String(n);
}

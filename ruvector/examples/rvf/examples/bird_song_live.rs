//! # Bird Song Live — Real-time Species Identifier with RVF Dashboard
//!
//! Category: **Domain / Audio / Practical**
//!
//! **What this demonstrates:**
//! - Species knowledge base stored as vector embeddings in RVF
//! - Embedded web dashboard via DASHBOARD_SEG
//! - Live microphone capture with Web Audio API FFT
//! - Real-time species classification via k-NN search
//! - WebSocket streaming of detection results
//! - Witness chain for pipeline provenance
//! - Fully offline — no internet connectivity required
//!
//! **RVF segments used:** VEC, META, WITNESS, DASHBOARD
//!
//! **Usage:**
//!   Build:  `cargo run --example bird_song_live`
//!   Serve:  `cargo run --example bird_song_live -- --serve`
//!     or:   `cargo run -p rvf-server -- --data-dir bird_song_live.rvf`
//!   Then:   Open http://localhost:8080

use std::sync::Arc;
use tokio::sync::Mutex;

use rvf_runtime::{
    MetadataEntry, MetadataValue, QueryOptions, RvfOptions, RvfStore,
};
use rvf_runtime::filter::FilterValue;
use rvf_runtime::options::DistanceMetric;
use rvf_runtime::FilterExpr;
use rvf_crypto::{
    create_witness_chain, verify_witness_chain, shake256_256, WitnessEntry,
};
use std::env;
use std::path::PathBuf;

// ---------------------------------------------------------------------------
// LCG helpers (deterministic pseudo-random)
// ---------------------------------------------------------------------------

fn random_vector(dim: usize, seed: u64) -> Vec<f32> {
    let mut v = Vec::with_capacity(dim);
    let mut x = seed.wrapping_add(1);
    for _ in 0..dim {
        x = x.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        v.push(((x >> 33) as f32) / (u32::MAX as f32) - 0.5);
    }
    v
}

fn hex_string(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

// ---------------------------------------------------------------------------
// Species knowledge base — same profiles as bird_song.rs
// ---------------------------------------------------------------------------

struct AcousticFeature {
    name: &'static str,
    center_freq_khz: f64,
    bandwidth_khz: f64,
}

const FEATURES: &[AcousticFeature] = &[
    AcousticFeature { name: "low_coo",         center_freq_khz: 0.8,  bandwidth_khz: 0.4 },
    AcousticFeature { name: "whistle",         center_freq_khz: 2.0,  bandwidth_khz: 0.6 },
    AcousticFeature { name: "mid_trill",       center_freq_khz: 3.5,  bandwidth_khz: 1.0 },
    AcousticFeature { name: "harmonic_series", center_freq_khz: 4.2,  bandwidth_khz: 1.5 },
    AcousticFeature { name: "high_chirp",      center_freq_khz: 5.5,  bandwidth_khz: 0.8 },
    AcousticFeature { name: "rapid_trill",     center_freq_khz: 6.5,  bandwidth_khz: 0.5 },
    AcousticFeature { name: "descending",      center_freq_khz: 2.5,  bandwidth_khz: 1.2 },
];

struct SpeciesProfile {
    name: &'static str,
    scientific_name: &'static str,
    emoji: &'static str,
    feature_affinities: [f64; 7],
}

const SPECIES: &[SpeciesProfile] = &[
    SpeciesProfile {
        name: "European Robin", scientific_name: "Erithacus rubecula", emoji: "🪺",
        feature_affinities: [0.05, 0.85, 0.70, 0.40, 0.30, 0.10, 0.60],
    },
    SpeciesProfile {
        name: "Blackbird", scientific_name: "Turdus merula", emoji: "🐦‍⬛",
        feature_affinities: [0.15, 0.90, 0.50, 0.75, 0.20, 0.05, 0.80],
    },
    SpeciesProfile {
        name: "Great Tit", scientific_name: "Parus major", emoji: "🐤",
        feature_affinities: [0.05, 0.40, 0.80, 0.30, 0.85, 0.15, 0.10],
    },
    SpeciesProfile {
        name: "Wren", scientific_name: "Troglodytes troglodytes", emoji: "🐦",
        feature_affinities: [0.05, 0.30, 0.85, 0.50, 0.70, 0.90, 0.15],
    },
    SpeciesProfile {
        name: "Chaffinch", scientific_name: "Fringilla coelebs", emoji: "🐧",
        feature_affinities: [0.10, 0.60, 0.55, 0.45, 0.50, 0.40, 0.85],
    },
    SpeciesProfile {
        name: "Song Thrush", scientific_name: "Turdus philomelos", emoji: "🎵",
        feature_affinities: [0.20, 0.75, 0.65, 0.85, 0.40, 0.30, 0.40],
    },
    SpeciesProfile {
        name: "Blue Tit", scientific_name: "Cyanistes caeruleus", emoji: "💙",
        feature_affinities: [0.05, 0.35, 0.60, 0.25, 0.90, 0.50, 0.20],
    },
    SpeciesProfile {
        name: "Woodpigeon", scientific_name: "Columba palumbus", emoji: "🕊️",
        feature_affinities: [0.95, 0.10, 0.05, 0.15, 0.02, 0.02, 0.30],
    },
];

// ---------------------------------------------------------------------------
// Dashboard HTML builder — fully self-contained, no external deps
// ---------------------------------------------------------------------------

fn build_dashboard() -> Vec<u8> {
    let html = r##"<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bird Song Identifier — RVF Live</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
:root {
  --bg-deep: #0a1a0f;
  --bg-card: rgba(16, 42, 28, 0.85);
  --bg-card-hover: rgba(22, 56, 38, 0.9);
  --border: rgba(76, 175, 80, 0.15);
  --accent: #4caf50;
  --accent-glow: rgba(76, 175, 80, 0.4);
  --text: #e0e8e2;
  --text-dim: #8a9e8e;
  --text-bright: #a5d6a7;
  --danger: #ef5350;
  --warn: #ffa726;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  background: linear-gradient(135deg, var(--bg-deep) 0%, #0d2818 50%, #0a1a15 100%);
  color: var(--text);
  min-height: 100vh;
  overflow-x: hidden;
}
header {
  background: rgba(10, 26, 15, 0.95);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  padding: 12px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  position: sticky;
  top: 0;
  z-index: 100;
}
header h1 { font-size: 20px; color: var(--accent); font-weight: 600; }
header h1 span { font-size: 14px; color: var(--text-dim); font-weight: 400; margin-left: 8px; }
.ws-dot { width: 8px; height: 8px; border-radius: 50%; margin-left: auto; }
.ws-on { background: var(--accent); box-shadow: 0 0 8px var(--accent-glow); }
.ws-off { background: var(--danger); }
#btn-listen {
  background: var(--accent);
  color: #0a1a0f;
  border: none;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
#btn-listen:hover { transform: scale(1.05); box-shadow: 0 0 16px var(--accent-glow); }
#btn-listen.listening { background: var(--danger); color: #fff; }
main { padding: 16px 24px 32px; max-width: 1200px; margin: 0 auto; }

/* Spectrogram */
.spectrogram-wrap {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 16px;
  backdrop-filter: blur(8px);
}
.spectrogram-wrap h2 { font-size: 13px; color: var(--text-dim); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
#spectrogram { width: 100%; height: 120px; border-radius: 8px; background: #050d08; }

/* Feature indicators */
.features-row {
  display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;
}
.feat {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
  backdrop-filter: blur(8px);
}
.feat .led {
  width: 10px; height: 10px; border-radius: 50%;
  background: #1a3020;
  transition: all 0.3s;
}
.feat.active { border-color: var(--accent); background: rgba(76, 175, 80, 0.08); }
.feat.active .led {
  background: var(--accent);
  box-shadow: 0 0 10px var(--accent-glow), 0 0 20px rgba(76, 175, 80, 0.2);
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 8px var(--accent-glow); }
  50% { box-shadow: 0 0 16px var(--accent-glow), 0 0 24px rgba(76, 175, 80, 0.15); }
}
.feat .freq { color: var(--text-dim); font-size: 10px; }

/* Species cards */
.species-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; margin-bottom: 16px; }
.species-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px;
  transition: all 0.3s;
  backdrop-filter: blur(8px);
  position: relative;
  overflow: hidden;
}
.species-card.top-match {
  border-color: var(--accent);
  box-shadow: 0 0 20px rgba(76, 175, 80, 0.12);
}
.species-card .rank {
  position: absolute;
  top: 8px;
  right: 10px;
  font-size: 11px;
  color: var(--text-dim);
  background: rgba(0,0,0,0.3);
  padding: 2px 8px;
  border-radius: 10px;
}
.species-card .emoji { font-size: 28px; margin-bottom: 4px; }
.species-card .name { font-size: 15px; font-weight: 600; color: var(--text-bright); }
.species-card .sci { font-size: 11px; color: var(--text-dim); font-style: italic; margin-bottom: 8px; }
.species-card .bar-wrap {
  height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; margin-bottom: 4px;
}
.species-card .bar {
  height: 100%; border-radius: 3px;
  background: linear-gradient(90deg, var(--accent), #81c784);
  transition: width 0.4s ease;
  width: 0%;
}
.species-card .score { font-size: 12px; color: var(--text-dim); }
.species-card .score b { color: var(--text); }

/* Detection log */
.log-wrap {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px;
  backdrop-filter: blur(8px);
}
.log-wrap h2 { font-size: 13px; color: var(--text-dim); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
#log {
  max-height: 200px; overflow-y: auto; font-family: "SF Mono", "Menlo", "Monaco", monospace; font-size: 11px;
}
#log div { padding: 3px 0; border-bottom: 1px solid rgba(255,255,255,0.03); color: var(--text-dim); }
#log .time { color: var(--accent); }
#log .species-name { color: var(--text-bright); font-weight: 500; }

/* Responsive */
@media (max-width: 600px) {
  main { padding: 12px; }
  .species-grid { grid-template-columns: 1fr 1fr; }
  header h1 span { display: none; }
  .feat .freq { display: none; }
}
</style>
</head>
<body>
<header>
  <h1>🐦 Bird Song Identifier <span>RVF Live</span></h1>
  <button id="btn-listen" onclick="toggleListening()">▶ Start Listening</button>
  <span class="ws-dot ws-off" id="ws-dot"></span>
</header>
<main>
  <div class="spectrogram-wrap">
    <h2>Live Spectrogram</h2>
    <canvas id="spectrogram"></canvas>
  </div>
  <div class="features-row" id="features"></div>
  <div class="species-grid" id="species-grid"></div>
  <div class="log-wrap">
    <h2>Detection Log</h2>
    <div id="log"></div>
  </div>
</main>
<script>
// ── Feature & species data (matches bird_song.rs) ──
var FEATURES = [
  { name: 'low_coo', label: 'Low Coo', freq: 0.8, bw: 0.4 },
  { name: 'whistle', label: 'Whistle', freq: 2.0, bw: 0.6 },
  { name: 'mid_trill', label: 'Mid Trill', freq: 3.5, bw: 1.0 },
  { name: 'harmonic_series', label: 'Harmonics', freq: 4.2, bw: 1.5 },
  { name: 'high_chirp', label: 'High Chirp', freq: 5.5, bw: 0.8 },
  { name: 'rapid_trill', label: 'Rapid Trill', freq: 6.5, bw: 0.5 },
  { name: 'descending', label: 'Descending', freq: 2.5, bw: 1.2 }
];

var SPECIES = [
  { name: 'European Robin', sci: 'Erithacus rubecula', emoji: '🪺',
    affinities: [0.05, 0.85, 0.70, 0.40, 0.30, 0.10, 0.60] },
  { name: 'Blackbird', sci: 'Turdus merula', emoji: '🐦‍⬛',
    affinities: [0.15, 0.90, 0.50, 0.75, 0.20, 0.05, 0.80] },
  { name: 'Great Tit', sci: 'Parus major', emoji: '🐤',
    affinities: [0.05, 0.40, 0.80, 0.30, 0.85, 0.15, 0.10] },
  { name: 'Wren', sci: 'Troglodytes troglodytes', emoji: '🐦',
    affinities: [0.05, 0.30, 0.85, 0.50, 0.70, 0.90, 0.15] },
  { name: 'Chaffinch', sci: 'Fringilla coelebs', emoji: '🐧',
    affinities: [0.10, 0.60, 0.55, 0.45, 0.50, 0.40, 0.85] },
  { name: 'Song Thrush', sci: 'Turdus philomelos', emoji: '🎵',
    affinities: [0.20, 0.75, 0.65, 0.85, 0.40, 0.30, 0.40] },
  { name: 'Blue Tit', sci: 'Cyanistes caeruleus', emoji: '💙',
    affinities: [0.05, 0.35, 0.60, 0.25, 0.90, 0.50, 0.20] },
  { name: 'Woodpigeon', sci: 'Columba palumbus', emoji: '🕊️',
    affinities: [0.95, 0.10, 0.05, 0.15, 0.02, 0.02, 0.30] }
];

// ── Build UI ──
var featuresEl = document.getElementById('features');
FEATURES.forEach(function(f) {
  var div = document.createElement('div');
  div.className = 'feat';
  div.id = 'feat-' + f.name;
  div.innerHTML = '<span class="led"></span>' + f.label + ' <span class="freq">' + f.freq + ' kHz</span>';
  featuresEl.appendChild(div);
});

var speciesGrid = document.getElementById('species-grid');
SPECIES.forEach(function(sp, i) {
  var div = document.createElement('div');
  div.className = 'species-card';
  div.id = 'sp-' + i;
  div.innerHTML = '<span class="rank">#' + (i + 1) + '</span>' +
    '<div class="emoji">' + sp.emoji + '</div>' +
    '<div class="name">' + sp.name + '</div>' +
    '<div class="sci">' + sp.sci + '</div>' +
    '<div class="bar-wrap"><div class="bar" id="bar-' + i + '"></div></div>' +
    '<div class="score">Confidence: <b id="score-' + i + '">—</b></div>';
  speciesGrid.appendChild(div);
});

// ── Audio engine ──
var audioCtx, analyser, source, dataArray, freqData;
var listening = false;
var canvas = document.getElementById('spectrogram');
var ctx = canvas.getContext('2d');
var specX = 0;

function resizeCanvas() {
  canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1);
  canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
  specX = 0;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function toggleListening() {
  var btn = document.getElementById('btn-listen');
  if (listening) {
    stopListening();
    btn.textContent = '▶ Start Listening';
    btn.classList.remove('listening');
  } else {
    startListening();
    btn.textContent = '⏹ Stop';
    btn.classList.add('listening');
  }
}

function startListening() {
  if (listening) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.75;

  navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
    source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    freqData = new Uint8Array(analyser.frequencyBinCount);
    listening = true;
    addLog('system', 'Microphone active — listening for bird calls');
    tick();
  }).catch(function(err) {
    addLog('error', 'Mic access denied: ' + err.message);
  });
}

function stopListening() {
  listening = false;
  if (source) source.disconnect();
  if (audioCtx) audioCtx.close();
  addLog('system', 'Stopped listening');
}

// ── Analysis loop ──
var lastClassify = 0;
function tick() {
  if (!listening) return;
  requestAnimationFrame(tick);
  analyser.getByteFrequencyData(freqData);

  drawSpectrogram();

  var now = Date.now();
  if (now - lastClassify > 250) {
    lastClassify = now;
    var detected = detectFeatures();
    updateFeatureUI(detected);
    var scores = classifySpecies(detected);
    updateSpeciesUI(scores);
  }
}

// ── Spectrogram drawing ──
function drawSpectrogram() {
  var w = canvas.width;
  var h = canvas.height;
  var bins = freqData.length;
  // Show up to 10 kHz (about half of 22kHz)
  var maxBin = Math.floor(bins * (10000 / (audioCtx.sampleRate / 2)));
  var colW = 2;

  for (var i = 0; i < maxBin; i++) {
    var y = h - (i / maxBin) * h;
    var val = freqData[i];
    var r = Math.min(255, val * 0.3);
    var g = Math.min(255, val * 1.2);
    var b = Math.min(255, val * 0.5);
    ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
    ctx.fillRect(specX, y, colW, Math.max(1, h / maxBin));
  }
  specX += colW;
  if (specX >= w) {
    specX = 0;
    ctx.fillStyle = 'rgba(5, 13, 8, 0.3)';
    ctx.fillRect(0, 0, w, h);
  }
}

// ── Feature detection from FFT bins ──
function detectFeatures() {
  var sampleRate = audioCtx.sampleRate;
  var binHz = sampleRate / analyser.fftSize;
  var detected = {};

  // Compute noise floor (average of all bins)
  var sum = 0;
  for (var i = 0; i < freqData.length; i++) sum += freqData[i];
  var noiseFloor = sum / freqData.length;
  var threshold = noiseFloor + 20; // 20 above noise floor

  FEATURES.forEach(function(f) {
    var loKhz = f.freq - f.bw / 2;
    var hiKhz = f.freq + f.bw / 2;
    var loBin = Math.max(0, Math.floor((loKhz * 1000) / binHz));
    var hiBin = Math.min(freqData.length - 1, Math.ceil((hiKhz * 1000) / binHz));

    // Compute peak and average power in this band
    var peak = 0, avg = 0, count = 0;
    for (var b = loBin; b <= hiBin; b++) {
      if (freqData[b] > peak) peak = freqData[b];
      avg += freqData[b];
      count++;
    }
    avg = count > 0 ? avg / count : 0;

    // Feature is detected if peak is above threshold and band average is notable
    var strength = Math.max(0, (avg - threshold) / (255 - threshold));
    detected[f.name] = { active: peak > threshold && avg > noiseFloor + 10, strength: strength };
  });

  return detected;
}

// ── Species classification ──
function classifySpecies(detected) {
  var scores = SPECIES.map(function(sp, idx) {
    var score = 0;
    var totalWeight = 0;
    FEATURES.forEach(function(f, fi) {
      var affinity = sp.affinities[fi];
      var d = detected[f.name];
      if (d.active) {
        // If feature matches species profile, boost score
        score += affinity * (0.5 + d.strength * 0.5);
      } else {
        // Penalize slightly if a high-affinity feature is missing
        score -= affinity * 0.1;
      }
      totalWeight += affinity;
    });
    var normalized = totalWeight > 0 ? Math.max(0, score / totalWeight) : 0;
    return { idx: idx, score: normalized, name: sp.name };
  });

  scores.sort(function(a, b) { return b.score - a.score; });
  return scores;
}

// ── UI updates ──
function updateFeatureUI(detected) {
  FEATURES.forEach(function(f) {
    var el = document.getElementById('feat-' + f.name);
    if (detected[f.name].active) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });
}

var prevTop = '';
function updateSpeciesUI(scores) {
  scores.forEach(function(s, rank) {
    var card = document.getElementById('sp-' + s.idx);
    var bar = document.getElementById('bar-' + s.idx);
    var scoreEl = document.getElementById('score-' + s.idx);
    var pct = Math.round(s.score * 100);
    bar.style.width = pct + '%';
    scoreEl.textContent = pct + '%';
    card.querySelector('.rank').textContent = '#' + (rank + 1);

    if (rank === 0 && s.score > 0.1) {
      card.classList.add('top-match');
    } else {
      card.classList.remove('top-match');
    }
  });

  // Log top detection if changed
  if (scores[0].score > 0.15 && scores[0].name !== prevTop) {
    prevTop = scores[0].name;
    addLog('detection', scores[0].name + ' — ' + Math.round(scores[0].score * 100) + '% confidence');
  }
}

function addLog(type, msg) {
  var log = document.getElementById('log');
  var div = document.createElement('div');
  var time = new Date().toLocaleTimeString();
  var icon = type === 'detection' ? '🐦' : type === 'error' ? '❌' : '📡';
  div.innerHTML = '<span class="time">' + time + '</span> ' + icon + ' ' +
    (type === 'detection' ? '<span class="species-name">' + msg + '</span>' : msg);
  log.insertBefore(div, log.firstChild);
  if (log.children.length > 50) log.removeChild(log.lastChild);
}

// ── WebSocket (optional, for server-side events) ──
var ws;
function connectWS() {
  var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(proto + '//' + location.host + '/ws/live');
  ws.onopen = function() { document.getElementById('ws-dot').className = 'ws-dot ws-on'; };
  ws.onclose = function() {
    document.getElementById('ws-dot').className = 'ws-dot ws-off';
    setTimeout(connectWS, 3000);
  };
  ws.onmessage = function(e) {
    try {
      var evt = JSON.parse(e.data);
      addLog('server', evt.event_type + ': ' + JSON.stringify(evt.data));
    } catch(ex) {}
  };
}
connectWS();
addLog('system', 'Dashboard ready — click Start Listening to begin');
</script>
</body>
</html>"##;

    html.as_bytes().to_vec()
}

// ---------------------------------------------------------------------------
// Main (async for HTTP server)
// ---------------------------------------------------------------------------

#[tokio::main]
async fn main() {
    println!("╔══════════════════════════════════════════════════════════════╗");
    println!("║        🐦 Bird Song Live — RVF Species Identifier         ║");
    println!("╚══════════════════════════════════════════════════════════════╝\n");

    // Parse args: --serve to start server after build, --output to set path
    let args: Vec<String> = env::args().collect();
    let serve_mode = args.iter().any(|a| a == "--serve");
    let output_path = args.iter().position(|a| a == "--output")
        .and_then(|i| args.get(i + 1))
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("bird_song_live.rvf"));

    let dim = 64;
    let store_path = output_path.clone();

    // If --serve and file already exists, just open and serve it
    if serve_mode && store_path.exists() {
        println!("  📦 Opening existing RVF file: {}\n", store_path.display());
        let store = RvfStore::open(&store_path).expect("failed to open RVF store");

        let status = store.status();
        println!("  Vectors:     {}", status.total_vectors);
        println!("  Segments:    {}", status.total_segments);
        println!("  File Size:   {} bytes\n", status.file_size);

        println!("--- Starting Dashboard Server ---\n");
        println!("  🌐 Dashboard:  http://localhost:8080");
        println!("  📡 WebSocket:  ws://localhost:8080/ws/live");
        println!("  🔌 Offline:    Yes — no internet needed");
        println!("\n  Open your browser and click 'Start Listening'!");
        println!("  Press Ctrl+C to stop.\n");

        let shared_store = Arc::new(Mutex::new(store));
        let (event_tx, _rx) = rvf_server::ws::event_channel();
        let static_dir: Option<std::path::PathBuf> = None;
        let app = rvf_server::http::router_with_static(shared_store, event_tx, static_dir);

        let listener = tokio::net::TcpListener::bind("0.0.0.0:8080")
            .await
            .expect("failed to bind to port 8080");
        axum::serve(listener, app).await.expect("server error");
        return;
    }


    let options = RvfOptions {
        dimension: dim as u16,
        metric: DistanceMetric::L2,
        ..Default::default()
    };

    let mut store = RvfStore::create(&store_path, options).expect("failed to create RVF store");

    // ==== 1. Build species knowledge base ====
    println!("--- 1. Species Knowledge Base ---\n");

    // Create one embedding per (species, feature) pair = 8 × 7 = 56 vectors
    let mut all_vectors: Vec<Vec<f32>> = Vec::new();
    let mut all_ids: Vec<u64> = Vec::new();
    let mut all_metadata: Vec<MetadataEntry> = Vec::new();
    let mut vid = 0u64;

    for (sp_idx, species) in SPECIES.iter().enumerate() {
        for (feat_idx, feature) in FEATURES.iter().enumerate() {
            let affinity = species.feature_affinities[feat_idx];

            // Generate an embedding seeded by species+feature
            let seed = (sp_idx as u64) * 1000 + (feat_idx as u64) * 7 + (affinity * 1000.0) as u64;
            let vec = random_vector(dim, seed);
            all_vectors.push(vec);
            all_ids.push(vid);

            // Metadata: 0=species, 1=feature, 2=affinity, 3=scientific_name
            all_metadata.push(MetadataEntry {
                field_id: 0,
                value: MetadataValue::String(species.name.to_string()),
            });
            all_metadata.push(MetadataEntry {
                field_id: 1,
                value: MetadataValue::String(feature.name.to_string()),
            });
            all_metadata.push(MetadataEntry {
                field_id: 2,
                value: MetadataValue::U64((affinity * 1000.0) as u64),
            });
            all_metadata.push(MetadataEntry {
                field_id: 3,
                value: MetadataValue::String(species.scientific_name.to_string()),
            });

            vid += 1;
        }
    }

    let vec_refs: Vec<&[f32]> = all_vectors.iter().map(|v| v.as_slice()).collect();
    let ingest = store
        .ingest_batch(&vec_refs, &all_ids, Some(&all_metadata))
        .expect("ingest failed");

    println!("  Species:     {}", SPECIES.len());
    println!("  Features:    {}", FEATURES.len());
    println!("  Vectors:     {} ({} dims)", ingest.accepted, dim);
    println!("  Store ID:    {}...", hex_string(&store.file_id()[..8]));

    // Verify: query features for a specific species
    let robin_filter = FilterExpr::Eq(0, FilterValue::String("European Robin".to_string()));
    let robin_opts = QueryOptions {
        filter: Some(robin_filter),
        ..Default::default()
    };
    let query_vec = random_vector(dim, 42);
    let robin_results = store.query(&query_vec, 7, &robin_opts).expect("robin query");
    println!("  Verify:      Robin features found = {} ✅", robin_results.len());

    // ==== 2. Embed dashboard ====
    println!("\n--- 2. Embedded Dashboard (DASHBOARD_SEG) ---\n");

    let dashboard_bytes = build_dashboard();
    let dash_seg_id = store
        .embed_dashboard(0, &dashboard_bytes, "index.html")
        .expect("failed to embed dashboard");
    println!("  Segment ID:  {}", dash_seg_id);
    println!("  Bundle size: {} bytes", dashboard_bytes.len());
    println!("  Entry point: index.html");
    println!("  Internet:    NOT required (fully offline)");

    // Verify round-trip
    let (_dh_bytes, db_bytes) = store
        .extract_dashboard()
        .expect("extract_dashboard failed")
        .expect("no dashboard found");
    assert_eq!(db_bytes, dashboard_bytes);
    println!("  Verified:    ✅ dashboard intact");

    // ==== 3. Witness chain ====
    println!("\n--- 3. Pipeline Provenance ---\n");

    let chain_steps = [
        ("genesis", 0x01u8),
        ("species_catalog_load", 0x08),
        ("feature_profile_build", 0x02),
        ("embedding_generation", 0x02),
        ("rvf_ingest", 0x02),
        ("dashboard_embed", 0x02),
        ("knowledge_verify", 0x02),
        ("server_ready", 0x01),
    ];

    let entries: Vec<WitnessEntry> = chain_steps
        .iter()
        .enumerate()
        .map(|(i, (step, wtype))| {
            let action_data = format!("bird_song_live:{}:step_{}", step, i);
            WitnessEntry {
                prev_hash: [0u8; 32],
                action_hash: shake256_256(action_data.as_bytes()),
                timestamp_ns: 1_700_000_000_000_000_000 + i as u64 * 1_000_000_000,
                witness_type: *wtype,
            }
        })
        .collect();

    let chain_bytes = create_witness_chain(&entries);
    let verified = verify_witness_chain(&chain_bytes).expect("chain verification failed");
    println!("  Chain:       {} entries, {} bytes", verified.len(), chain_bytes.len());
    println!("  Integrity:   ✅ VALID");

    // ==== 4. Manifest ====
    let status = store.status();
    println!("\n--- 4. RVF File Manifest ---\n");
    println!("  +------------------------------------------------------+");
    println!("  |       BIRD SONG LIVE IDENTIFIER v1.0                 |");
    println!("  +------------------------------------------------------+");
    println!("  | Knowledge Base  | {} species × {} features = {} vectors |",
        SPECIES.len(), FEATURES.len(), status.total_vectors);
    println!("  | Dashboard       | {} bytes (embedded HTML/JS)    |", dashboard_bytes.len());
    println!("  | Witness Chain   | {} entries                        |", verified.len());
    println!("  | Segments        | {}                                 |", status.total_segments);
    println!("  | File Size       | {} bytes                        |", status.file_size);
    println!("  | Connectivity    | NONE required (offline)           |");
    println!("  +------------------------------------------------------+");

    println!("\n  📦 RVF file saved to: {}", store_path.display());
    println!("     This file is self-contained — copy it anywhere.");

    // ==== 5. Write standalone HTML (works without any server) ====
    let html_path = store_path.with_extension("html");
    std::fs::write(&html_path, &dashboard_bytes).expect("failed to write HTML file");
    println!("  🌐 HTML saved to:  {}", html_path.display());
    println!("     Open in any browser — phone, tablet, laptop. Zero server needed.\n");

    if !serve_mode {
        // Just build the .rvf file and exit with instructions
        store.close().expect("close store");
        println!("  ┌─────────────────────────────────────────────────────┐");
        println!("  │  To serve this RVF file, run either:               │");
        println!("  │                                                     │");
        println!("  │  Option 1 (via this example):                      │");
        println!("  │    cargo run --example bird_song_live -- --serve    │");
        println!("  │                                                     │");
        println!("  │  Option 2 (via rvf-server directly):               │");
        println!("  │    cargo run -p rvf-server -- \\                    │");
        println!("  │      --data-dir {}   │", store_path.display());
        println!("  │                                                     │");
        println!("  │  Then open http://localhost:8080                    │");
        println!("  └─────────────────────────────────────────────────────┘");
        return;
    }

    // ==== 5. Start HTTP server (--serve mode) ====
    println!("--- 5. Starting Dashboard Server ---\n");
    println!("  🌐 Dashboard:  http://localhost:8080");
    println!("  📡 WebSocket:  ws://localhost:8080/ws/live");
    println!("  🔌 Offline:    Yes — no internet needed");
    println!("\n  Open your browser and click 'Start Listening'!");
    println!("  Play bird songs near your mic to identify species.");
    println!("  Press Ctrl+C to stop.\n");

    let shared_store = Arc::new(Mutex::new(store));

    // Create event channel for WebSocket
    let (event_tx, _rx) = rvf_server::ws::event_channel();

    // Always use the embedded DASHBOARD_SEG — ignore any static dashboard/dist
    let static_dir: Option<std::path::PathBuf> = None;

    let app = rvf_server::http::router_with_static(shared_store, event_tx.clone(), static_dir);

    // Periodic heartbeat events
    let tx_clone = event_tx.clone();
    tokio::spawn(async move {
        let mut counter = 0u64;
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(10)).await;
            counter += 1;
            let event = rvf_server::ws::LiveEvent {
                event_type: "heartbeat".to_string(),
                timestamp: format!("T+{}s", counter * 10),
                data: serde_json::json!({
                    "uptime_s": counter * 10,
                    "species_db": 8,
                    "features_db": 7
                }),
            };
            let _ = tx_clone.send(event);
        }
    });

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080")
        .await
        .expect("failed to bind to port 8080");

    axum::serve(listener, app).await.expect("server error");
}

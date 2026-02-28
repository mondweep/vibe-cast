// generate-rvf.mjs — Generates .rvf data file + self-contained HTML explorer
// Uses agentdb's RVFOptimizer for vector compression quality metrics
//
// Usage: node research/generate-rvf.mjs
// Output: research/output/portfolio-vectors.rvf
//         research/output/portfolio-explorer.html

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { RVFOptimizer } from 'agentdb';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Load data (same sources as portfolio-similarity-engine.mjs)
// ---------------------------------------------------------------------------

const cusipData = JSON.parse(readFileSync(join(__dirname, 'data/cusip-sector-map.json'), 'utf-8'));
const holdingsData = JSON.parse(readFileSync(join(__dirname, 'data/portfolio-holdings.json'), 'utf-8'));

const CUSIP_MAP = cusipData.securities;
const PORTFOLIOS = holdingsData.portfolios;

const GICS_SECTORS = [
    'Information Technology', 'Health Care', 'Financials',
    'Consumer Discretionary', 'Communication Services', 'Industrials',
    'Consumer Staples', 'Energy', 'Utilities', 'Real Estate', 'Materials',
];

const MEGA_TECH_CUSIPS = new Set([
    '037833100', '594918104', '02079K305', '02079K107',
    '023135106', '67066G104', '30303M102',
]);

// ---------------------------------------------------------------------------
// Vector construction (identical to portfolio-similarity-engine.mjs)
// ---------------------------------------------------------------------------

function buildPortfolioVector(portfolio) {
    const vector = new Float64Array(32);

    const equityHoldings = [];
    let putCount = 0, callCount = 0, soleCount = 0, dfndCount = 0;

    for (const h of portfolio.holdings) {
        const type = (h.type || 'SH').toUpperCase();
        if (type === 'PUT') { putCount++; continue; }
        if (type === 'CALL') { callCount++; continue; }
        equityHoldings.push(h);
        const disc = (h.investmentDiscretion || 'SOLE').toUpperCase();
        if (disc === 'SOLE') soleCount++; else dfndCount++;
    }

    if (equityHoldings.length === 0) return vector;
    const totalValue = equityHoldings.reduce((s, h) => s + h.value, 0);
    if (totalValue === 0) return vector;

    const sectorValues = new Float64Array(11);
    let megaTechValue = 0;

    for (const h of equityHoldings) {
        const security = CUSIP_MAP[h.cusip];
        if (security) {
            const sectorIdx = GICS_SECTORS.indexOf(security.sector);
            if (sectorIdx >= 0) sectorValues[sectorIdx] += h.value;
        }
        if (MEGA_TECH_CUSIPS.has(h.cusip)) megaTechValue += h.value;
    }

    for (let i = 0; i < 11; i++) vector[i] = sectorValues[i] / totalValue;

    const weights = equityHoldings.map(h => h.value / totalValue).sort((a, b) => b - a);
    const n = weights.length;

    vector[11] = weights[0] || 0;
    vector[12] = weights.slice(0, 5).reduce((s, w) => s + w, 0);
    vector[13] = weights.slice(0, 10).reduce((s, w) => s + w, 0);
    const hhi = weights.reduce((s, w) => s + w * w, 0);
    vector[14] = hhi;
    vector[15] = Math.log(n + 1) / Math.log(5000);
    const effectiveN = hhi > 0 ? 1 / hhi : n;
    vector[16] = Math.min(effectiveN / Math.max(n, 1), 1.0);
    const sectorWeights = Array.from(sectorValues).map(v => v / totalValue);
    vector[17] = sectorWeights.reduce((s, w) => s + w * w, 0);

    let largeCap = 0, midCap = 0, smallCap = 0;
    for (const h of equityHoldings) {
        const security = CUSIP_MAP[h.cusip];
        const cap = security ? security.capSize : 'large';
        if (cap === 'mega' || cap === 'large') largeCap += h.value;
        else if (cap === 'mid') midCap += h.value;
        else smallCap += h.value;
    }
    vector[18] = largeCap / totalValue;
    vector[19] = midCap / totalValue;
    vector[20] = smallCap / totalValue;
    vector[21] = Math.min(Math.log10(totalValue + 1) / Math.log10(1e9), 1.0);
    const avgPosition = totalValue / n;
    vector[22] = Math.min(Math.log10(avgPosition + 1) / Math.log10(1e7), 1.0);
    const growthSectors = (sectorValues[0] + sectorValues[4] + sectorValues[3]) / totalValue;
    vector[23] = Math.min(growthSectors, 1.0);
    vector[24] = 1.0;

    const totalEntries = portfolio.holdings.length;
    vector[25] = (putCount + callCount) / Math.max(totalEntries, 1);
    const totalDisc = soleCount + dfndCount;
    vector[26] = totalDisc > 0 ? soleCount / totalDisc : 1.0;
    vector[27] = totalDisc > 0 ? dfndCount / totalDisc : 0.0;
    vector[28] = megaTechValue / totalValue;
    vector[29] = (sectorValues[6] + sectorValues[8] + sectorValues[1]) / totalValue;
    vector[30] = (sectorValues[3] + sectorValues[5] + sectorValues[10] + sectorValues[7]) / totalValue;

    if (n > 1) {
        const sortedAsc = [...weights].sort((a, b) => a - b);
        const sumW = sortedAsc.reduce((s, w) => s + w, 0);
        let giniNumerator = 0;
        for (let i = 0; i < n; i++) giniNumerator += (i + 1) * sortedAsc[i];
        const gini = (2 * giniNumerator) / (n * sumW) - (n + 1) / n;
        vector[31] = 1.0 - Math.min(Math.max(gini, 0), 1.0);
    } else {
        vector[31] = 1.0;
    }

    return vector;
}

// ---------------------------------------------------------------------------
// Schema definition
// ---------------------------------------------------------------------------

const SCHEMA = {
    dimensions: 32,
    categories: [
        {
            name: 'Sector Allocation',
            range: [0, 10],
            dims: [
                { idx: 0,  label: 'Info Tech',       short: 'Tech' },
                { idx: 1,  label: 'Health Care',     short: 'Health' },
                { idx: 2,  label: 'Financials',      short: 'Finan' },
                { idx: 3,  label: 'Cons Discret',    short: 'CDisc' },
                { idx: 4,  label: 'Comm Services',   short: 'Comms' },
                { idx: 5,  label: 'Industrials',     short: 'Indus' },
                { idx: 6,  label: 'Cons Staples',    short: 'Stapl' },
                { idx: 7,  label: 'Energy',          short: 'Enrgy' },
                { idx: 8,  label: 'Utilities',       short: 'Util' },
                { idx: 9,  label: 'Real Estate',     short: 'REst' },
                { idx: 10, label: 'Materials',       short: 'Mater' },
            ]
        },
        {
            name: 'Concentration',
            range: [11, 17],
            dims: [
                { idx: 11, label: 'Top 1 Holding %',  short: 'Top1' },
                { idx: 12, label: 'Top 5 Holdings %', short: 'Top5' },
                { idx: 13, label: 'Top 10 Holdings %',short: 'Top10' },
                { idx: 14, label: 'HHI',              short: 'HHI' },
                { idx: 15, label: '# Holdings',       short: '#Hold' },
                { idx: 16, label: 'Effective N',       short: 'EffN' },
                { idx: 17, label: 'Sector HHI',       short: 'SecHHI' },
            ]
        },
        {
            name: 'Style & Size',
            range: [18, 24],
            dims: [
                { idx: 18, label: 'Large Cap %',      short: 'LgCap' },
                { idx: 19, label: 'Mid Cap %',        short: 'MdCap' },
                { idx: 20, label: 'Small Cap %',      short: 'SmCap' },
                { idx: 21, label: 'Total Value',      short: 'TotVal' },
                { idx: 22, label: 'Avg Position',     short: 'AvgPos' },
                { idx: 23, label: 'Growth Tilt',      short: 'GrwVl' },
                { idx: 24, label: 'Domestic',          short: 'Domst' },
            ]
        },
        {
            name: 'Behavioral',
            range: [25, 31],
            dims: [
                { idx: 25, label: 'Options Ratio',    short: 'Opts' },
                { idx: 26, label: 'Sole Discretion',  short: 'Sole' },
                { idx: 27, label: 'Shared Discretion', short: 'Shared' },
                { idx: 28, label: 'Mega-Tech Exp',    short: 'MegaT' },
                { idx: 29, label: 'Defensive Tilt',   short: 'Defen' },
                { idx: 30, label: 'Cyclical Tilt',    short: 'Cycl' },
                { idx: 31, label: 'Position Equality', short: 'Equal' },
            ]
        },
    ]
};

// ---------------------------------------------------------------------------
// Build vectors + RVF compression metrics
// ---------------------------------------------------------------------------

const optimizer = new RVFOptimizer({
    compression: { enabled: true, quantizeBits: 8, adaptive: true },
});

const vectors = [];

for (const portfolio of PORTFOLIOS) {
    const rawVector = buildPortfolioVector(portfolio);
    const vectorArray = Array.from(rawVector);

    // Use RVFOptimizer for adaptive quantization + quality measurement
    const { compressed, metrics } = optimizer.adaptiveQuantize(vectorArray, 0.9);
    const quality = optimizer.measureQuality(vectorArray, compressed);

    const equityHoldings = portfolio.holdings.filter(h => {
        const t = (h.type || 'SH').toUpperCase();
        return t !== 'PUT' && t !== 'CALL';
    });
    const totalValue = equityHoldings.reduce((s, h) => s + h.value, 0);
    const sorted = [...equityHoldings].sort((a, b) => b.value - a.value);
    const topHolding = sorted[0];
    const topSecurity = topHolding ? CUSIP_MAP[topHolding.cusip] : null;

    // Top 5 holdings for display
    const topHoldings = sorted.slice(0, 5).map(h => {
        const sec = CUSIP_MAP[h.cusip];
        return {
            ticker: sec ? sec.ticker : h.nameOfIssuer.substring(0, 6),
            name: sec ? sec.name : h.nameOfIssuer,
            weight: +(h.value / totalValue).toFixed(4),
        };
    });

    vectors.push({
        id: portfolio.cik,
        name: portfolio.fundName,
        style: portfolio.fundStyle,
        vector: vectorArray.map(v => +v.toFixed(6)),
        metadata: {
            filingDate: portfolio.filingDate,
            reportDate: portfolio.reportDate,
            totalValueUsd: totalValue * 1000,
            holdingsCount: equityHoldings.length,
            topHoldings,
        },
        compression: {
            cosineSimilarity: +quality.cosineSimilarity.toFixed(6),
            mse: +quality.mse.toFixed(8),
            maxError: +quality.maxError.toFixed(6),
            bits: metrics.quantizationBits,
            ratio: +metrics.compressionRatio.toFixed(1),
        },
    });
}

// ---------------------------------------------------------------------------
// Write .rvf file
// ---------------------------------------------------------------------------

const rvfData = {
    format: 'rvf',
    version: '1.0',
    generator: 'agentdb@3.0.0-alpha.10 / RVFOptimizer',
    created: new Date().toISOString().split('T')[0],
    dataSource: 'SEC EDGAR 13F-HR Filings (Public Domain)',
    reportingPeriod: holdingsData._reportingPeriod,
    schema: SCHEMA,
    vectors,
};

const rvfPath = join(__dirname, 'output/portfolio-vectors.rvf');
writeFileSync(rvfPath, JSON.stringify(rvfData, null, 2));
console.log(`Written: ${rvfPath} (${(readFileSync(rvfPath).length / 1024).toFixed(1)} KB)`);

// ---------------------------------------------------------------------------
// Generate self-contained HTML explorer
// ---------------------------------------------------------------------------

const htmlContent = buildHTML(rvfData);
const htmlPath = join(__dirname, 'output/portfolio-explorer.html');
writeFileSync(htmlPath, htmlContent);
console.log(`Written: ${htmlPath} (${(readFileSync(htmlPath).length / 1024).toFixed(1)} KB)`);

// Print compression quality summary
console.log('\nRVF Compression Quality (via agentdb RVFOptimizer):');
for (const v of vectors) {
    console.log(`  ${v.name.padEnd(35)} cos=${v.compression.cosineSimilarity} mse=${v.compression.mse} bits=${v.compression.bits}`);
}

// ---------------------------------------------------------------------------
// HTML Builder
// ---------------------------------------------------------------------------

function buildHTML(rvf) {
    const dataJSON = JSON.stringify(rvf);
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>Portfolio Vector Explorer</title>
<style>
:root {
  --bg: #0d1117; --surface: #161b22; --border: #30363d; --text: #e6edf3;
  --muted: #8b949e; --accent: #58a6ff; --accent2: #3fb950; --accent3: #d2a8ff;
  --warn: #d29922; --danger: #f85149; --radius: 8px;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  background: var(--bg); color: var(--text); line-height: 1.5;
  min-height: 100vh; padding: 12px;
}
.container { max-width: 960px; margin: 0 auto; }
h1 { font-size: 1.4em; margin-bottom: 4px; }
h2 { font-size: 1.1em; color: var(--accent); margin: 16px 0 8px; }
.subtitle { color: var(--muted); font-size: 0.85em; margin-bottom: 16px; }
.badge {
  display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.75em;
  background: var(--surface); border: 1px solid var(--border); color: var(--muted); margin-right: 6px;
}

/* Controls */
.controls { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
select, button {
  background: var(--surface); color: var(--text); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 8px 12px; font-size: 0.9em;
  cursor: pointer; outline: none;
}
select:focus, button:focus { border-color: var(--accent); }
button { background: #21262d; }
button:hover { background: #30363d; }
button.active { background: var(--accent); color: #0d1117; font-weight: 600; }
select { flex: 1; min-width: 200px; }

/* Metric toggle */
.metric-toggle { display: flex; gap: 0; border-radius: var(--radius); overflow: hidden; }
.metric-toggle button {
  border-radius: 0; border-right: none; flex: 1; white-space: nowrap; font-size: 0.8em; padding: 8px 10px;
}
.metric-toggle button:last-child { border-right: 1px solid var(--border); }

/* Results */
.results-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
.results-table th, .results-table td {
  padding: 8px 10px; text-align: left; border-bottom: 1px solid var(--border); font-size: 0.85em;
}
.results-table th { color: var(--muted); font-weight: 500; font-size: 0.75em; text-transform: uppercase; }
.results-table tr:hover { background: rgba(88,166,255,0.04); }
.score { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.85em; }
.rank { color: var(--muted); width: 30px; }
.fund-style { color: var(--muted); font-size: 0.8em; }

/* Radar chart */
.radar-container { display: flex; flex-wrap: wrap; gap: 16px; margin: 16px 0; justify-content: center; }
.radar-box {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 12px; text-align: center; flex: 1; min-width: 280px; max-width: 460px;
}
.radar-box h3 { font-size: 0.85em; color: var(--muted); margin-bottom: 8px; }
svg.radar { width: 100%; max-width: 400px; }

/* Vector detail */
.vector-detail {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 12px; margin-top: 12px; overflow-x: auto;
}
.dim-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 4px; }
.dim-item {
  display: flex; justify-content: space-between; padding: 3px 6px;
  border-radius: 4px; font-size: 0.78em; font-family: monospace;
}
.dim-item .label { color: var(--muted); }
.dim-item .val { color: var(--accent); }
.dim-bar {
  position: absolute; left: 0; bottom: 0; height: 2px;
  background: var(--accent); border-radius: 1px; transition: width 0.3s;
}
.dim-item { position: relative; }

/* Category header */
.cat-header {
  grid-column: 1 / -1; color: var(--accent3); font-size: 0.75em;
  font-weight: 600; text-transform: uppercase; padding: 6px 0 2px; border-bottom: 1px solid var(--border);
}

/* Custom vector */
.custom-panel {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 12px; margin-bottom: 16px; display: none;
}
.custom-panel.open { display: block; }
.slider-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 6px; }
.slider-row { display: flex; align-items: center; gap: 6px; font-size: 0.78em; }
.slider-row label { width: 70px; color: var(--muted); flex-shrink: 0; text-align: right; }
.slider-row input[type=range] { flex: 1; accent-color: var(--accent); }
.slider-row .sval { width: 36px; text-align: right; font-family: monospace; color: var(--accent); }

/* Info bar */
.info-bar {
  display: flex; flex-wrap: wrap; gap: 12px; padding: 8px 12px;
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
  margin-bottom: 12px; font-size: 0.8em; color: var(--muted);
}
.info-bar strong { color: var(--text); }

/* Key insight */
.insight {
  background: rgba(88,166,255,0.06); border: 1px solid rgba(88,166,255,0.2);
  border-radius: var(--radius); padding: 10px 14px; margin: 12px 0; font-size: 0.85em;
}
.insight .title { color: var(--accent); font-weight: 600; margin-bottom: 4px; }

/* Upload bar */
.upload-bar {
  display: flex; align-items: center; gap: 8px; padding: 8px 12px;
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
  margin-bottom: 12px;
}
.upload-bar label {
  display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px;
  background: #21262d; border: 1px solid var(--border); border-radius: var(--radius);
  color: var(--text); font-size: 0.85em; cursor: pointer; white-space: nowrap;
}
.upload-bar label:hover { background: #30363d; }
.upload-bar label:active { background: var(--accent); color: #0d1117; }
.upload-bar input[type=file] { display: none; }
.upload-bar .upload-status { color: var(--muted); font-size: 0.8em; flex: 1; }
.upload-bar .upload-status.loaded { color: var(--accent2); }

/* Drag-drop overlay (desktop bonus) */
.drop-overlay {
  position: fixed; inset: 0; background: rgba(88,166,255,0.1);
  border: 3px dashed var(--accent); display: none; z-index: 100;
  justify-content: center; align-items: center; font-size: 1.4em; color: var(--accent);
}
.drop-overlay.show { display: flex; }

/* Tabs */
.tabs { display: flex; gap: 0; margin-bottom: 16px; }
.tab {
  padding: 8px 16px; border: 1px solid var(--border); background: var(--surface);
  color: var(--muted); cursor: pointer; font-size: 0.85em;
}
.tab:first-child { border-radius: var(--radius) 0 0 var(--radius); }
.tab:last-child { border-radius: 0 var(--radius) var(--radius) 0; }
.tab.active { background: var(--accent); color: #0d1117; border-color: var(--accent); font-weight: 600; }

.holdings-list { font-size: 0.8em; color: var(--muted); }
.holdings-list span { color: var(--text); }

@media (max-width: 600px) {
  body { padding: 8px; }
  h1 { font-size: 1.1em; }
  .controls { flex-direction: column; }
  select { min-width: auto; }
  .dim-grid { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); }
  .slider-grid { grid-template-columns: 1fr; }
  .metric-toggle button { font-size: 0.7em; padding: 6px 8px; }
}
</style>
</head>
<body>
<div class="container">
  <h1>Portfolio Vector Explorer</h1>
  <div class="subtitle">
    Interactive query interface for 32-dimensional portfolio similarity vectors
    <br>Powered by <strong>agentdb / RVFOptimizer</strong> | Data: SEC EDGAR 13F-HR (Q4 2024)
  </div>

  <div class="info-bar">
    <span><strong>${rvf.vectors.length}</strong> portfolios</span>
    <span><strong>${rvf.schema.dimensions}</strong> dimensions</span>
    <span><strong>3</strong> distance metrics</span>
    <span>Period: <strong>${rvf.reportingPeriod}</strong></span>
    <span>Format: <strong>RVF v${rvf.version}</strong></span>
  </div>

  <div class="upload-bar">
    <label>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M7.5 1a.5.5 0 0 1 .5.5V6h4.5a.5.5 0 0 1 .354.854l-5 5a.5.5 0 0 1-.708 0l-5-5A.5.5 0 0 1 2.5 6H7V1.5A.5.5 0 0 1 7.5 1z" transform="rotate(180 8 8)"/><path d="M1 12.5A.5.5 0 0 1 1.5 12h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5z"/></svg>
      Load .rvf file
      <input type="file" accept=".rvf,.json" id="rvf-upload" onchange="handleUpload(this)">
    </label>
    <span class="upload-status" id="upload-status">Using embedded data (${rvf.vectors.length} portfolios)</span>
  </div>

  <div class="tabs">
    <div class="tab active" onclick="setTab('fund')">Find Similar Fund</div>
    <div class="tab" onclick="setTab('custom')">Custom Vector Query</div>
  </div>

  <div id="fund-tab">
    <div class="controls">
      <select id="fund-select" onchange="search()">
        ${rvf.vectors.map((v, i) => `<option value="${i}">${v.name} — ${v.style}</option>`).join('\n        ')}
      </select>
    </div>
  </div>

  <div id="custom-tab" style="display:none">
    <div class="custom-panel open" id="custom-panel">
      <div class="slider-grid" id="slider-grid"></div>
      <div style="margin-top:8px; text-align:right;">
        <button onclick="resetSliders()">Reset All</button>
        <button onclick="searchCustom()" style="background:var(--accent);color:#0d1117;font-weight:600;">Search</button>
      </div>
    </div>
  </div>

  <div class="controls">
    <div class="metric-toggle">
      <button class="active" onclick="setMetric('cosine',this)">Cosine</button>
      <button onclick="setMetric('euclidean',this)">Euclidean</button>
      <button onclick="setMetric('dotproduct',this)">Dot Product</button>
    </div>
  </div>

  <div id="insight"></div>

  <table class="results-table">
    <thead><tr>
      <th class="rank">#</th><th>Fund</th><th>Style</th>
      <th>Cosine</th><th>Euclid</th><th>DotProd</th>
    </tr></thead>
    <tbody id="results-body"></tbody>
  </table>

  <h2>Vector Comparison</h2>
  <div class="radar-container" id="radar-container"></div>

  <h2>Query Vector Detail</h2>
  <div class="vector-detail">
    <div class="dim-grid" id="vector-detail"></div>
  </div>
</div>

<div class="drop-overlay" id="drop-overlay">Drop .rvf file to load</div>

<script>
// ===== Embedded RVF Data =====
const RVF = ${dataJSON};

// ===== State =====
let currentMetric = 'cosine';
let currentTab = 'fund';
let queryVector = null;
let queryName = '';
let excludeIdx = -1;

// ===== Distance Metrics =====
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d > 0 ? dot / d : 0;
}
function euclidean(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i]-b[i]; s += d*d; }
  return Math.sqrt(s);
}
function dotProduct(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i]*b[i];
  return s;
}

// ===== Search =====
function search() {
  const idx = +document.getElementById('fund-select').value;
  const fund = RVF.vectors[idx];
  queryVector = fund.vector;
  queryName = fund.name;
  excludeIdx = idx;
  runSearch();
}

function searchCustom() {
  const sliders = document.querySelectorAll('#slider-grid input[type=range]');
  queryVector = new Array(32).fill(0);
  sliders.forEach(s => { queryVector[+s.dataset.dim] = +s.value; });
  queryName = 'Custom Query';
  excludeIdx = -1;
  runSearch();
}

function runSearch() {
  const results = RVF.vectors.map((v, i) => ({
    idx: i, name: v.name, style: v.style,
    cosine: cosine(queryVector, v.vector),
    euclidean: euclidean(queryVector, v.vector),
    dotproduct: dotProduct(queryVector, v.vector),
    meta: v.metadata,
  })).filter((_, i) => i !== excludeIdx);

  // Sort by current metric
  if (currentMetric === 'euclidean') results.sort((a,b) => a.euclidean - b.euclidean);
  else if (currentMetric === 'dotproduct') results.sort((a,b) => b.dotproduct - a.dotproduct);
  else results.sort((a,b) => b.cosine - a.cosine);

  renderResults(results);
  renderInsight(results);
  renderRadar(results.slice(0, 3));
  renderVectorDetail();
}

function renderResults(results) {
  const tbody = document.getElementById('results-body');
  tbody.innerHTML = results.map((r, i) => {
    const topH = r.meta.topHoldings ? r.meta.topHoldings.slice(0,3).map(h=>h.ticker).join(', ') : '';
    const bold = (metric) => metric === currentMetric ? 'font-weight:600;color:var(--accent)' : '';
    return \`<tr>
      <td class="rank">\${i+1}</td>
      <td>\${r.name}<br><span class="holdings-list">Top: <span>\${topH}</span></span></td>
      <td class="fund-style">\${r.style}</td>
      <td class="score" style="\${bold('cosine')}">\${r.cosine.toFixed(4)}</td>
      <td class="score" style="\${bold('euclidean')}">\${r.euclidean.toFixed(4)}</td>
      <td class="score" style="\${bold('dotproduct')}">\${r.dotproduct.toFixed(4)}</td>
    </tr>\`;
  }).join('');
}

function renderInsight(results) {
  const cosSorted = [...results].sort((a,b) => b.cosine - a.cosine);
  const eucSorted = [...results].sort((a,b) => a.euclidean - b.euclidean);
  const dotSorted = [...results].sort((a,b) => b.dotproduct - a.dotproduct);
  const c = cosSorted[0]?.name, e = eucSorted[0]?.name, d = dotSorted[0]?.name;
  const el = document.getElementById('insight');
  if (c === e && e === d) {
    el.innerHTML = \`<div class="insight"><div class="title">All metrics agree</div>
      <strong>\${c}</strong> is the most similar fund by style, absolute distance, and magnitude-weighted alignment.</div>\`;
  } else {
    el.innerHTML = \`<div class="insight"><div class="title">Metrics disagree — revealing different facets of similarity</div>
      <strong>Cosine:</strong> \${c} (best style match) &nbsp;
      <strong>Euclidean:</strong> \${e} (closest overall) &nbsp;
      <strong>Dot Product:</strong> \${d} (largest aligned fund)</div>\`;
  }
}

// ===== Radar Chart (SVG) =====
function renderRadar(topResults) {
  const container = document.getElementById('radar-container');
  // Sector radar (dims 0-10)
  const sectorDims = RVF.schema.categories[0].dims;
  container.innerHTML = \`
    <div class="radar-box">
      <h3>Sector Allocation</h3>
      \${buildRadarSVG(sectorDims, queryVector, topResults, 'sector')}
    </div>
    <div class="radar-box">
      <h3>Fund Characteristics</h3>
      \${buildRadarSVG([
        ...RVF.schema.categories[1].dims.slice(0,4),
        ...RVF.schema.categories[2].dims.slice(0,3),
        ...RVF.schema.categories[3].dims.slice(3,7),
      ], queryVector, topResults, 'chars')}
    </div>
  \`;
}

function buildRadarSVG(dims, qv, topResults, id) {
  const n = dims.length;
  const cx = 180, cy = 180, R = 140;
  const colors = ['var(--accent)', 'var(--accent2)', 'var(--warn)'];

  let svg = \`<svg class="radar" viewBox="0 0 360 360" xmlns="http://www.w3.org/2000/svg">\`;

  // Grid circles
  for (let r = 0.25; r <= 1; r += 0.25) {
    svg += \`<circle cx="\${cx}" cy="\${cy}" r="\${R*r}" fill="none" stroke="var(--border)" stroke-width="0.5"/>\`;
  }

  // Axis lines + labels
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
    const x = cx + Math.cos(angle) * R;
    const y = cy + Math.sin(angle) * R;
    svg += \`<line x1="\${cx}" y1="\${cy}" x2="\${x}" y2="\${y}" stroke="var(--border)" stroke-width="0.5"/>\`;
    const lx = cx + Math.cos(angle) * (R + 18);
    const ly = cy + Math.sin(angle) * (R + 18);
    svg += \`<text x="\${lx}" y="\${ly}" text-anchor="middle" dominant-baseline="middle" fill="var(--muted)" font-size="8">\${dims[i].short}</text>\`;
  }

  // Plot function
  function plotPoly(vector, color, opacity, width) {
    const points = dims.map((d, i) => {
      const val = Math.min(vector[d.idx], 1);
      const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
      return \`\${cx + Math.cos(angle) * R * val},\${cy + Math.sin(angle) * R * val}\`;
    }).join(' ');
    svg += \`<polygon points="\${points}" fill="\${color}" fill-opacity="\${opacity}" stroke="\${color}" stroke-width="\${width}"/>\`;
  }

  // Query vector (filled)
  plotPoly(qv, 'var(--accent)', 0.15, 2);

  // Top results (outlines only)
  topResults.forEach((r, i) => {
    plotPoly(RVF.vectors[r.idx].vector, colors[i] || colors[0], 0, 1.2);
  });

  // Legend
  svg += \`<text x="8" y="16" fill="var(--accent)" font-size="9" font-weight="600">\${queryName}</text>\`;
  topResults.forEach((r, i) => {
    svg += \`<text x="8" y="\${28 + i*12}" fill="\${colors[i]}" font-size="8">\${r.name}</text>\`;
  });

  svg += '</svg>';
  return svg;
}

// ===== Vector Detail =====
function renderVectorDetail() {
  const el = document.getElementById('vector-detail');
  let html = '';
  for (const cat of RVF.schema.categories) {
    html += \`<div class="cat-header">\${cat.name}</div>\`;
    for (const dim of cat.dims) {
      const val = queryVector[dim.idx];
      const pct = Math.min(val * 100, 100);
      html += \`<div class="dim-item">
        <span class="label">\${dim.short}</span>
        <span class="val">\${val.toFixed(3)}</span>
        <span class="dim-bar" style="width:\${pct}%"></span>
      </div>\`;
    }
  }
  el.innerHTML = html;
}

// ===== UI Controls =====
function setMetric(metric, btn) {
  currentMetric = metric;
  document.querySelectorAll('.metric-toggle button').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (queryVector) runSearch();
}

function setTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  if (tab === 'fund') {
    document.querySelectorAll('.tab')[0].classList.add('active');
    document.getElementById('fund-tab').style.display = '';
    document.getElementById('custom-tab').style.display = 'none';
    search();
  } else {
    document.querySelectorAll('.tab')[1].classList.add('active');
    document.getElementById('fund-tab').style.display = 'none';
    document.getElementById('custom-tab').style.display = '';
    searchCustom();
  }
}

// ===== Custom Vector Sliders =====
function buildSliders() {
  const grid = document.getElementById('slider-grid');
  let html = '';
  for (const cat of RVF.schema.categories) {
    html += \`<div class="cat-header" style="grid-column:1/-1">\${cat.name}</div>\`;
    for (const dim of cat.dims) {
      const defVal = dim.idx < 11 ? (1/11).toFixed(2) : '0.50';
      html += \`<div class="slider-row">
        <label>\${dim.short}</label>
        <input type="range" min="0" max="1" step="0.01" value="\${defVal}" data-dim="\${dim.idx}"
               oninput="this.nextElementSibling.textContent=parseFloat(this.value).toFixed(2)">
        <span class="sval">\${defVal}</span>
      </div>\`;
    }
  }
  grid.innerHTML = html;
}

function resetSliders() {
  document.querySelectorAll('#slider-grid input[type=range]').forEach(s => {
    const v = +s.dataset.dim < 11 ? (1/11).toFixed(2) : '0.50';
    s.value = v;
    s.nextElementSibling.textContent = v;
  });
}

// ===== RVF File Loading =====
function loadRVF(file) {
  const status = document.getElementById('upload-status');
  status.textContent = 'Loading ' + file.name + '...';
  status.className = 'upload-status';

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const newRvf = JSON.parse(reader.result);
      if (!newRvf.vectors || !Array.isArray(newRvf.vectors) || newRvf.vectors.length === 0) {
        throw new Error('No vectors found in file');
      }
      // Validate first vector has expected structure
      const v0 = newRvf.vectors[0];
      if (!v0.vector || !Array.isArray(v0.vector)) {
        throw new Error('Invalid vector format');
      }
      Object.assign(RVF, newRvf);
      rebuildUI();
      status.textContent = 'Loaded ' + file.name + ' (' + newRvf.vectors.length + ' portfolios)';
      status.className = 'upload-status loaded';
    } catch(err) {
      status.textContent = 'Error: ' + err.message;
      status.className = 'upload-status';
      status.style.color = 'var(--danger)';
    }
  };
  reader.onerror = () => {
    status.textContent = 'Failed to read file';
    status.className = 'upload-status';
    status.style.color = 'var(--danger)';
  };
  reader.readAsText(file);
}

// Upload button handler
function handleUpload(input) {
  const file = input.files[0];
  if (file) loadRVF(file);
  input.value = ''; // allow re-uploading same file
}

// Drag & drop (desktop bonus, also feeds into loadRVF)
const overlay = document.getElementById('drop-overlay');
document.addEventListener('dragover', e => { e.preventDefault(); overlay.classList.add('show'); });
document.addEventListener('dragleave', e => { if (e.relatedTarget === null) overlay.classList.remove('show'); });
document.addEventListener('drop', e => {
  e.preventDefault(); overlay.classList.remove('show');
  const file = e.dataTransfer.files[0];
  if (file) loadRVF(file);
});

function rebuildUI() {
  // Update info bar
  const infoBar = document.querySelector('.info-bar');
  if (infoBar) {
    infoBar.innerHTML = \`
      <span><strong>\${RVF.vectors.length}</strong> portfolios</span>
      <span><strong>\${RVF.schema?.dimensions || RVF.vectors[0]?.vector?.length || '?'}</strong> dimensions</span>
      <span><strong>3</strong> distance metrics</span>
      \${RVF.reportingPeriod ? \`<span>Period: <strong>\${RVF.reportingPeriod}</strong></span>\` : ''}
      <span>Format: <strong>RVF v\${RVF.version || '?'}</strong></span>
    \`;
  }
  // Rebuild fund selector
  const sel = document.getElementById('fund-select');
  sel.innerHTML = RVF.vectors.map((v, i) =>
    \`<option value="\${i}">\${v.name} — \${v.style || 'Unknown'}</option>\`
  ).join('');
  buildSliders();
  search();
}

// ===== Init =====
buildSliders();
search();
</script>
</body>
</html>`;
}

// Portfolio Similarity Engine - Multi-Metric ruvector Demo
// ========================================================
//
// Demonstrates how three different distance metrics (Cosine, Euclidean, DotProduct)
// produce fundamentally different answers to "which portfolios are similar?"
//
// Data Source: SEC EDGAR 13F-HR Filings (Public Domain)
// Each institutional investor managing >$100M must file quarterly disclosures.
//
// EDGAR API (no key required):
//   Submissions: https://data.sec.gov/submissions/CIK{paddedCik}.json
//   13F XML:     https://www.sec.gov/Archives/edgar/data/{cik}/{accession}/{infotable}
//   Bulk data:   https://www.sec.gov/data-research/sec-markets-data/form-13f-data-sets
//
// Usage: node research/portfolio-similarity-engine.mjs

import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Section 1: ruvector Import (with graceful fallback)
// ---------------------------------------------------------------------------

let VectorDB;
try {
    const require = createRequire(import.meta.url);
    ({ VectorDb: VectorDB } = require('../index.cjs'));
} catch {
    // ruvector native module not available — use in-memory simulation
    // This preserves the full demo experience without the native dependency
    VectorDB = null;
}

// ---------------------------------------------------------------------------
// Section 2: Load Bundled Data
// ---------------------------------------------------------------------------

const cusipData = JSON.parse(readFileSync(join(__dirname, 'data/cusip-sector-map.json'), 'utf-8'));
const holdingsData = JSON.parse(readFileSync(join(__dirname, 'data/portfolio-holdings.json'), 'utf-8'));

const CUSIP_MAP = cusipData.securities;
const PORTFOLIOS = holdingsData.portfolios;

const GICS_SECTORS = [
    'Information Technology',   // dim 0
    'Health Care',              // dim 1
    'Financials',               // dim 2
    'Consumer Discretionary',   // dim 3
    'Communication Services',   // dim 4
    'Industrials',              // dim 5
    'Consumer Staples',         // dim 6
    'Energy',                   // dim 7
    'Utilities',                // dim 8
    'Real Estate',              // dim 9
    'Materials',                // dim 10
];

// Mega-cap tech CUSIPs for dimension 28 (Tech Mega-Cap Exposure)
const MEGA_TECH_CUSIPS = new Set([
    '037833100', // AAPL
    '594918104', // MSFT
    '02079K305', // GOOGL
    '02079K107', // GOOG
    '023135106', // AMZN
    '67066G104', // NVDA
    '30303M102', // META
]);

// ---------------------------------------------------------------------------
// Section 3: 32-Dimension Vector Construction
// ---------------------------------------------------------------------------
//
// Category A (dims 0-10):  Sector Allocation — % in each of 11 GICS sectors
// Category B (dims 11-17): Concentration — HHI, top-N weights, breadth
// Category C (dims 18-24): Style & Size — cap size, value, growth tilt
// Category D (dims 25-31): Behavioral — options, discretion, defensive/cyclical
//

function buildPortfolioVector(portfolio) {
    const vector = new Float64Array(32);

    // Separate equity holdings from options
    const equityHoldings = [];
    let putCount = 0;
    let callCount = 0;
    let soleCount = 0;
    let dfndCount = 0;

    for (const h of portfolio.holdings) {
        const type = (h.type || 'SH').toUpperCase();
        if (type === 'PUT') { putCount++; continue; }
        if (type === 'CALL') { callCount++; continue; }
        equityHoldings.push(h);

        const disc = (h.investmentDiscretion || 'SOLE').toUpperCase();
        if (disc === 'SOLE') soleCount++;
        else dfndCount++;
    }

    if (equityHoldings.length === 0) return vector;

    const totalValue = equityHoldings.reduce((s, h) => s + h.value, 0);
    if (totalValue === 0) return vector;

    // --- Category A: Sector Allocation (dims 0-10) ---
    const sectorValues = new Float64Array(11);
    let megaTechValue = 0;

    for (const h of equityHoldings) {
        const security = CUSIP_MAP[h.cusip];
        const weight = h.value / totalValue;

        if (security) {
            const sectorIdx = GICS_SECTORS.indexOf(security.sector);
            if (sectorIdx >= 0) sectorValues[sectorIdx] += h.value;
        }
        // Unmapped CUSIPs are implicitly "Other" — they don't contribute to any sector dim

        if (MEGA_TECH_CUSIPS.has(h.cusip)) {
            megaTechValue += h.value;
        }
    }

    for (let i = 0; i < 11; i++) {
        vector[i] = sectorValues[i] / totalValue;
    }

    // --- Category B: Concentration Metrics (dims 11-17) ---
    const weights = equityHoldings.map(h => h.value / totalValue).sort((a, b) => b - a);
    const n = weights.length;

    // Top 1, 5, 10 holding weight
    vector[11] = weights[0] || 0;
    vector[12] = weights.slice(0, 5).reduce((s, w) => s + w, 0);
    vector[13] = weights.slice(0, 10).reduce((s, w) => s + w, 0);

    // Herfindahl-Hirschman Index (sum of squared weights)
    const hhi = weights.reduce((s, w) => s + w * w, 0);
    vector[14] = hhi;

    // Number of holdings (log-normalized, max ~5000 for largest quant funds)
    vector[15] = Math.log(n + 1) / Math.log(5000);

    // Effective N = 1/HHI, normalized by actual N
    const effectiveN = hhi > 0 ? 1 / hhi : n;
    vector[16] = Math.min(effectiveN / Math.max(n, 1), 1.0);

    // Sector HHI (concentration across sectors)
    const sectorWeights = Array.from(sectorValues).map(v => v / totalValue);
    vector[17] = sectorWeights.reduce((s, w) => s + w * w, 0);

    // --- Category C: Style & Size Factors (dims 18-24) ---
    // Cap size: classify by individual position value as proxy
    // mega/large > $500M per position, mid $50M-$500M, small < $50M (in thousands)
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

    // Portfolio total value (log-normalized against $1T max)
    vector[21] = Math.min(Math.log10(totalValue + 1) / Math.log10(1e9), 1.0);

    // Average position size (log-normalized)
    const avgPosition = totalValue / n;
    vector[22] = Math.min(Math.log10(avgPosition + 1) / Math.log10(1e7), 1.0);

    // Growth vs Value tilt: (Tech + CommServices + ConsDisc) vs total
    const growthSectors = (sectorValues[0] + sectorValues[4] + sectorValues[3]) / totalValue;
    vector[23] = Math.min(growthSectors, 1.0);

    // Domestic vs International (13F is US-only, so this is always 1.0)
    vector[24] = 1.0;

    // --- Category D: Behavioral / Structural (dims 25-31) ---
    const totalEntries = portfolio.holdings.length;

    // Put/Call ratio (fraction of all entries that are options)
    vector[25] = (putCount + callCount) / Math.max(totalEntries, 1);

    // Sole vs shared discretion
    const totalDisc = soleCount + dfndCount;
    vector[26] = totalDisc > 0 ? soleCount / totalDisc : 1.0;
    vector[27] = totalDisc > 0 ? dfndCount / totalDisc : 0.0;

    // Tech mega-cap exposure
    vector[28] = megaTechValue / totalValue;

    // Defensive tilt: (Staples + Utilities + Healthcare) / total
    vector[29] = (sectorValues[6] + sectorValues[8] + sectorValues[1]) / totalValue;

    // Cyclical tilt: (Discretionary + Industrials + Materials + Energy) / total
    vector[30] = (sectorValues[3] + sectorValues[5] + sectorValues[10] + sectorValues[7]) / totalValue;

    // Position equality score (inverse Gini coefficient)
    // Gini = (2 * sum(i * w_i)) / (n * sum(w_i)) - (n+1)/n
    // For perfectly equal weights, Gini = 0, so equality = 1.0
    if (n > 1) {
        const sortedAsc = [...weights].sort((a, b) => a - b);
        const sumW = sortedAsc.reduce((s, w) => s + w, 0);
        let giniNumerator = 0;
        for (let i = 0; i < n; i++) {
            giniNumerator += (i + 1) * sortedAsc[i];
        }
        const gini = (2 * giniNumerator) / (n * sumW) - (n + 1) / n;
        vector[31] = 1.0 - Math.min(Math.max(gini, 0), 1.0);
    } else {
        vector[31] = 1.0;
    }

    return vector;
}

// ---------------------------------------------------------------------------
// Section 4: In-Memory Vector Store (fallback when ruvector unavailable)
// ---------------------------------------------------------------------------

class InMemoryVectorDB {
    constructor(config) {
        this.dimensions = config.dimensions;
        this.metric = config.distanceMetric;
        this.entries = [];
    }

    async insert(entry) {
        this.entries.push({
            id: entry.id,
            vector: Array.from(entry.vector),
            metadata: typeof entry.metadata === 'string' ? JSON.parse(entry.metadata) : entry.metadata,
        });
    }

    async insertBatch(entries) {
        for (const e of entries) await this.insert(e);
    }

    async search({ vector, k }) {
        const qv = Array.from(vector);
        const scored = this.entries.map(entry => ({
            ...entry,
            score: this._computeScore(qv, entry.vector),
        }));

        // Sort: cosine/dotproduct higher=better, euclidean lower=better
        if (this.metric === 'Euclidean') {
            scored.sort((a, b) => a.score - b.score);
        } else {
            scored.sort((a, b) => b.score - a.score);
        }

        return scored.slice(0, k);
    }

    _computeScore(a, b) {
        switch (this.metric) {
            case 'Cosine': return this._cosine(a, b);
            case 'Euclidean': return this._euclidean(a, b);
            case 'DotProduct': return this._dotProduct(a, b);
            default: return this._cosine(a, b);
        }
    }

    _cosine(a, b) {
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        const denom = Math.sqrt(normA) * Math.sqrt(normB);
        return denom > 0 ? dot / denom : 0;
    }

    _euclidean(a, b) {
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            const d = a[i] - b[i];
            sum += d * d;
        }
        return Math.sqrt(sum);
    }

    _dotProduct(a, b) {
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            sum += a[i] * b[i];
        }
        return sum;
    }
}

// ---------------------------------------------------------------------------
// Section 5: Database Initialization
// ---------------------------------------------------------------------------

function createDb(distanceMetric) {
    if (VectorDB) {
        return new VectorDB({
            dimensions: 32,
            distanceMetric,
            storagePath: `./portfolio-${distanceMetric.toLowerCase()}.db`,
        });
    }
    return new InMemoryVectorDB({ dimensions: 32, distanceMetric });
}

// ---------------------------------------------------------------------------
// Section 6: Data Ingestion
// ---------------------------------------------------------------------------

async function ingestPortfolios(dbs) {
    const vectors = new Map();

    for (const portfolio of PORTFOLIOS) {
        const vector = buildPortfolioVector(portfolio);
        vectors.set(portfolio.cik, vector);

        const equityHoldings = portfolio.holdings.filter(h => {
            const t = (h.type || 'SH').toUpperCase();
            return t !== 'PUT' && t !== 'CALL';
        });
        const totalValue = equityHoldings.reduce((s, h) => s + h.value, 0);
        const topHolding = equityHoldings.sort((a, b) => b.value - a.value)[0];
        const topSecurity = topHolding ? CUSIP_MAP[topHolding.cusip] : null;

        const metadata = JSON.stringify({
            fundName: portfolio.fundName,
            cik: portfolio.cik,
            filingDate: portfolio.filingDate,
            reportDate: portfolio.reportDate,
            totalValueUsd: totalValue * 1000, // 13F reports in thousands
            holdingsCount: equityHoldings.length,
            topHolding: topSecurity ? topSecurity.ticker : topHolding?.nameOfIssuer || 'N/A',
            topHoldingWeight: topHolding ? (topHolding.value / totalValue) : 0,
            fundStyle: portfolio.fundStyle,
        });

        const entry = { id: portfolio.cik, vector, metadata };

        for (const db of Object.values(dbs)) {
            await db.insert(entry);
        }
    }

    return vectors;
}

// ---------------------------------------------------------------------------
// Section 7: Query Demonstrations
// ---------------------------------------------------------------------------

async function runQueries(dbs, vectors) {
    const queries = [];

    // Query 1: "Find funds similar to Berkshire Hathaway"
    const berkshireVector = vectors.get('0001067983');
    if (berkshireVector) {
        queries.push({
            name: 'Funds Similar to Berkshire Hathaway',
            description: 'Berkshire is a concentrated value fund with 48% in Apple. Who else invests like Warren Buffett?',
            vector: berkshireVector,
            k: 6,
            excludeCik: '0001067983',
        });
    }

    // Query 2: Synthetic tech-heavy growth portfolio
    const techGrowthVector = new Float64Array(32);
    techGrowthVector[0] = 0.65;  // 65% tech
    techGrowthVector[4] = 0.15;  // 15% comm services
    techGrowthVector[3] = 0.10;  // 10% consumer disc
    techGrowthVector[1] = 0.05;  // 5% healthcare
    techGrowthVector[2] = 0.05;  // 5% financials
    techGrowthVector[11] = 0.15; // top holding 15%
    techGrowthVector[12] = 0.55; // top 5 = 55%
    techGrowthVector[13] = 0.80; // top 10 = 80%
    techGrowthVector[14] = 0.06; // moderate HHI
    techGrowthVector[15] = 0.35; // ~15 holdings
    techGrowthVector[16] = 0.70; // fairly distributed
    techGrowthVector[17] = 0.45; // tech-heavy sector concentration
    techGrowthVector[18] = 0.90; // mostly large cap
    techGrowthVector[19] = 0.08; // some mid cap
    techGrowthVector[20] = 0.02; // tiny small cap
    techGrowthVector[21] = 0.55; // medium-sized fund
    techGrowthVector[22] = 0.65; // decent position sizes
    techGrowthVector[23] = 0.90; // very growth-tilted
    techGrowthVector[24] = 1.0;  // domestic
    techGrowthVector[25] = 0.0;  // no options
    techGrowthVector[26] = 1.0;  // sole discretion
    techGrowthVector[27] = 0.0;
    techGrowthVector[28] = 0.55; // heavy mega-tech
    techGrowthVector[29] = 0.05; // minimal defensive
    techGrowthVector[30] = 0.10; // minimal cyclical
    techGrowthVector[31] = 0.65; // moderate equality

    queries.push({
        name: 'Synthetic Tech-Heavy Growth Portfolio',
        description: 'A hypothetical portfolio with 65% tech allocation. Which real funds match this growth thesis?',
        vector: techGrowthVector,
        k: 5,
        excludeCik: null,
    });

    // Query 3: Perfectly diversified portfolio (even allocation)
    const diversifiedVector = new Float64Array(32);
    for (let i = 0; i < 11; i++) diversifiedVector[i] = 1.0 / 11; // equal sector weights
    diversifiedVector[11] = 0.02;  // tiny top holding
    diversifiedVector[12] = 0.10;  // top 5 = 10%
    diversifiedVector[13] = 0.20;  // top 10 = 20%
    diversifiedVector[14] = 0.002; // very low HHI
    diversifiedVector[15] = 0.80;  // many holdings
    diversifiedVector[16] = 0.95;  // very equal
    diversifiedVector[17] = 0.09;  // equal sectors => 1/11 each
    diversifiedVector[18] = 0.60;  // mixed cap
    diversifiedVector[19] = 0.30;
    diversifiedVector[20] = 0.10;
    diversifiedVector[21] = 0.70;
    diversifiedVector[22] = 0.40;
    diversifiedVector[23] = 0.33;  // balanced growth/value
    diversifiedVector[24] = 1.0;
    diversifiedVector[25] = 0.0;
    diversifiedVector[26] = 1.0;
    diversifiedVector[27] = 0.0;
    diversifiedVector[28] = 0.15;
    diversifiedVector[29] = 0.27;
    diversifiedVector[30] = 0.27;
    diversifiedVector[31] = 0.90;

    queries.push({
        name: 'Perfectly Diversified Portfolio',
        description: 'Equal allocation across all 11 GICS sectors. Which real fund comes closest to true diversification?',
        vector: diversifiedVector,
        k: 5,
        excludeCik: null,
    });

    // Query 4: Energy sector heavy bet
    const energyVector = new Float64Array(32);
    energyVector[7] = 0.70;   // 70% energy
    energyVector[5] = 0.10;   // 10% industrials
    energyVector[10] = 0.08;  // 8% materials
    energyVector[2] = 0.07;   // 7% financials
    energyVector[6] = 0.05;   // 5% staples
    energyVector[11] = 0.20;  // concentrated top holding
    energyVector[12] = 0.65;
    energyVector[13] = 0.85;
    energyVector[14] = 0.10;
    energyVector[15] = 0.30;
    energyVector[16] = 0.50;
    energyVector[17] = 0.52;  // very sector-concentrated
    energyVector[18] = 0.80;
    energyVector[19] = 0.15;
    energyVector[20] = 0.05;
    energyVector[21] = 0.45;
    energyVector[22] = 0.55;
    energyVector[23] = 0.10;  // very value-oriented
    energyVector[24] = 1.0;
    energyVector[25] = 0.0;
    energyVector[26] = 1.0;
    energyVector[27] = 0.0;
    energyVector[28] = 0.0;   // zero mega-tech
    energyVector[29] = 0.05;
    energyVector[30] = 0.88;  // very cyclical
    energyVector[31] = 0.55;

    queries.push({
        name: 'Energy Sector Concentration',
        description: 'A hypothetical portfolio betting 70% on energy. Which real funds have the most energy exposure?',
        vector: energyVector,
        k: 5,
        excludeCik: null,
    });

    // Query 5: "Find funds similar to Tiger Global (growth/tech)"
    const tigerVector = vectors.get('0001167483');
    if (tigerVector) {
        queries.push({
            name: 'Funds Similar to Tiger Global',
            description: 'Tiger Global is a growth/tech fund. Who else has a similar technology-forward portfolio?',
            vector: tigerVector,
            k: 6,
            excludeCik: '0001167483',
        });
    }

    return queries;
}

// ---------------------------------------------------------------------------
// Section 8: Results Display and Comparison
// ---------------------------------------------------------------------------

function pad(str, len, align = 'left') {
    str = String(str);
    if (str.length > len) str = str.substring(0, len - 1) + '.';
    return align === 'right' ? str.padStart(len) : str.padEnd(len);
}

function formatScore(score, metric) {
    if (metric === 'Cosine') return score.toFixed(4);
    if (metric === 'Euclidean') return score.toFixed(4);
    if (metric === 'DotProduct') return score.toFixed(4);
    return String(score);
}

async function displayQueryResults(queryDef, dbs) {
    console.log(`\n${'='.repeat(90)}`);
    console.log(`  QUERY: ${queryDef.name}`);
    console.log(`  ${queryDef.description}`);
    console.log('='.repeat(90));

    const metrics = ['Cosine', 'Euclidean', 'DotProduct'];
    const allResults = {};

    for (const metric of metrics) {
        const db = dbs[metric];
        let results = await db.search({ vector: queryDef.vector, k: queryDef.k + 1 });

        // Filter out the query fund itself if this is a real-fund query
        if (queryDef.excludeCik) {
            results = results.filter(r => {
                const meta = typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata;
                return meta.cik !== queryDef.excludeCik;
            });
        }
        allResults[metric] = results.slice(0, queryDef.k);
    }

    // Display side-by-side results for each metric
    for (const metric of metrics) {
        const results = allResults[metric];
        const sortLabel = metric === 'Euclidean' ? 'lower = more similar' : 'higher = more similar';

        console.log(`\n  ${metric} (${sortLabel}):`);
        console.log(`  ${'-'.repeat(76)}`);
        console.log(`  ${pad('Rank', 4)} ${pad('Fund Name', 35)} ${pad('Style', 22)} ${pad('Score', 10, 'right')}`);
        console.log(`  ${'-'.repeat(76)}`);

        results.forEach((r, i) => {
            const meta = typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata;
            console.log(`  ${pad(i + 1, 4)} ${pad(meta.fundName, 35)} ${pad(meta.fundStyle, 22)} ${pad(formatScore(r.score, metric), 10, 'right')}`);
        });
    }

    // Generate insight
    const cosineTop = allResults['Cosine'][0];
    const dotTop = allResults['DotProduct'][0];
    const eucTop = allResults['Euclidean'][0];

    const cosName = (typeof cosineTop?.metadata === 'string' ? JSON.parse(cosineTop.metadata) : cosineTop?.metadata)?.fundName;
    const dotName = (typeof dotTop?.metadata === 'string' ? JSON.parse(dotTop.metadata) : dotTop?.metadata)?.fundName;
    const eucName = (typeof eucTop?.metadata === 'string' ? JSON.parse(eucTop.metadata) : eucTop?.metadata)?.fundName;

    if (cosName && dotName && eucName) {
        console.log(`\n  KEY INSIGHT:`);
        if (cosName === dotName && dotName === eucName) {
            console.log(`  All three metrics agree: ${cosName} is the most similar fund.`);
            console.log(`  This means it matches in style, absolute allocation, AND scale.`);
        } else {
            console.log(`  Cosine  -> ${cosName} (most similar investment STYLE)`);
            console.log(`  Euclid  -> ${eucName} (most similar in absolute terms)`);
            console.log(`  DotProd -> ${dotName} (largest fund with alignment)`);
            if (cosName !== dotName) {
                console.log(`  The metrics disagree, revealing that "similarity" depends on what you measure.`);
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Section 9: Metric Education
// ---------------------------------------------------------------------------

function printMetricGuide() {
    console.log(`
${'='.repeat(90)}
  DISTANCE METRIC COMPARISON GUIDE
${'='.repeat(90)}

  COSINE SIMILARITY (range: -1.0 to 1.0, higher = more similar)
  ${'~'.repeat(60)}
  Measures the ANGLE between portfolio vectors.
  Ignores the magnitude (scale) of allocations.

  Best for: "Does this fund have the same investment STYLE as mine?"

  Example: A $1B fund and a $500B fund with identical 60/40 stock/bond
           splits will score 1.0 (perfectly similar). Size doesn't matter.

  Mathematically: cos(theta) = (A . B) / (||A|| * ||B||)

  EUCLIDEAN DISTANCE (range: 0.0 to infinity, lower = more similar)
  ${'~'.repeat(60)}
  Measures the straight-line DISTANCE between portfolio vectors.
  Sensitive to every absolute difference in every dimension.

  Best for: "How different is this fund from mine in every measurable way?"

  Example: Two funds both 50% tech, but one has 30% healthcare vs 10%.
           Euclidean captures this 20% gap precisely. Scale matters.

  Mathematically: d = sqrt(sum((a_i - b_i)^2))

  DOT PRODUCT (range: -inf to +inf, higher = more similar)
  ${'~'.repeat(60)}
  Measures both directional alignment AND magnitude.
  Larger portfolios with similar allocations score exponentially higher.

  Best for: "Which BIG fund most aligns with my investment thesis?"

  Example: A $500B index fund will always outscore a $1B fund with
           identical allocations because its scale amplifies the product.

  Mathematically: A . B = sum(a_i * b_i)
`);
}

function printVectorSchema() {
    console.log(`
  32-DIMENSION PORTFOLIO VECTOR SCHEMA
  ${'~'.repeat(50)}

  Category A: Sector Allocation (dims 0-10)
    [0]  Information Technology    [1]  Health Care
    [2]  Financials               [3]  Consumer Discretionary
    [4]  Communication Services   [5]  Industrials
    [6]  Consumer Staples         [7]  Energy
    [8]  Utilities                [9]  Real Estate
    [10] Materials

  Category B: Concentration (dims 11-17)
    [11] Top 1 Holding Weight     [12] Top 5 Holding Weight
    [13] Top 10 Holding Weight    [14] Herfindahl-Hirschman Index
    [15] # Holdings (log-norm)    [16] Effective N (norm)
    [17] Sector HHI

  Category C: Style & Size (dims 18-24)
    [18] Large Cap Weight         [19] Mid Cap Weight
    [20] Small Cap Weight         [21] Total Value (log-norm)
    [22] Avg Position Size        [23] Growth vs Value Tilt
    [24] Domestic Exposure

  Category D: Behavioral (dims 25-31)
    [25] Put/Call Ratio           [26] Sole Discretion %
    [27] Shared Discretion %      [28] Tech Mega-Cap Exposure
    [29] Defensive Tilt           [30] Cyclical Tilt
    [31] Position Equality (Gini)
`);
}

function printVectorSample(name, vector) {
    console.log(`  ${name}:`);
    const labels = [
        'Tech', 'Health', 'Finan', 'CDisc', 'Comms', 'Indus', 'Stapl', 'Enrgy',
        'Util', 'REst', 'Mater', 'Top1', 'Top5', 'Top10', 'HHI', '#Hold',
        'EffN', 'SecHHI', 'LgCap', 'MdCap', 'SmCap', 'TotVal', 'AvgPos', 'GrwVl',
        'Domst', 'Opts', 'Sole', 'Shared', 'MegaT', 'Defen', 'Cycl', 'Equal'
    ];
    let line = '  [';
    for (let i = 0; i < 32; i++) {
        if (i > 0 && i % 8 === 0) {
            line += ']\n  [';
        } else if (i > 0) {
            line += ', ';
        }
        line += `${labels[i]}:${vector[i].toFixed(3)}`;
    }
    line += ']';
    console.log(line);
    console.log('');
}

// ---------------------------------------------------------------------------
// Section 10: Main
// ---------------------------------------------------------------------------

async function main() {
    console.log('');
    console.log('='.repeat(90));
    console.log('  PORTFOLIO SIMILARITY ENGINE');
    console.log('  Multi-Metric ruvector Demonstration');
    console.log('  Data: SEC EDGAR 13F-HR Filings (Public Domain)');
    console.log('='.repeat(90));

    if (!VectorDB) {
        console.log('\n  NOTE: ruvector native module not found (index.cjs).');
        console.log('  Running with in-memory vector store (identical math, no HNSW indexing).\n');
    } else {
        console.log('\n  Using ruvector native HNSW engine.\n');
    }

    // Initialize three collections with different metrics
    const dbs = {
        Cosine: createDb('Cosine'),
        Euclidean: createDb('Euclidean'),
        DotProduct: createDb('DotProduct'),
    };

    console.log(`  Initialized 3 vector databases (Cosine, Euclidean, DotProduct)`);
    console.log(`  Dimensions: 32 per vector`);
    console.log(`  Portfolios: ${PORTFOLIOS.length} institutional investors\n`);

    // Ingest all portfolios
    console.log('  Ingesting portfolio vectors...');
    const vectors = await ingestPortfolios(dbs);
    console.log(`  Ingested ${vectors.size} portfolios into all 3 databases\n`);

    // Print vector schema
    printVectorSchema();

    // Show sample vectors for selected funds
    console.log('  SAMPLE VECTORS (selected funds):');
    console.log('  ' + '-'.repeat(76));
    for (const name of ['Berkshire Hathaway Inc', 'BlackRock Inc', 'Tiger Global Management LLC', 'Renaissance Technologies LLC']) {
        const portfolio = PORTFOLIOS.find(p => p.fundName === name);
        if (portfolio) {
            printVectorSample(name, vectors.get(portfolio.cik));
        }
    }

    // Run all query demonstrations
    const queryDefs = await runQueries(dbs, vectors);
    for (const queryDef of queryDefs) {
        await displayQueryResults(queryDef, dbs);
    }

    // Print educational guide
    printMetricGuide();

    // Summary statistics
    console.log('='.repeat(90));
    console.log('  SUMMARY');
    console.log('='.repeat(90));
    console.log(`  Total portfolios analyzed:  ${PORTFOLIOS.length}`);
    console.log(`  Vector dimensions:          32`);
    console.log(`  Distance metrics compared:  3 (Cosine, Euclidean, DotProduct)`);
    console.log(`  Query scenarios executed:   ${queryDefs.length}`);
    console.log(`  Data source:                SEC EDGAR 13F-HR filings`);
    console.log(`  Reporting period:           ${holdingsData._reportingPeriod}`);
    console.log(`  Backend:                    ${VectorDB ? 'ruvector HNSW' : 'In-memory (fallback)'}`);
    console.log('');
    console.log('  Each query demonstrates how the SAME portfolio data produces DIFFERENT');
    console.log('  similarity rankings depending on whether you measure by angle (Cosine),');
    console.log('  distance (Euclidean), or alignment-times-magnitude (DotProduct).');
    console.log('');
}

main().catch(console.error);

const express = require('express');
const cors = require('cors');
const https = require('https');
const path = require('path');
const { initDatabase } = require('./db');

// Load .env if present
try {
    const envPath = path.join(__dirname, '.env');
    const fs = require('fs');
    if (fs.existsSync(envPath)) {
        const lines = fs.readFileSync(envPath, 'utf8').split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, ...vals] = trimmed.split('=');
                process.env[key.trim()] = vals.join('=').trim();
            }
        }
    }
} catch (e) { /* no .env file, use environment variables */ }

const app = express();
app.use(cors());
app.use(express.json());

// Serve the frontend
app.use(express.static(path.join(__dirname, '..')));

// Initialize database
const db = initDatabase();

const PORT = process.env.PORT || 3000;
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'anthropic';

// --- LLM Integration ---

async function callLLM(systemPrompt, userMessage) {
    const provider = process.env.LLM_PROVIDER || 'anthropic';

    if (provider === 'gemini' && process.env.GEMINI_API_KEY) {
        return callGemini(systemPrompt, userMessage);
    } else if (process.env.ANTHROPIC_API_KEY) {
        return callClaude(systemPrompt, userMessage);
    } else {
        // Fallback to template-based responses
        return null;
    }
}

async function callClaude(systemPrompt, userMessage) {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
    });

    return response.content[0].text;
}

async function callGemini(systemPrompt, userMessage) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] }
    });

    return result.response.text();
}

function buildSystemPrompt(lang, dbContext) {
    const langInstruction = lang === 'hi'
        ? 'You MUST respond entirely in Hindi (Devanagari script). Use Hindi for all headings, advice, and explanations. Only keep technical terms, chemical names, and proper nouns in English where necessary.'
        : 'Respond in English. You may include Hindi terms in parentheses for common agricultural words to help Hindi-speaking farmers.';

    return `You are KrishiMitra (कृषिमित्र), an AI agricultural advisor specialized in Rajasthan, India.

${langInstruction}

Your role:
- Provide practical, actionable farming advice for Rajasthan's climate and conditions
- Use the database context provided to give data-backed recommendations
- Reference real MSP prices, soil data, pest information, and government schemes
- Be warm, supportive, and respectful — you are talking to hardworking farmers
- Keep recommendations specific to the district, soil type, and crop mentioned
- Always mention relevant government schemes and support available
- Include specific quantities, timings, and methods — not vague advice

Format your response in HTML using these elements:
- <h4> for section headings (include relevant emoji)
- <ul><li> for lists
- <div class="highlight-box"> for key information boxes
- <div class="warning-box"> for warnings/alerts
- <strong> for emphasis

Database context for this query:
${dbContext}

Current date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
Current season: ${getSeasonInfo()}`;
}

function getSeasonInfo() {
    const month = new Date().getMonth() + 1;
    if (month >= 7 && month <= 10) return 'Kharif (Monsoon/Summer Crop Season)';
    if (month >= 11 || month <= 3) return 'Rabi (Winter Crop Season)';
    return 'Zaid (Short Summer Season)';
}

// --- Database Query Helpers ---

function getDBContext(params) {
    const { district, crop, soil, queryType } = params;
    const parts = [];

    // District info
    if (district) {
        const districtInfo = db.prepare('SELECT * FROM districts WHERE name = ?').get(district);
        if (districtInfo) parts.push(`District: ${JSON.stringify(districtInfo)}`);
    }

    // Soil info
    if (district) {
        const soilInfo = db.prepare('SELECT * FROM soil_profiles WHERE district = ?').get(district);
        if (soilInfo) parts.push(`Soil Profile: ${JSON.stringify(soilInfo)}`);
    }

    // Crop info
    if (crop) {
        const cropName = crop.split('(')[0].trim();
        const cropInfo = db.prepare("SELECT * FROM crops WHERE name_en LIKE ? OR name_en LIKE ?").get(`%${cropName}%`, `${cropName}%`);
        if (cropInfo) parts.push(`Crop Data: ${JSON.stringify(cropInfo)}`);
    }

    // MSP prices
    if (crop) {
        const cropName = crop.split('(')[0].trim();
        const mspPrices = db.prepare("SELECT * FROM msp_prices WHERE crop_name LIKE ? ORDER BY year DESC LIMIT 2").all(`%${cropName}%`);
        if (mspPrices.length) parts.push(`MSP Prices: ${JSON.stringify(mspPrices)}`);
    }

    // Market prices
    if (crop && district) {
        const cropName = crop.split('(')[0].trim();
        const marketPrices = db.prepare("SELECT * FROM market_prices WHERE commodity LIKE ? AND district = ? ORDER BY date DESC LIMIT 3").all(`%${cropName}%`, district);
        if (marketPrices.length) parts.push(`Market Prices: ${JSON.stringify(marketPrices)}`);

        // Also get prices from other mandis for comparison
        const otherPrices = db.prepare("SELECT * FROM market_prices WHERE commodity LIKE ? AND district != ? ORDER BY date DESC LIMIT 5").all(`%${cropName}%`, district);
        if (otherPrices.length) parts.push(`Other Mandi Prices (for comparison): ${JSON.stringify(otherPrices)}`);
    }

    // Pest info
    if (crop && (queryType === 'pest' || queryType === 'general')) {
        const cropName = crop.split('(')[0].trim();
        const pests = db.prepare("SELECT * FROM pest_calendar WHERE crop_name LIKE ?").all(`%${cropName}%`);
        if (pests.length) parts.push(`Pest Calendar: ${JSON.stringify(pests)}`);
    }

    // Government schemes (always useful)
    const schemes = db.prepare("SELECT name_en, name_hi, benefit, link FROM government_schemes").all();
    parts.push(`Government Schemes: ${JSON.stringify(schemes)}`);

    return parts.join('\n\n');
}

// --- API Routes ---

// Health check
app.get('/api/health', (req, res) => {
    const hasLLM = !!(process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY);
    res.json({
        status: 'ok',
        llm_provider: hasLLM ? (process.env.LLM_PROVIDER || 'anthropic') : 'none (using templates)',
        llm_available: hasLLM,
        database: 'sqlite',
        datasets: {
            crops: db.prepare('SELECT COUNT(*) as c FROM crops').get().c,
            msp_prices: db.prepare('SELECT COUNT(*) as c FROM msp_prices').get().c,
            soil_profiles: db.prepare('SELECT COUNT(*) as c FROM soil_profiles').get().c,
            pest_entries: db.prepare('SELECT COUNT(*) as c FROM pest_calendar').get().c,
            market_prices: db.prepare('SELECT COUNT(*) as c FROM market_prices').get().c,
            districts: db.prepare('SELECT COUNT(*) as c FROM districts').get().c,
            schemes: db.prepare('SELECT COUNT(*) as c FROM government_schemes').get().c,
        }
    });
});

// Main advisory endpoint
app.post('/api/advisory', async (req, res) => {
    try {
        const { district, soil, crop, irrigation, farmSize, question, queryType, lang } = req.body;
        const language = lang || 'en';

        const dbContext = getDBContext({ district, crop, soil, queryType: queryType || 'general' });

        const userMessage = buildUserMessage({ district, soil, crop, irrigation, farmSize, question, queryType });

        const systemPrompt = buildSystemPrompt(language, dbContext);

        const llmResponse = await callLLM(systemPrompt, userMessage);

        if (llmResponse) {
            res.json({ response: llmResponse, source: 'llm', provider: process.env.LLM_PROVIDER || 'anthropic' });
        } else {
            // Fallback: return DB data formatted as template
            res.json({ response: buildFallbackResponse({ district, soil, crop, irrigation, farmSize, question, queryType, lang: language }), source: 'template' });
        }
    } catch (err) {
        console.error('Advisory error:', err.message);
        // Fallback on error
        const { district, soil, crop, irrigation, farmSize, question, queryType, lang } = req.body;
        res.json({
            response: buildFallbackResponse({ district, soil, crop, irrigation, farmSize, question, queryType, lang: lang || 'en' }),
            source: 'template',
            error: err.message
        });
    }
});

function buildUserMessage({ district, soil, crop, irrigation, farmSize, question, queryType }) {
    const queryLabels = {
        general: 'comprehensive crop advisory',
        pest: 'pest and disease alert with treatment recommendations',
        water: 'irrigation schedule and water management plan',
        market: 'market prices, mandi information, and selling strategy',
        fertilizer: 'fertilizer and nutrient management recommendations',
        weather: 'weather impact advisory and protective measures'
    };

    let msg = `Provide a ${queryLabels[queryType] || queryLabels.general} for:\n`;
    msg += `- District: ${district}\n`;
    msg += `- Soil Type: ${soil}\n`;
    msg += `- Crop: ${crop}\n`;
    msg += `- Farm Size: ${farmSize}\n`;
    msg += `- Irrigation: ${irrigation}\n`;
    if (question) msg += `\nFarmer's specific question: "${question}"`;

    return msg;
}

// Fallback template response using DB data directly
function buildFallbackResponse({ district, soil, crop, irrigation, farmSize, question, queryType, lang }) {
    const cropName = crop ? crop.split('(')[0].trim() : 'Wheat';
    const isHindi = lang === 'hi';

    // Fetch relevant data
    const cropInfo = db.prepare("SELECT * FROM crops WHERE name_en LIKE ?").get(`%${cropName}%`);
    const soilInfo = db.prepare("SELECT * FROM soil_profiles WHERE district = ?").get(district);
    const mspPrices = db.prepare("SELECT * FROM msp_prices WHERE crop_name LIKE ? ORDER BY year DESC LIMIT 2").all(`%${cropName}%`);
    const marketPrices = db.prepare("SELECT * FROM market_prices WHERE commodity LIKE ? ORDER BY date DESC LIMIT 5").all(`%${cropName}%`);
    const pests = db.prepare("SELECT * FROM pest_calendar WHERE crop_name LIKE ?").all(`%${cropName}%`);
    const schemes = db.prepare("SELECT * FROM government_schemes LIMIT 4").all();

    if (isHindi) {
        return buildHindiFallback({ district, soil, crop, cropName, irrigation, farmSize, question, queryType, cropInfo, soilInfo, mspPrices, marketPrices, pests, schemes });
    }

    let html = `<h4>🌾 KrishiMitra Advisory: ${crop} in ${district}</h4>`;
    html += `<div class="highlight-box"><strong>Farm Profile:</strong> ${farmSize} farm in ${district} | Soil: ${soil} | Irrigation: ${irrigation}</div>`;

    if (mspPrices.length) {
        html += `<h4>💰 Price Information</h4><ul>`;
        for (const p of mspPrices) {
            html += `<li><strong>MSP ${p.year} (${p.season}):</strong> ₹${p.msp_per_quintal}/quintal</li>`;
        }
        html += `</ul>`;
    }

    if (marketPrices.length) {
        html += `<h4>🏪 Current Mandi Prices</h4><ul>`;
        for (const m of marketPrices) {
            html += `<li><strong>${m.mandi_name}:</strong> ₹${m.min_price} - ₹${m.max_price} (Modal: ₹${m.modal_price}/quintal)</li>`;
        }
        html += `</ul>`;
    }

    if (soilInfo) {
        html += `<h4>🌱 Soil Profile — ${district}</h4><ul>`;
        html += `<li><strong>Type:</strong> ${soilInfo.soil_type_en} (${soilInfo.soil_type_hi})</li>`;
        html += `<li><strong>pH:</strong> ${soilInfo.ph_range} | Organic Carbon: ${soilInfo.organic_carbon}</li>`;
        html += `<li><strong>NPK Status:</strong> N: ${soilInfo.nitrogen_status}, P: ${soilInfo.phosphorus_status}, K: ${soilInfo.potassium_status}</li>`;
        html += `<li><strong>Notes:</strong> ${soilInfo.notes}</li>`;
        html += `</ul>`;
    }

    if (pests.length && (queryType === 'pest' || queryType === 'general')) {
        html += `<h4>🐛 Pest & Disease Watch</h4><ul>`;
        for (const p of pests) {
            html += `<li><strong>${p.pest_name_en} (${p.pest_name_hi}):</strong> ${p.severity} risk during ${p.risk_months}. ${p.symptoms}. Bio: ${p.treatment_bio}</li>`;
        }
        html += `</ul>`;
    }

    if (schemes.length) {
        html += `<h4>🏛️ Government Schemes</h4><ul>`;
        for (const s of schemes) {
            html += `<li><strong>${s.name_en} (${s.name_hi}):</strong> ${s.benefit}</li>`;
        }
        html += `</ul>`;
    }

    html += `<div class="warning-box"><strong>⚠️ Note:</strong> This advisory uses local database data. For real-time AI-powered advice, configure an API key (Claude or Gemini) in the server settings.</div>`;

    return html;
}

function buildHindiFallback({ district, soil, crop, cropName, irrigation, farmSize, question, queryType, cropInfo, soilInfo, mspPrices, marketPrices, pests, schemes }) {
    const districtInfo = db.prepare("SELECT * FROM districts WHERE name = ?").get(district);
    const districtHi = districtInfo ? districtInfo.name_hi : district;
    const cropHi = cropInfo ? cropInfo.name_hi : cropName;

    let html = `<h4>🌾 कृषिमित्र सलाह: ${cropHi} — ${districtHi}</h4>`;
    html += `<div class="highlight-box"><strong>खेत का विवरण:</strong> ${farmSize} — ${districtHi} | मिट्टी: ${soil} | सिंचाई: ${irrigation}</div>`;

    if (mspPrices.length) {
        html += `<h4>💰 मूल्य जानकारी</h4><ul>`;
        for (const p of mspPrices) {
            html += `<li><strong>MSP ${p.year} (${p.season}):</strong> ₹${p.msp_per_quintal}/क्विंटल</li>`;
        }
        html += `</ul>`;
    }

    if (marketPrices.length) {
        html += `<h4>🏪 वर्तमान मंडी भाव</h4><ul>`;
        for (const m of marketPrices) {
            html += `<li><strong>${m.mandi_name}:</strong> ₹${m.min_price} - ₹${m.max_price} (मॉडल: ₹${m.modal_price}/क्विंटल)</li>`;
        }
        html += `</ul>`;
    }

    if (soilInfo) {
        html += `<h4>🌱 मृदा जानकारी — ${districtHi}</h4><ul>`;
        html += `<li><strong>प्रकार:</strong> ${soilInfo.soil_type_hi} (${soilInfo.soil_type_en})</li>`;
        html += `<li><strong>pH:</strong> ${soilInfo.ph_range} | जैविक कार्बन: ${soilInfo.organic_carbon}</li>`;
        html += `<li><strong>NPK स्थिति:</strong> N: ${soilInfo.nitrogen_status}, P: ${soilInfo.phosphorus_status}, K: ${soilInfo.potassium_status}</li>`;
        html += `</ul>`;
    }

    if (pests.length && (queryType === 'pest' || queryType === 'general')) {
        html += `<h4>🐛 कीट एवं रोग चेतावनी</h4><ul>`;
        for (const p of pests) {
            html += `<li><strong>${p.pest_name_hi} (${p.pest_name_en}):</strong> ${p.risk_months} में ${p.severity} जोखिम। लक्षण: ${p.symptoms}</li>`;
        }
        html += `</ul>`;
    }

    if (schemes.length) {
        html += `<h4>🏛️ सरकारी योजनाएं</h4><ul>`;
        for (const s of schemes) {
            html += `<li><strong>${s.name_hi} (${s.name_en}):</strong> ${s.benefit}</li>`;
        }
        html += `</ul>`;
    }

    html += `<div class="warning-box"><strong>⚠️ नोट:</strong> यह सलाह स्थानीय डेटाबेस से है। AI-संचालित सलाह के लिए सर्वर सेटिंग्स में API कुंजी कॉन्फ़िगर करें।</div>`;

    return html;
}

// Data API endpoints

app.get('/api/crops', (req, res) => {
    const crops = db.prepare('SELECT * FROM crops ORDER BY name_en').all();
    res.json(crops);
});

app.get('/api/msp', (req, res) => {
    const { crop, year } = req.query;
    let query = 'SELECT * FROM msp_prices WHERE 1=1';
    const params = [];
    if (crop) { query += ' AND crop_name LIKE ?'; params.push(`%${crop}%`); }
    if (year) { query += ' AND year = ?'; params.push(year); }
    query += ' ORDER BY year DESC, crop_name';
    res.json(db.prepare(query).all(...params));
});

app.get('/api/market-prices', (req, res) => {
    const { commodity, district } = req.query;
    let query = 'SELECT * FROM market_prices WHERE 1=1';
    const params = [];
    if (commodity) { query += ' AND commodity LIKE ?'; params.push(`%${commodity}%`); }
    if (district) { query += ' AND district = ?'; params.push(district); }
    query += ' ORDER BY date DESC';
    res.json(db.prepare(query).all(...params));
});

app.get('/api/soil/:district', (req, res) => {
    const soil = db.prepare('SELECT * FROM soil_profiles WHERE district = ?').get(req.params.district);
    res.json(soil || { error: 'District not found' });
});

app.get('/api/pests/:crop', (req, res) => {
    const pests = db.prepare('SELECT * FROM pest_calendar WHERE crop_name LIKE ?').all(`%${req.params.crop}%`);
    res.json(pests);
});

app.get('/api/districts', (req, res) => {
    res.json(db.prepare('SELECT * FROM districts ORDER BY name').all());
});

app.get('/api/schemes', (req, res) => {
    res.json(db.prepare('SELECT * FROM government_schemes').all());
});

// Weather proxy (Open-Meteo - free, no API key)
app.get('/api/weather/:district', async (req, res) => {
    const districtCoords = {
        'Jaipur': { lat: 26.9124, lon: 75.7873 },
        'Jodhpur': { lat: 26.2389, lon: 73.0243 },
        'Udaipur': { lat: 24.5854, lon: 73.7125 },
        'Kota': { lat: 25.2138, lon: 75.8648 },
        'Bikaner': { lat: 28.0229, lon: 73.3119 },
        'Ajmer': { lat: 26.4499, lon: 74.6399 },
        'Alwar': { lat: 27.5530, lon: 76.6346 },
        'Bharatpur': { lat: 27.2152, lon: 77.5030 },
        'Sri Ganganagar': { lat: 29.9094, lon: 73.8780 },
        'Sikar': { lat: 27.6094, lon: 75.1399 }
    };

    const district = req.params.district;
    const coords = districtCoords[district];
    if (!coords) {
        return res.json({ error: 'District coordinates not available' });
    }

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=Asia/Kolkata&forecast_days=7`;
        const data = await new Promise((resolve, reject) => {
            https.get(url, { timeout: 10000 }, (resp) => {
                let body = '';
                resp.on('data', chunk => body += chunk);
                resp.on('end', () => {
                    try { resolve(JSON.parse(body)); }
                    catch (e) { reject(new Error('Invalid JSON')); }
                });
            }).on('error', reject).on('timeout', function () { this.destroy(); reject(new Error('Timeout')); });
        });
        res.json(data);
    } catch (err) {
        res.json({ error: 'Weather service unavailable', message: err.message });
    }
});

// --- Live Data Refresh Endpoint ---
app.post('/api/refresh-data', async (req, res) => {
    const results = {
        startedAt: new Date().toISOString(),
        mandiPrices: { records: [], errors: [], source: 'data.gov.in', apiResource: '9ef84268-d588-465a-a308-a864a43d0070' },
        weather: { districts: [], errors: [], source: 'Open-Meteo (open-meteo.com)' },
        summary: {}
    };

    const DATA_GOV_API_KEY = '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';
    const DATA_GOV_RESOURCE = '9ef84268-d588-465a-a308-a864a43d0070';

    const COMMODITIES = [
        { apiName: 'Wheat', dbName: 'Wheat' },
        { apiName: 'Mustard', dbName: 'Mustard' },
        { apiName: 'Gram', dbName: 'Gram' },
        { apiName: 'Bajra(Pearl Millet)', dbName: 'Bajra' },
        { apiName: 'Bajra', dbName: 'Bajra' },
        { apiName: 'Barley', dbName: 'Barley' },
        { apiName: 'Cumin', dbName: 'Cumin' },
        { apiName: 'Coriander', dbName: 'Coriander' },
        { apiName: 'Cotton', dbName: 'Cotton' },
        { apiName: 'Groundnut', dbName: 'Groundnut' },
        { apiName: 'Guar', dbName: 'Guar' },
        { apiName: 'Guar Seed', dbName: 'Guar' },
        { apiName: 'Maize', dbName: 'Maize' },
        { apiName: 'Jowar(Sorghum)', dbName: 'Jowar' },
        { apiName: 'Jowar', dbName: 'Jowar' },
        { apiName: 'Moong', dbName: 'Moong' },
        { apiName: 'Green Gram (Moong)', dbName: 'Moong' },
        { apiName: 'Isabgol', dbName: 'Isabgol' },
        { apiName: 'Sesame', dbName: 'Til' },
        { apiName: 'Sesamum', dbName: 'Til' },
    ];

    const DISTRICT_COORDS = {
        'Jaipur': { lat: 26.9124, lon: 75.7873 },
        'Jodhpur': { lat: 26.2389, lon: 73.0243 },
        'Udaipur': { lat: 24.5854, lon: 73.7125 },
        'Kota': { lat: 25.2138, lon: 75.8648 },
        'Bikaner': { lat: 28.0229, lon: 73.3119 },
        'Ajmer': { lat: 26.4499, lon: 74.6399 },
        'Alwar': { lat: 27.5530, lon: 76.6346 },
        'Bharatpur': { lat: 27.2152, lon: 77.5030 },
        'Sri Ganganagar': { lat: 29.9094, lon: 73.8780 },
        'Sikar': { lat: 27.6094, lon: 75.1399 }
    };

    function fetchJSON(url) {
        return new Promise((resolve, reject) => {
            https.get(url, { timeout: 15000 }, (resp) => {
                let body = '';
                resp.on('data', chunk => body += chunk);
                resp.on('end', () => {
                    try { resolve(JSON.parse(body)); }
                    catch (e) { reject(new Error('Invalid JSON response')); }
                });
            }).on('error', reject).on('timeout', function () { this.destroy(); reject(new Error('Request timeout')); });
        });
    }

    // 1. Fetch Mandi Prices
    try {
        const seen = new Set();
        let totalInserted = 0;
        db.prepare("DELETE FROM market_prices WHERE source LIKE '%data.gov.in%'").run();

        const insert = db.prepare(`
            INSERT INTO market_prices (commodity, district, mandi_name, min_price, max_price, modal_price, date, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const commodity of COMMODITIES) {
            try {
                const url = `https://api.data.gov.in/resource/${DATA_GOV_RESOURCE}?api-key=${DATA_GOV_API_KEY}&format=json&limit=50&filters%5Bstate%5D=Rajasthan&filters%5Bcommodity%5D=${encodeURIComponent(commodity.apiName)}`;
                const data = await fetchJSON(url);

                if (data.records && data.records.length > 0) {
                    const commodityRecords = [];
                    for (const record of data.records) {
                        const key = `${commodity.dbName}-${record.market}-${record.arrival_date}`;
                        if (seen.has(key)) continue;
                        seen.add(key);

                        insert.run(
                            commodity.dbName,
                            record.district || 'Unknown',
                            record.market || 'Unknown',
                            parseFloat(record.min_price) || 0,
                            parseFloat(record.max_price) || 0,
                            parseFloat(record.modal_price) || 0,
                            record.arrival_date || new Date().toISOString().split('T')[0],
                            `data.gov.in live (${new Date().toISOString().split('T')[0]})`
                        );
                        totalInserted++;
                        commodityRecords.push({
                            commodity: commodity.dbName,
                            district: record.district || 'Unknown',
                            mandi: record.market || 'Unknown',
                            minPrice: parseFloat(record.min_price) || 0,
                            maxPrice: parseFloat(record.max_price) || 0,
                            modalPrice: parseFloat(record.modal_price) || 0,
                            date: record.arrival_date || 'N/A'
                        });
                    }
                    if (commodityRecords.length > 0) {
                        results.mandiPrices.records.push({
                            commodity: commodity.dbName,
                            apiQuery: commodity.apiName,
                            count: commodityRecords.length,
                            samples: commodityRecords.slice(0, 3)
                        });
                    }
                }
            } catch (err) {
                results.mandiPrices.errors.push({ commodity: commodity.apiName, error: err.message });
            }
        }
        results.mandiPrices.totalInserted = totalInserted;
    } catch (err) {
        results.mandiPrices.errors.push({ commodity: 'ALL', error: err.message });
    }

    // 2. Fetch Weather
    db.exec(`
        CREATE TABLE IF NOT EXISTS weather_cache (
            district TEXT PRIMARY KEY,
            temperature REAL,
            weather_code INTEGER,
            humidity REAL,
            wind_speed REAL,
            forecast_json TEXT,
            updated_at TEXT
        )
    `);

    const weatherInsert = db.prepare(`
        INSERT OR REPLACE INTO weather_cache (district, temperature, weather_code, humidity, wind_speed, forecast_json, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const [district, coords] of Object.entries(DISTRICT_COORDS)) {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=Asia/Kolkata&forecast_days=7`;
            const data = await fetchJSON(url);
            if (data.current) {
                weatherInsert.run(
                    district,
                    data.current.temperature_2m,
                    data.current.weather_code,
                    data.current.relative_humidity_2m,
                    data.current.wind_speed_10m,
                    JSON.stringify(data.daily || {}),
                    new Date().toISOString()
                );
                results.weather.districts.push({
                    district,
                    temperature: data.current.temperature_2m,
                    humidity: data.current.relative_humidity_2m,
                    windSpeed: data.current.wind_speed_10m,
                    weatherCode: data.current.weather_code
                });
            }
        } catch (err) {
            results.weather.errors.push({ district, error: err.message });
        }
    }

    // 3. Build summary
    results.completedAt = new Date().toISOString();
    const totalMarket = db.prepare('SELECT COUNT(*) as c FROM market_prices').get().c;
    const liveCount = db.prepare("SELECT COUNT(*) as c FROM market_prices WHERE source LIKE '%data.gov.in%'").get().c;

    results.summary = {
        mandiPricesInserted: results.mandiPrices.totalInserted || 0,
        totalMarketPrices: totalMarket,
        liveMarketPrices: liveCount,
        weatherDistrictsUpdated: results.weather.districts.length,
        commoditiesFetched: results.mandiPrices.records.length,
        errors: results.mandiPrices.errors.length + results.weather.errors.length,
        duration: `${((new Date(results.completedAt) - new Date(results.startedAt)) / 1000).toFixed(1)}s`
    };

    console.log(`Data refresh complete: ${results.summary.mandiPricesInserted} mandi prices, ${results.summary.weatherDistrictsUpdated} weather updates in ${results.summary.duration}`);

    res.json(results);
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🌾 KrishiMitra Server running on http://localhost:${PORT}`);
    console.log(`📊 Database: SQLite (krishimitra.db)`);
    console.log(`🤖 LLM Provider: ${process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY ? (process.env.LLM_PROVIDER || 'anthropic') : 'None configured (using template fallback)'}`);
    console.log(`\n   Open http://localhost:${PORT} in your browser\n`);
});

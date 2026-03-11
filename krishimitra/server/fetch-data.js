/**
 * KrishiMitra Real Data Fetcher
 *
 * Fetches live mandi prices from data.gov.in and weather from Open-Meteo
 * to populate the SQLite database with near real-time data.
 *
 * Usage: node fetch-data.js
 * Run before a demo to get the latest prices.
 */

const Database = require('better-sqlite3');
const { execSync } = require('child_process');
const path = require('path');

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

function curlJSON(url) {
    const output = execSync(`curl -s --max-time 15 "${url}"`, {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024
    });
    return JSON.parse(output);
}

function fetchMandiPrices(db) {
    console.log('\n--- Fetching Live Mandi Prices from data.gov.in ---\n');

    const seen = new Set();
    let totalInserted = 0;

    db.prepare('DELETE FROM market_prices WHERE source LIKE ?').run('%data.gov.in%');

    const insert = db.prepare(`
        INSERT INTO market_prices (commodity, district, mandi_name, min_price, max_price, modal_price, date, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const commodity of COMMODITIES) {
        try {
            const url = `https://api.data.gov.in/resource/${DATA_GOV_RESOURCE}?api-key=${DATA_GOV_API_KEY}&format=json&limit=50&filters%5Bstate%5D=Rajasthan&filters%5Bcommodity%5D=${encodeURIComponent(commodity.apiName)}`;
            const data = curlJSON(url);

            if (data.records && data.records.length > 0) {
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
                }
                console.log(`  ${commodity.apiName}: ${data.records.length} records`);
            } else {
                console.log(`  ${commodity.apiName}: no records`);
            }
        } catch (err) {
            console.log(`  ${commodity.apiName}: skipped (${err.message.split('\n')[0]})`);
        }
    }

    const liveCount = db.prepare("SELECT COUNT(*) as c FROM market_prices WHERE source LIKE '%data.gov.in%'").get().c;
    const seedCount = db.prepare("SELECT COUNT(*) as c FROM market_prices WHERE source LIKE '%seed%'").get().c;

    console.log(`\n  Live records: ${totalInserted} | Seed data: ${seedCount} | Total: ${liveCount + seedCount}`);
}

function fetchWeatherData(db) {
    console.log('\n--- Fetching Weather from Open-Meteo ---\n');

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

    const insert = db.prepare(`
        INSERT OR REPLACE INTO weather_cache (district, temperature, weather_code, humidity, wind_speed, forecast_json, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const [district, coords] of Object.entries(DISTRICT_COORDS)) {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=Asia/Kolkata&forecast_days=7`;
            const data = curlJSON(url);

            if (data.current) {
                insert.run(
                    district,
                    data.current.temperature_2m,
                    data.current.weather_code,
                    data.current.relative_humidity_2m,
                    data.current.wind_speed_10m,
                    JSON.stringify(data.daily || {}),
                    new Date().toISOString()
                );
                console.log(`  ${district}: ${data.current.temperature_2m}°C, humidity ${data.current.relative_humidity_2m}%`);
            }
        } catch (err) {
            console.log(`  ${district}: skipped (${err.message.split('\n')[0]})`);
        }
    }
}

function main() {
    console.log('========================================');
    console.log('  KrishiMitra Real Data Fetcher');
    console.log(`  ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log('========================================');

    const { initDatabase } = require('./db');
    const db = initDatabase();

    fetchMandiPrices(db);
    fetchWeatherData(db);

    // Summary
    console.log('\n========================================');
    console.log('  Database Summary');
    console.log('========================================');
    const tables = ['crops', 'msp_prices', 'soil_profiles', 'pest_calendar', 'market_prices', 'districts', 'government_schemes', 'weather_cache'];
    for (const table of tables) {
        try {
            const count = db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get().c;
            console.log(`  ${table}: ${count} records`);
        } catch (e) { /* skip */ }
    }

    const livePrices = db.prepare("SELECT commodity, district, mandi_name, modal_price, date FROM market_prices WHERE source LIKE '%data.gov.in%' ORDER BY date DESC LIMIT 5").all();
    if (livePrices.length) {
        console.log('\n  Sample live prices:');
        for (const p of livePrices) {
            console.log(`    ${p.commodity} @ ${p.mandi_name} (${p.district}): ₹${p.modal_price}/q [${p.date}]`);
        }
    }

    console.log('\n  Done! Start server: npm start\n');
    db.close();
}

main();

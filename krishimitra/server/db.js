const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'krishimitra.db');

function initDatabase() {
    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');

    // Create tables
    db.exec(`
        CREATE TABLE IF NOT EXISTS crops (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name_en TEXT NOT NULL,
            name_hi TEXT NOT NULL,
            type TEXT NOT NULL,          -- rabi, kharif, zaid
            suitable_soil TEXT,
            water_requirement TEXT,      -- low, medium, high
            growing_months TEXT,
            harvest_months TEXT,
            suitable_districts TEXT
        );

        CREATE TABLE IF NOT EXISTS msp_prices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            crop_name TEXT NOT NULL,
            year TEXT NOT NULL,
            season TEXT NOT NULL,        -- kharif, rabi
            msp_per_quintal REAL NOT NULL,
            unit TEXT DEFAULT 'INR/quintal'
        );

        CREATE TABLE IF NOT EXISTS soil_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            district TEXT NOT NULL,
            soil_type_en TEXT NOT NULL,
            soil_type_hi TEXT NOT NULL,
            ph_range TEXT,
            organic_carbon TEXT,
            nitrogen_status TEXT,
            phosphorus_status TEXT,
            potassium_status TEXT,
            suitable_crops TEXT,
            notes TEXT
        );

        CREATE TABLE IF NOT EXISTS pest_calendar (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            crop_name TEXT NOT NULL,
            pest_name_en TEXT NOT NULL,
            pest_name_hi TEXT NOT NULL,
            risk_months TEXT NOT NULL,
            severity TEXT,               -- low, moderate, high
            symptoms TEXT,
            treatment_bio TEXT,
            treatment_chemical TEXT,
            prevention TEXT
        );

        CREATE TABLE IF NOT EXISTS market_prices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            commodity TEXT NOT NULL,
            district TEXT NOT NULL,
            mandi_name TEXT NOT NULL,
            min_price REAL,
            max_price REAL,
            modal_price REAL,
            date TEXT,
            source TEXT DEFAULT 'Agmarknet seed data'
        );

        CREATE TABLE IF NOT EXISTS districts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            name_hi TEXT NOT NULL,
            zone TEXT,                   -- arid, semi-arid, sub-humid, humid
            avg_rainfall_mm REAL,
            major_crops TEXT,
            irrigation_sources TEXT,
            kvk_location TEXT
        );

        CREATE TABLE IF NOT EXISTS government_schemes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name_en TEXT NOT NULL,
            name_hi TEXT NOT NULL,
            description TEXT,
            eligibility TEXT,
            benefit TEXT,
            link TEXT
        );
    `);

    // Seed data only if tables are empty
    const cropCount = db.prepare('SELECT COUNT(*) as c FROM crops').get().c;
    if (cropCount === 0) {
        seedData(db);
    }

    return db;
}

function seedData(db) {
    // --- CROPS ---
    const insertCrop = db.prepare(`
        INSERT INTO crops (name_en, name_hi, type, suitable_soil, water_requirement, growing_months, harvest_months, suitable_districts)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const crops = [
        ['Wheat', 'गेहूं', 'rabi', 'Loam, Clay Loam, Alluvial', 'medium', 'Nov-Dec', 'Mar-Apr', 'Jaipur, Alwar, Bharatpur, Sri Ganganagar, Kota, Ajmer, Sikar'],
        ['Mustard', 'सरसों', 'rabi', 'Sandy Loam, Loam', 'low', 'Oct-Nov', 'Feb-Mar', 'Bharatpur, Alwar, Jaipur, Sikar, Sri Ganganagar'],
        ['Bajra (Pearl Millet)', 'बाजरा', 'kharif', 'Sandy, Sandy Loam', 'low', 'Jul-Aug', 'Oct-Nov', 'Jodhpur, Bikaner, Jaipur, Sikar, Ajmer'],
        ['Jowar (Sorghum)', 'ज्वार', 'kharif', 'Clay, Black Cotton', 'low', 'Jul-Aug', 'Oct-Nov', 'Kota, Udaipur, Ajmer, Jodhpur'],
        ['Groundnut', 'मूंगफली', 'kharif', 'Sandy Loam, Red Soil', 'medium', 'Jun-Jul', 'Oct-Nov', 'Jaipur, Ajmer, Udaipur, Jodhpur'],
        ['Cotton', 'कपास', 'kharif', 'Black Cotton, Clay', 'high', 'May-Jun', 'Nov-Dec', 'Sri Ganganagar, Bikaner, Jodhpur'],
        ['Cumin', 'जीरा', 'rabi', 'Sandy Loam, Loam', 'low', 'Nov-Dec', 'Mar', 'Jodhpur, Barmer, Jaisalmer, Bikaner'],
        ['Coriander', 'धनिया', 'rabi', 'Loam, Clay Loam', 'medium', 'Oct-Nov', 'Feb-Mar', 'Kota, Bundi, Baran, Jhalawar'],
        ['Gram/Chickpea', 'चना', 'rabi', 'Loam, Sandy Loam', 'low', 'Oct-Nov', 'Mar', 'Bikaner, Jodhpur, Jaipur, Sikar, Ajmer'],
        ['Barley', 'जौ', 'rabi', 'Sandy Loam, Loam', 'low', 'Nov', 'Mar-Apr', 'Jaipur, Ajmer, Alwar, Sikar, Bikaner'],
        ['Maize', 'मक्का', 'kharif', 'Loam, Sandy Loam', 'medium', 'Jun-Jul', 'Sep-Oct', 'Udaipur, Kota, Bhilwara, Chittorgarh'],
        ['Guar', 'ग्वार', 'kharif', 'Sandy, Sandy Loam', 'low', 'Jul', 'Oct', 'Jodhpur, Bikaner, Sri Ganganagar, Sikar'],
        ['Moong (Green Gram)', 'मूंग', 'kharif', 'Sandy Loam, Loam', 'low', 'Jul', 'Sep-Oct', 'Jaipur, Sikar, Ajmer, Jodhpur'],
        ['Til (Sesame)', 'तिल', 'kharif', 'Sandy Loam, Loam', 'low', 'Jul', 'Oct', 'Jodhpur, Udaipur, Ajmer'],
        ['Isabgol (Psyllium)', 'इसबगोल', 'rabi', 'Sandy Loam', 'low', 'Nov', 'Mar', 'Jodhpur, Barmer, Jaisalmer']
    ];

    const insertCrops = db.transaction(() => {
        for (const c of crops) insertCrop.run(...c);
    });
    insertCrops();

    // --- MSP PRICES (Real data - Govt of India 2024-25, 2025-26) ---
    const insertMSP = db.prepare(`
        INSERT INTO msp_prices (crop_name, year, season, msp_per_quintal)
        VALUES (?, ?, ?, ?)
    `);

    const mspData = [
        // Kharif 2025-26
        ['Paddy (Common)', '2025-26', 'kharif', 2397],
        ['Paddy (Grade A)', '2025-26', 'kharif', 2427],
        ['Jowar (Hybrid)', '2025-26', 'kharif', 3478],
        ['Jowar (Maldandi)', '2025-26', 'kharif', 3508],
        ['Bajra', '2025-26', 'kharif', 2725],
        ['Maize', '2025-26', 'kharif', 2348],
        ['Groundnut', '2025-26', 'kharif', 6783],
        ['Cotton (Medium Staple)', '2025-26', 'kharif', 7521],
        ['Cotton (Long Staple)', '2025-26', 'kharif', 7971],
        ['Moong', '2025-26', 'kharif', 8862],
        ['Guar Seed', '2025-26', 'kharif', 6652],
        ['Til', '2025-26', 'kharif', 9372],
        // Rabi 2025-26
        ['Wheat', '2025-26', 'rabi', 2425],
        ['Barley', '2025-26', 'rabi', 1980],
        ['Gram', '2025-26', 'rabi', 5650],
        ['Mustard', '2025-26', 'rabi', 5950],
        ['Masur (Lentil)', '2025-26', 'rabi', 6700],
        // Kharif 2024-25 (previous year for comparison)
        ['Bajra', '2024-25', 'kharif', 2625],
        ['Groundnut', '2024-25', 'kharif', 6593],
        ['Cotton (Medium Staple)', '2024-25', 'kharif', 7321],
        ['Moong', '2024-25', 'kharif', 8682],
        // Rabi 2024-25
        ['Wheat', '2024-25', 'rabi', 2275],
        ['Gram', '2024-25', 'rabi', 5440],
        ['Mustard', '2024-25', 'rabi', 5750],
        ['Barley', '2024-25', 'rabi', 1850],
    ];

    const insertMSPs = db.transaction(() => {
        for (const m of mspData) insertMSP.run(...m);
    });
    insertMSPs();

    // --- SOIL PROFILES ---
    const insertSoil = db.prepare(`
        INSERT INTO soil_profiles (district, soil_type_en, soil_type_hi, ph_range, organic_carbon, nitrogen_status, phosphorus_status, potassium_status, suitable_crops, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const soilData = [
        ['Jaipur', 'Sandy Loam', 'बलुई दोमट', '7.5-8.5', 'Low (0.2-0.4%)', 'Low', 'Medium', 'Medium', 'Wheat, Mustard, Gram, Bajra', 'Needs organic matter addition; zinc deficiency common'],
        ['Jodhpur', 'Sandy (Desert)', 'बालू (मरुस्थलीय)', '8.0-9.0', 'Very Low (<0.2%)', 'Low', 'Low', 'Low', 'Bajra, Guar, Moth, Cumin', 'Wind erosion risk; needs windbreaks and mulching'],
        ['Udaipur', 'Red Soil', 'लाल मिट्टी', '6.5-7.5', 'Medium (0.4-0.6%)', 'Medium', 'Medium', 'High', 'Maize, Wheat, Soybean', 'Good drainage; iron-rich but phosphorus fixation issue'],
        ['Kota', 'Black Cotton (Vertisol)', 'काली मिट्टी', '7.0-8.0', 'Medium (0.5-0.7%)', 'Medium', 'Medium', 'High', 'Soybean, Wheat, Coriander, Cotton', 'High clay content; cracks in summer; good moisture retention'],
        ['Bikaner', 'Sandy (Arid)', 'बालू (शुष्क)', '8.5-9.5', 'Very Low (<0.2%)', 'Low', 'Low', 'Low', 'Guar, Moth, Bajra, Gram', 'Extremely arid; saline patches; needs gypsum treatment'],
        ['Ajmer', 'Sandy Loam to Loam', 'बलुई दोमट से दोमट', '7.5-8.5', 'Low-Medium', 'Low-Medium', 'Medium', 'Medium', 'Bajra, Wheat, Gram, Barley', 'Transitional zone; variable soil depth'],
        ['Alwar', 'Alluvial Loam', 'जलोढ़ दोमट', '7.0-8.0', 'Medium (0.4-0.5%)', 'Medium', 'Medium', 'High', 'Wheat, Mustard, Bajra, Vegetables', 'Fertile plain; good for intensive agriculture'],
        ['Bharatpur', 'Alluvial', 'जलोढ़', '7.0-7.5', 'Medium (0.5-0.6%)', 'Medium', 'High', 'High', 'Wheat, Mustard, Rice, Vegetables', 'Yamuna basin; fertile; water table accessible'],
        ['Sri Ganganagar', 'Canal Alluvial', 'नहरी जलोढ़', '7.5-8.5', 'Medium', 'Medium', 'High', 'High', 'Wheat, Cotton, Gram, Mustard', 'Indira Gandhi Canal area; salinity risk with canal irrigation'],
        ['Sikar', 'Sandy Loam', 'बलुई दोमट', '7.5-8.5', 'Low', 'Low', 'Low-Medium', 'Medium', 'Bajra, Wheat, Gram, Mustard', 'Semi-arid; zinc and sulphur deficiency common'],
    ];

    const insertSoils = db.transaction(() => {
        for (const s of soilData) insertSoil.run(...s);
    });
    insertSoils();

    // --- PEST CALENDAR ---
    const insertPest = db.prepare(`
        INSERT INTO pest_calendar (crop_name, pest_name_en, pest_name_hi, risk_months, severity, symptoms, treatment_bio, treatment_chemical, prevention)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const pestData = [
        ['Wheat', 'Aphid', 'माहू (चेंपा)', 'Feb-Mar', 'high', 'Yellowing leaves, honeydew on leaves, stunted growth', 'Neem oil 5ml/L spray at dawn or dusk', 'Imidacloprid 17.8 SL @ 0.5ml/L', 'Avoid excess nitrogen; maintain field hygiene'],
        ['Wheat', 'Termite', 'दीमक', 'Nov-Mar', 'moderate', 'Plants wilting in patches, hollow stems near soil', 'Neem cake in soil at sowing time', 'Chlorpyrifos 20EC in irrigation water', 'Treat seed with Fipronil before sowing'],
        ['Wheat', 'Powdery Mildew', 'चूर्णी फफूंदी', 'Jan-Feb', 'moderate', 'White powdery patches on leaves and stems', 'Sulphur dust 20-25 kg/hectare', 'Propiconazole 25 EC @ 1ml/L', 'Use resistant varieties; avoid excess irrigation'],
        ['Wheat', 'Brown Rust', 'भूरा गेरुआ', 'Feb-Mar', 'high', 'Brown pustules on leaves, reduced grain filling', 'Remove infected plant debris', 'Propiconazole 25 EC @ 1ml/L', 'Grow resistant varieties (HD-2967, WH-1105)'],
        ['Mustard', 'Aphid', 'माहू', 'Jan-Feb', 'high', 'Curling leaves, honeydew, sooty mold on pods', 'Neem oil 5ml/L + soap 1ml/L', 'Dimethoate 30 EC @ 1ml/L', 'Early sowing (Oct 15-25) avoids peak aphid season'],
        ['Mustard', 'Painted Bug', 'चितकबरा कीट', 'Oct-Nov, Feb-Mar', 'moderate', 'Sucking damage on seedlings and mature plants', 'Neem seed kernel extract 5%', 'Malathion 5% dust @ 20-25 kg/hectare', 'Clean cultivation; remove crop residues'],
        ['Bajra', 'Stem Borer', 'तना छेदक', 'Aug-Sep', 'high', 'Dead hearts in young plants, bore holes in stems', 'Release Trichogramma parasitoids', 'Carbofuran 3G in leaf whorls', 'Early sowing; destroy stubbles after harvest'],
        ['Bajra', 'Downy Mildew', 'मृदुरोमिल आसिता', 'Jul-Aug', 'high', 'Green ear (leafy panicle), white fungal growth under leaves', 'Metalaxyl seed treatment', 'Metalaxyl 35 SD @ 6g/kg seed', 'Use resistant hybrids; seed treatment essential'],
        ['Gram', 'Pod Borer', 'फली छेदक', 'Feb-Mar', 'high', 'Holes in pods, frass visible, larvae feeding on seeds', 'HaNPV @ 250 LE/hectare; neem oil spray', 'Indoxacarb 14.5 SC @ 0.5ml/L', 'Bird perches 20/hectare; pheromone traps 5/hectare'],
        ['Gram', 'Wilt (Fusarium)', 'उकठा', 'Dec-Feb', 'high', 'Yellowing, wilting from top, dry plants in patches', 'Trichoderma viride seed treatment', 'No effective chemical control', 'Resistant varieties; crop rotation; avoid waterlogging'],
        ['Cotton', 'Bollworm', 'बॉलवॉर्म', 'Aug-Oct', 'high', 'Bore holes in bolls, rotting, frass in bolls', 'HaNPV spray; Trichogramma release', 'Emamectin benzoate 5 SG @ 0.2g/L', 'Bt cotton varieties; pheromone traps; refuge crop'],
        ['Cumin', 'Blight (Alternaria)', 'झुलसा', 'Jan-Feb', 'high', 'Brown spots on leaves and stems, plant drying', 'Trichoderma seed treatment', 'Mancozeb 75 WP @ 2g/L', 'Seed treatment; avoid excess irrigation; proper spacing'],
    ];

    const insertPests = db.transaction(() => {
        for (const p of pestData) insertPest.run(...p);
    });
    insertPests();

    // --- MARKET PRICES (Seed data from Agmarknet typical ranges) ---
    const insertPrice = db.prepare(`
        INSERT INTO market_prices (commodity, district, mandi_name, min_price, max_price, modal_price, date, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const marketData = [
        ['Wheat', 'Jaipur', 'Jaipur (Chomu)', 2350, 2550, 2450, '2026-03-10', 'Agmarknet seed data'],
        ['Wheat', 'Alwar', 'Alwar', 2380, 2520, 2440, '2026-03-10', 'Agmarknet seed data'],
        ['Wheat', 'Sri Ganganagar', 'Sri Ganganagar', 2400, 2580, 2480, '2026-03-10', 'Agmarknet seed data'],
        ['Wheat', 'Kota', 'Kota', 2370, 2500, 2430, '2026-03-10', 'Agmarknet seed data'],
        ['Mustard', 'Bharatpur', 'Bharatpur', 5800, 6200, 5950, '2026-03-10', 'Agmarknet seed data'],
        ['Mustard', 'Alwar', 'Alwar', 5750, 6100, 5900, '2026-03-10', 'Agmarknet seed data'],
        ['Mustard', 'Jaipur', 'Jaipur (Chomu)', 5700, 6050, 5850, '2026-03-10', 'Agmarknet seed data'],
        ['Gram', 'Bikaner', 'Bikaner', 5500, 5900, 5700, '2026-03-10', 'Agmarknet seed data'],
        ['Gram', 'Jodhpur', 'Jodhpur', 5450, 5850, 5650, '2026-03-10', 'Agmarknet seed data'],
        ['Gram', 'Ajmer', 'Ajmer', 5400, 5800, 5600, '2026-03-10', 'Agmarknet seed data'],
        ['Bajra', 'Jodhpur', 'Jodhpur', 2600, 2850, 2725, '2026-03-10', 'Agmarknet seed data'],
        ['Bajra', 'Bikaner', 'Bikaner', 2550, 2800, 2680, '2026-03-10', 'Agmarknet seed data'],
        ['Cumin', 'Jodhpur', 'Jodhpur', 42000, 48000, 45000, '2026-03-10', 'Agmarknet seed data'],
        ['Cumin', 'Barmer', 'Barmer', 41000, 47000, 44000, '2026-03-10', 'Agmarknet seed data'],
        ['Coriander', 'Kota', 'Kota', 8500, 11000, 9800, '2026-03-10', 'Agmarknet seed data'],
        ['Coriander', 'Bundi', 'Bundi', 8200, 10500, 9400, '2026-03-10', 'Agmarknet seed data'],
        ['Barley', 'Jaipur', 'Jaipur', 1900, 2100, 2000, '2026-03-10', 'Agmarknet seed data'],
        ['Guar', 'Jodhpur', 'Jodhpur', 6400, 6900, 6650, '2026-03-10', 'Agmarknet seed data'],
        ['Cotton', 'Sri Ganganagar', 'Sri Ganganagar', 7300, 7800, 7550, '2026-03-10', 'Agmarknet seed data'],
        ['Groundnut', 'Jaipur', 'Jaipur', 6500, 7100, 6800, '2026-03-10', 'Agmarknet seed data'],
    ];

    const insertPrices = db.transaction(() => {
        for (const m of marketData) insertPrice.run(...m);
    });
    insertPrices();

    // --- DISTRICTS ---
    const insertDistrict = db.prepare(`
        INSERT INTO districts (name, name_hi, zone, avg_rainfall_mm, major_crops, irrigation_sources, kvk_location)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const districtData = [
        ['Jaipur', 'जयपुर', 'semi-arid', 600, 'Wheat, Bajra, Mustard, Gram', 'Tube well, Canal', 'KVK Chomu, SKNAU Jobner'],
        ['Jodhpur', 'जोधपुर', 'arid', 360, 'Bajra, Guar, Cumin, Moth', 'Tube well, Rainfed', 'KVK Mandor, CAZRI'],
        ['Udaipur', 'उदयपुर', 'sub-humid', 650, 'Maize, Wheat, Soybean', 'Canal, Tube well, Lake', 'KVK Badgaon, MPUAT'],
        ['Kota', 'कोटा', 'sub-humid', 750, 'Soybean, Wheat, Coriander', 'Canal (Chambal), Tube well', 'KVK Kota, AU Kota'],
        ['Bikaner', 'बीकानेर', 'arid', 280, 'Gram, Guar, Bajra, Moth', 'Canal (IGNP), Tube well', 'KVK Bikaner, SKRAU'],
        ['Ajmer', 'अजमेर', 'semi-arid', 500, 'Bajra, Wheat, Gram, Barley', 'Tube well, Rainfed', 'KVK Ajmer'],
        ['Alwar', 'अलवर', 'semi-arid', 650, 'Wheat, Mustard, Bajra', 'Tube well, Canal', 'KVK Alwar'],
        ['Bharatpur', 'भरतपुर', 'semi-arid', 650, 'Wheat, Mustard, Rice, Vegetables', 'Canal, Tube well', 'KVK Bharatpur'],
        ['Sri Ganganagar', 'श्री गंगानगर', 'arid', 300, 'Wheat, Cotton, Gram, Mustard', 'Canal (IGNP), Tube well', 'KVK Sri Ganganagar'],
        ['Sikar', 'सीकर', 'semi-arid', 450, 'Bajra, Wheat, Gram, Mustard', 'Tube well, Rainfed', 'KVK Sikar'],
    ];

    const insertDistricts = db.transaction(() => {
        for (const d of districtData) insertDistrict.run(...d);
    });
    insertDistricts();

    // --- GOVERNMENT SCHEMES ---
    const insertScheme = db.prepare(`
        INSERT INTO government_schemes (name_en, name_hi, description, eligibility, benefit, link)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const schemes = [
        ['PM-KISAN', 'पीएम-किसान', 'Direct income support of Rs 6,000/year to farmer families', 'All landholding farmer families', 'Rs 6,000/year in 3 installments of Rs 2,000', 'https://pmkisan.gov.in'],
        ['PM Fasal Bima Yojana', 'पीएम फसल बीमा योजना', 'Crop insurance against natural calamities', 'All farmers growing notified crops', 'Premium: 2% Kharif, 1.5% Rabi; full sum insured coverage', 'https://pmfby.gov.in'],
        ['PM Krishi Sinchai Yojana', 'पीएम कृषि सिंचाई योजना', 'Micro-irrigation (drip/sprinkler) subsidy', 'All farmers', 'Up to 55-70% subsidy on drip/sprinkler systems', 'https://pmksy.gov.in'],
        ['Soil Health Card', 'मृदा स्वास्थ्य कार्ड', 'Free soil testing and nutrient recommendations', 'All farmers', 'Free soil testing every 2 years with crop-wise fertilizer advice', 'https://soilhealth.dac.gov.in'],
        ['e-NAM', 'ई-नाम', 'National electronic marketplace for agricultural commodities', 'All farmers, traders, FPOs', 'Online trading platform; transparent pricing; wider market access', 'https://enam.gov.in'],
        ['Kisan Credit Card', 'किसान क्रेडिट कार्ड', 'Subsidized agricultural credit', 'All farmers, tenant farmers, sharecroppers', 'Crop loans at 4% interest (with prompt repayment)', 'https://www.nabard.org'],
    ];

    const insertSchemes = db.transaction(() => {
        for (const s of schemes) insertScheme.run(...s);
    });
    insertSchemes();

    console.log('Database seeded with Rajasthan agricultural data');
}

module.exports = { initDatabase };

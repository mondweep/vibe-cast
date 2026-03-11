// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('KrishiMitra API Endpoint Tests', () => {

  test('GET /api/health returns correct structure with dataset counts', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.database).toBe('sqlite');
    expect(data).toHaveProperty('llm_available');
    expect(data).toHaveProperty('llm_provider');

    // Verify datasets object with expected keys
    expect(data.datasets).toBeDefined();
    expect(data.datasets).toHaveProperty('crops');
    expect(data.datasets).toHaveProperty('msp_prices');
    expect(data.datasets).toHaveProperty('soil_profiles');
    expect(data.datasets).toHaveProperty('pest_entries');
    expect(data.datasets).toHaveProperty('market_prices');
    expect(data.datasets).toHaveProperty('districts');
    expect(data.datasets).toHaveProperty('schemes');

    // All counts should be positive numbers
    for (const [key, value] of Object.entries(data.datasets)) {
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThan(0);
    }
  });

  test('GET /api/crops returns 15 crops', async ({ request }) => {
    const response = await request.get('/api/crops');
    expect(response.ok()).toBeTruthy();

    const crops = await response.json();
    expect(Array.isArray(crops)).toBeTruthy();
    expect(crops.length).toBe(15);

    // Each crop should have basic fields
    const firstCrop = crops[0];
    expect(firstCrop).toHaveProperty('name_en');
    expect(firstCrop).toHaveProperty('name_hi');
  });

  test('GET /api/districts returns 10 districts', async ({ request }) => {
    const response = await request.get('/api/districts');
    expect(response.ok()).toBeTruthy();

    const districts = await response.json();
    expect(Array.isArray(districts)).toBeTruthy();
    expect(districts.length).toBe(10);

    // Each district should have name field
    const firstDistrict = districts[0];
    expect(firstDistrict).toHaveProperty('name');
  });

  test('GET /api/soil/Jaipur returns soil profile', async ({ request }) => {
    const response = await request.get('/api/soil/Jaipur');
    expect(response.ok()).toBeTruthy();

    const soil = await response.json();
    expect(soil).not.toHaveProperty('error');
    expect(soil).toHaveProperty('district');
    expect(soil.district).toBe('Jaipur');
    expect(soil).toHaveProperty('soil_type_en');
    expect(soil).toHaveProperty('soil_type_hi');
    expect(soil).toHaveProperty('ph_range');
    expect(soil).toHaveProperty('nitrogen_status');
    expect(soil).toHaveProperty('phosphorus_status');
    expect(soil).toHaveProperty('potassium_status');
  });

  test('GET /api/pests/Wheat returns pest entries', async ({ request }) => {
    const response = await request.get('/api/pests/Wheat');
    expect(response.ok()).toBeTruthy();

    const pests = await response.json();
    expect(Array.isArray(pests)).toBeTruthy();
    expect(pests.length).toBeGreaterThan(0);

    // Each pest entry should have expected fields
    const firstPest = pests[0];
    expect(firstPest).toHaveProperty('pest_name_en');
    expect(firstPest).toHaveProperty('pest_name_hi');
    expect(firstPest).toHaveProperty('crop_name');
    expect(firstPest.crop_name).toMatch(/Wheat/i);
    expect(firstPest).toHaveProperty('severity');
    expect(firstPest).toHaveProperty('risk_months');
  });

  test('GET /api/msp returns MSP prices', async ({ request }) => {
    const response = await request.get('/api/msp');
    expect(response.ok()).toBeTruthy();

    const prices = await response.json();
    expect(Array.isArray(prices)).toBeTruthy();
    expect(prices.length).toBeGreaterThan(0);

    // Each MSP entry should have price and crop fields
    const firstPrice = prices[0];
    expect(firstPrice).toHaveProperty('crop_name');
    expect(firstPrice).toHaveProperty('msp_per_quintal');
    expect(firstPrice).toHaveProperty('year');
    expect(firstPrice).toHaveProperty('season');
    expect(typeof firstPrice.msp_per_quintal).toBe('number');
    expect(firstPrice.msp_per_quintal).toBeGreaterThan(0);
  });

  test('GET /api/schemes returns government schemes', async ({ request }) => {
    const response = await request.get('/api/schemes');
    expect(response.ok()).toBeTruthy();

    const schemes = await response.json();
    expect(Array.isArray(schemes)).toBeTruthy();
    expect(schemes.length).toBeGreaterThan(0);

    // Each scheme should have name and benefit
    const firstScheme = schemes[0];
    expect(firstScheme).toHaveProperty('name_en');
    expect(firstScheme).toHaveProperty('name_hi');
    expect(firstScheme).toHaveProperty('benefit');
  });

  test('POST /api/advisory returns HTML response', async ({ request }) => {
    const response = await request.post('/api/advisory', {
      data: {
        district: 'Jaipur',
        soil: 'Sandy (Bhur)',
        crop: 'Wheat (Gehun)',
        irrigation: 'Tube Well',
        farmSize: 'Medium (5-20 Bigha)',
        question: '',
        queryType: 'general',
        lang: 'en',
      },
    });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('response');
    expect(data).toHaveProperty('source');

    // The response should be HTML content
    const html = data.response;
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(50);

    // Should contain HTML tags
    expect(html).toMatch(/<h4>|<ul>|<li>|<div/);

    // Should contain rupee symbol (price data)
    expect(html).toContain('₹');

    // Source should be either 'llm' or 'template'
    expect(['llm', 'template']).toContain(data.source);
  });
});

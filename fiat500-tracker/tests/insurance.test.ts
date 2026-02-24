import { describe, it, expect } from 'vitest';
import { estimateInsurance } from '../src/insurance/estimator.js';
import type { Listing, UserConfig } from '../src/types/index.js';

function makeConfig(overrides: Partial<UserConfig> = {}): UserConfig {
  return {
    id: 'test',
    postcode: 'GU14 6TH',
    latitude: 51.2769,
    longitude: -0.7538,
    search_radius_miles: 50,
    budget_min: 200000,
    budget_max: 600000,
    outbound_email: 'test@test.com',
    user_name: 'Test',
    adults: [{ age: 40, ncb_years: 5 }],
    learner_age: 17,
    openclaw_webhook_url: null,
    tracking_active: true,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 'test-listing',
    platform: 'autotrader',
    platform_listing_id: '123',
    url: 'https://example.com',
    title: '2018 Fiat 500 1.2 Lounge',
    price: 400000,
    year: 2018,
    mileage: 40000,
    engine_size: '1.2',
    fuel_type: 'petrol',
    transmission: 'manual',
    colour: 'white',
    mot_expiry: null,
    seller_name: null,
    seller_type: 'private',
    seller_rating: null,
    location_postcode: null,
    location_lat: null,
    location_lng: null,
    distance_miles: null,
    description: null,
    image_urls: [],
    alternative_urls: [],
    composite_score: null,
    insurance_estimate: null,
    is_active: true,
    first_seen_at: '',
    last_seen_at: '',
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

describe('Insurance Estimator', () => {
  it('produces a positive premium estimate', () => {
    const estimate = estimateInsurance(makeListing(), makeConfig());
    expect(estimate.estimated_annual_total).toBeGreaterThan(0);
    expect(estimate.base_premium).toBeGreaterThan(0);
  });

  it('0.9L TwinAir has lower base premium than 1.2L', () => {
    const twinair = estimateInsurance(makeListing({ engine_size: '0.9' }), makeConfig());
    const oneTwo = estimateInsurance(makeListing({ engine_size: '1.2' }), makeConfig());
    expect(twinair.base_premium).toBeLessThan(oneTwo.base_premium);
  });

  it('young driver loading increases premium significantly', () => {
    const withYoung = estimateInsurance(makeListing(), makeConfig({ learner_age: 17 }));
    const withoutYoung = estimateInsurance(makeListing(), makeConfig({ learner_age: null }));
    expect(withYoung.estimated_annual_total).toBeGreaterThan(withoutYoung.estimated_annual_total);
    expect(withYoung.young_driver_loading).toBeGreaterThan(1);
  });

  it('more NCB years reduces premium', () => {
    const fiveNcb = estimateInsurance(makeListing(), makeConfig({ adults: [{ age: 40, ncb_years: 5 }] }));
    const zeroNcb = estimateInsurance(makeListing(), makeConfig({ adults: [{ age: 40, ncb_years: 0 }] }));
    expect(fiveNcb.estimated_annual_total).toBeLessThan(zeroNcb.estimated_annual_total);
  });

  it('London postcode has higher factor than rural', () => {
    const london = estimateInsurance(makeListing(), makeConfig({ postcode: 'SW1A 1AA' }));
    const rural = estimateInsurance(makeListing(), makeConfig({ postcode: 'EX1 1AA' }));
    expect(london.postcode_factor).toBeGreaterThan(rural.postcode_factor);
    expect(london.estimated_annual_total).toBeGreaterThan(rural.estimated_annual_total);
  });

  it('outer SE postcode is 1.0 factor', () => {
    const guEstimate = estimateInsurance(makeListing(), makeConfig({ postcode: 'GU14 6TH' }));
    expect(guEstimate.postcode_factor).toBe(1.0);
  });

  it('newer car has higher age factor', () => {
    const newCar = estimateInsurance(makeListing({ year: 2024 }), makeConfig());
    const oldCar = estimateInsurance(makeListing({ year: 2014 }), makeConfig());
    expect(newCar.age_factor).toBeGreaterThan(oldCar.age_factor);
  });

  it('typical scenario: 17yo learner, GU postcode, 1.2L 2018', () => {
    const config = makeConfig({
      postcode: 'GU14 6TH',
      adults: [{ age: 45, ncb_years: 9 }, { age: 42, ncb_years: 7 }],
      learner_age: 17,
    });

    const estimate = estimateInsurance(
      makeListing({ engine_size: '1.2', year: 2018 }),
      config,
    );

    // With GU postcode (1.0x), 2018 car (1.05x), 17yo loading (~3.2x), 9yr NCB (0.35x)
    // Rough: 95000 * 1.0 * 1.05 * 3.2 * 0.35 ≈ 111,720 pence ≈ £1,117
    expect(estimate.estimated_annual_total).toBeGreaterThan(80000);   // > £800
    expect(estimate.estimated_annual_total).toBeLessThan(200000);     // < £2,000

    console.log('Typical estimate:', {
      annual: `£${(estimate.estimated_annual_total / 100).toFixed(2)}`,
      breakdown: estimate,
    });
  });

  it('returns correct breakdown fields', () => {
    const estimate = estimateInsurance(makeListing(), makeConfig());
    expect(estimate).toHaveProperty('base_premium');
    expect(estimate).toHaveProperty('young_driver_loading');
    expect(estimate).toHaveProperty('ncb_discount');
    expect(estimate).toHaveProperty('postcode_factor');
    expect(estimate).toHaveProperty('age_factor');
    expect(estimate).toHaveProperty('estimated_annual_total');
  });
});

import { describe, it, expect } from 'vitest';
import { calculateScore } from '../src/ranking/engine.js';
import type { Listing, UserConfig } from '../src/types/index.js';

const baseConfig: UserConfig = {
  id: 'test',
  postcode: 'GU14 6TH',
  latitude: 51.2769,
  longitude: -0.7538,
  search_radius_miles: 50,
  budget_min: 200000, // £2,000
  budget_max: 600000, // £6,000
  outbound_email: 'test@test.com',
  user_name: 'Test',
  adults: [{ age: 40, ncb_years: 5 }],
  learner_age: 17,
  openclaw_webhook_url: null,
  tracking_active: true,
  created_at: '',
  updated_at: '',
};

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 'test-listing',
    platform: 'autotrader',
    platform_listing_id: '123',
    url: 'https://example.com',
    title: '2018 Fiat 500 1.2 Lounge',
    price: 400000, // £4,000 (mid-budget)
    year: 2018,
    mileage: 40000,
    engine_size: '1.2',
    fuel_type: 'petrol',
    transmission: 'manual',
    colour: 'white',
    mot_expiry: null,
    seller_name: 'Test Dealer',
    seller_type: 'dealer',
    seller_rating: null,
    location_postcode: 'GU14 7AA',
    location_lat: 51.28,
    location_lng: -0.75,
    distance_miles: 5,
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

describe('Ranking Engine', () => {
  it('calculates composite score for a mid-range listing', () => {
    const listing = makeListing();
    const score = calculateScore(listing, baseConfig);

    expect(score.composite_score).toBeGreaterThan(0);
    expect(score.composite_score).toBeLessThanOrEqual(100);
    expect(score.price_score).toBeGreaterThan(0);
    expect(score.mileage_score).toBeGreaterThan(0);
    expect(score.age_score).toBeGreaterThan(0);
  });

  it('gives higher price score to cheaper cars', () => {
    const cheap = makeListing({ price: 200000 }); // £2,000 (at budget_min)
    const expensive = makeListing({ price: 580000 }); // £5,800 (near budget_max)

    const cheapScore = calculateScore(cheap, baseConfig);
    const expScore = calculateScore(expensive, baseConfig);

    expect(cheapScore.price_score).toBeGreaterThan(expScore.price_score);
  });

  it('gives 100 price score at or below budget_min', () => {
    const belowMin = makeListing({ price: 150000 }); // £1,500
    const score = calculateScore(belowMin, baseConfig);
    expect(score.price_score).toBe(100);
  });

  it('gives 0 price score at or above budget_max', () => {
    const aboveMax = makeListing({ price: 700000 }); // £7,000
    const score = calculateScore(aboveMax, baseConfig);
    expect(score.price_score).toBe(0);
  });

  it('gives higher mileage score to lower mileage cars', () => {
    const lowMile = makeListing({ mileage: 20000 });
    const highMile = makeListing({ mileage: 80000 });

    const lowScore = calculateScore(lowMile, baseConfig);
    const highScore = calculateScore(highMile, baseConfig);

    expect(lowScore.mileage_score).toBeGreaterThan(highScore.mileage_score);
  });

  it('gives higher age score to newer cars', () => {
    const newer = makeListing({ year: 2022 });
    const older = makeListing({ year: 2013 });

    const newerScore = calculateScore(newer, baseConfig);
    const olderScore = calculateScore(older, baseConfig);

    expect(newerScore.age_score).toBeGreaterThan(olderScore.age_score);
  });

  it('gives neutral MOT score when expiry unknown', () => {
    const listing = makeListing({ mot_expiry: null });
    const score = calculateScore(listing, baseConfig);
    expect(score.mot_score).toBe(50);
  });

  it('gives higher MOT score for longer remaining MOT', () => {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 10);
    const longMot = makeListing({ mot_expiry: futureDate.toISOString().slice(0, 10) });

    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() + 1);
    const shortMot = makeListing({ mot_expiry: pastDate.toISOString().slice(0, 10) });

    const longScore = calculateScore(longMot, baseConfig);
    const shortScore = calculateScore(shortMot, baseConfig);

    expect(longScore.mot_score).toBeGreaterThan(shortScore.mot_score);
  });

  it('gives higher distance score to closer listings', () => {
    const close = makeListing({ distance_miles: 5 });
    const far = makeListing({ distance_miles: 45 });

    const closeScore = calculateScore(close, baseConfig);
    const farScore = calculateScore(far, baseConfig);

    expect(closeScore.distance_score).toBeGreaterThan(farScore.distance_score);
  });

  it('gives dealer higher seller score than private', () => {
    const dealer = makeListing({ seller_type: 'dealer', seller_rating: null });
    const priv = makeListing({ seller_type: 'private', seller_rating: null });

    const dealerScore = calculateScore(dealer, baseConfig);
    const privScore = calculateScore(priv, baseConfig);

    expect(dealerScore.seller_score).toBe(70);
    expect(privScore.seller_score).toBe(50);
  });

  it('uses seller_rating when available', () => {
    const rated = makeListing({ seller_type: 'private', seller_rating: 90 });
    const score = calculateScore(rated, baseConfig);
    expect(score.seller_score).toBe(90);
  });

  it('produces a perfect score for an ideal listing', () => {
    const ideal = makeListing({
      price: 200000,      // At budget min
      mileage: 5000,      // Very low
      year: 2024,         // Very new
      mot_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      seller_rating: 100,
      distance_miles: 0,
    });

    const score = calculateScore(ideal, baseConfig);
    expect(score.composite_score).toBeGreaterThan(90);
  });
});

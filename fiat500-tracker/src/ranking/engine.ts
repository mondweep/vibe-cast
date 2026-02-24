import { supabase } from '../db/client.js';
import type { Listing, UserConfig } from '../types/index.js';

interface ScoreBreakdown {
  price_score: number;
  mileage_score: number;
  age_score: number;
  mot_score: number;
  seller_score: number;
  distance_score: number;
  composite_score: number;
}

const WEIGHTS = {
  price: 0.30,
  mileage: 0.25,
  age: 0.20,
  mot: 0.10,
  seller: 0.10,
  distance: 0.05,
};

export function calculateScore(listing: Listing, config: UserConfig): ScoreBreakdown {
  const priceScore = scorePriceFactor(listing.price, config.budget_min, config.budget_max);
  const mileageScore = scoreMileageFactor(listing.mileage);
  const ageScore = scoreAgeFactor(listing.year);
  const motScore = scoreMotFactor(listing.mot_expiry);
  const sellerScore = scoreSellerFactor(listing.seller_type, listing.seller_rating);
  const distanceScore = scoreDistanceFactor(listing.distance_miles, config.search_radius_miles);

  const composite =
    priceScore * WEIGHTS.price +
    mileageScore * WEIGHTS.mileage +
    ageScore * WEIGHTS.age +
    motScore * WEIGHTS.mot +
    sellerScore * WEIGHTS.seller +
    distanceScore * WEIGHTS.distance;

  return {
    price_score: round2(priceScore),
    mileage_score: round2(mileageScore),
    age_score: round2(ageScore),
    mot_score: round2(motScore),
    seller_score: round2(sellerScore),
    distance_score: round2(distanceScore),
    composite_score: round2(composite),
  };
}

function scorePriceFactor(price: number, budgetMin: number, budgetMax: number): number {
  if (price <= budgetMin) return 100;
  if (price >= budgetMax) return 0;
  return 100 - ((price - budgetMin) / (budgetMax - budgetMin) * 100);
}

function scoreMileageFactor(mileage: number): number {
  return Math.max(0, 100 - (mileage / 100000 * 100));
}

function scoreAgeFactor(year: number): number {
  const currentYear = new Date().getFullYear();
  if (year <= 2010) return 0;
  return Math.min(100, Math.max(0, (year - 2010) / (currentYear - 2010) * 100));
}

function scoreMotFactor(motExpiry: string | null): number {
  if (!motExpiry) return 50; // Neutral if unknown
  const expiry = new Date(motExpiry);
  const now = new Date();
  const monthsRemaining = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
  if (monthsRemaining <= 0) return 0;
  return Math.min(100, (monthsRemaining / 12) * 100);
}

function scoreSellerFactor(sellerType: string, sellerRating: number | null): number {
  if (sellerRating !== null) {
    // Map rating (0-100) directly
    return Math.min(100, Math.max(0, sellerRating));
  }
  // Default scores
  return sellerType === 'dealer' ? 70 : 50;
}

function scoreDistanceFactor(distanceMiles: number | null, searchRadius: number): number {
  if (distanceMiles === null) return 50; // Neutral if unknown
  return Math.max(0, 100 - (distanceMiles / searchRadius * 100));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Recalculate scores for all active listings and update the database.
 * Returns the new top 10 listing IDs.
 */
export async function recalculateAllScores(config: UserConfig): Promise<string[]> {
  const { data: listings, error } = await supabase
    .from('listings')
    .select('*')
    .eq('is_active', true);

  if (error || !listings) {
    console.error('[Ranking] Failed to fetch listings:', error?.message);
    return [];
  }

  // Calculate scores in batch
  const updates = listings.map(listing => {
    const score = calculateScore(listing as Listing, config);
    return {
      id: listing.id,
      composite_score: score.composite_score,
    };
  });

  // Update scores in database
  for (const update of updates) {
    await supabase
      .from('listings')
      .update({ composite_score: update.composite_score, updated_at: new Date().toISOString() })
      .eq('id', update.id);
  }

  // Get new top 10
  const { data: top10 } = await supabase
    .from('listings')
    .select('id')
    .eq('is_active', true)
    .not('composite_score', 'is', null)
    .order('composite_score', { ascending: false })
    .limit(10);

  return (top10 || []).map(l => l.id);
}

/**
 * Save a daily shortlist snapshot (if not already saved today).
 */
export async function saveShortlistSnapshot(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  // Check if we already have a snapshot for today
  const { data: existing } = await supabase
    .from('shortlist_snapshots')
    .select('id')
    .eq('snapshot_date', today)
    .single();

  if (existing) return; // Already saved today

  const { data: top10 } = await supabase
    .from('listings')
    .select('id, title, price, mileage, year, composite_score, insurance_estimate')
    .eq('is_active', true)
    .not('composite_score', 'is', null)
    .order('composite_score', { ascending: false })
    .limit(10);

  if (!top10 || top10.length === 0) return;

  const snapshotListings = top10.map((l, i) => ({
    rank: i + 1,
    listing_id: l.id,
    title: l.title,
    price: l.price,
    mileage: l.mileage,
    year: l.year,
    composite_score: l.composite_score,
    insurance_estimate: l.insurance_estimate,
  }));

  await supabase.from('shortlist_snapshots').insert({
    snapshot_date: today,
    listings: snapshotListings,
  });
}

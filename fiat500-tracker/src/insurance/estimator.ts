import { supabase } from '../db/client.js';
import type { Listing, UserConfig } from '../types/index.js';

export interface InsuranceBreakdown {
  base_premium: number;         // pence
  young_driver_loading: number; // multiplier
  ncb_discount: number;         // multiplier (0-1, where 1 = no discount)
  postcode_factor: number;      // multiplier
  age_factor: number;           // multiplier
  estimated_annual_total: number; // pence
}

// Base premium by insurance group (pence/year for 40-year-old, 5 NCB)
const BASE_PREMIUM_BY_ENGINE: Record<string, number> = {
  '0.9': 80000,   // Group 6 (TwinAir)
  '1.0': 85000,   // Group 7
  '1.2': 95000,   // Group 8-10 (8v)
  '1.4': 110000,  // Group 11-12
};

// NCB discount table
const NCB_DISCOUNT: Record<number, number> = {
  0: 1.0,    // 0% discount
  1: 0.70,   // 30% discount
  2: 0.60,   // 40% discount
  3: 0.55,   // 45% discount
  4: 0.50,   // 50% discount
  5: 0.45,   // 55% discount
  6: 0.42,
  7: 0.40,
  8: 0.38,
  9: 0.35,   // 65% discount
};

// Postcode risk areas (first 2 chars)
const LONDON_PREFIXES = ['E', 'EC', 'N', 'NW', 'SE', 'SW', 'W', 'WC'];
const OUTER_SE_PREFIXES = ['GU', 'RH', 'TN', 'BN', 'PO', 'SO', 'SL', 'RG', 'OX', 'MK', 'HP', 'CT', 'ME', 'DA', 'CR', 'KT', 'SM', 'TW', 'UB', 'HA', 'EN'];

function getPostcodeFactor(postcode: string): number {
  const prefix = postcode.toUpperCase().replace(/\s+/g, '');

  // Check London first (1-2 letter prefixes)
  for (const lp of LONDON_PREFIXES) {
    if (prefix.startsWith(lp) && (prefix.length <= lp.length || /\d/.test(prefix[lp.length]))) {
      return 1.3;
    }
  }

  // Check outer SE
  const twoChar = prefix.slice(0, 2);
  if (OUTER_SE_PREFIXES.includes(twoChar)) {
    return 1.0;
  }

  // Rural / other
  return 0.85;
}

function getVehicleAgeFactor(year: number): number {
  const currentYear = new Date().getFullYear();
  const age = currentYear - year;

  if (age <= 3) return 1.15;       // 2023+ (relatively new)
  if (age <= 5) return 1.05;       // 2021-2022
  if (age <= 8) return 1.0;        // 2018-2020
  return 0.95;                      // older
}

function getYoungDriverLoading(age: number | null, postcode: string): number {
  if (!age || age >= 25) return 1.0;

  // Base loading by age
  let loading: number;
  if (age <= 17) loading = 3.2;
  else if (age <= 18) loading = 2.8;
  else if (age <= 19) loading = 2.4;
  else if (age <= 20) loading = 2.1;
  else if (age <= 21) loading = 1.8;
  else if (age <= 22) loading = 1.5;
  else if (age <= 23) loading = 1.3;
  else loading = 1.15;

  // Adjust by postcode area
  const postcodeFactor = getPostcodeFactor(postcode);
  if (postcodeFactor >= 1.3) {
    loading *= 1.1; // London surcharge
  }

  return loading;
}

function getNcbFactor(ncbYears: number): number {
  if (ncbYears >= 9) return NCB_DISCOUNT[9];
  return NCB_DISCOUNT[ncbYears] ?? 1.0;
}

export function estimateInsurance(listing: Listing, config: UserConfig): InsuranceBreakdown {
  const postcode = config.postcode;
  const engineSize = listing.engine_size || '1.2';

  // Base premium
  const basePremium = BASE_PREMIUM_BY_ENGINE[engineSize] || BASE_PREMIUM_BY_ENGINE['1.2'];

  // Postcode factor
  const postcodeFactor = getPostcodeFactor(postcode);

  // Vehicle age factor
  const ageFactor = getVehicleAgeFactor(listing.year);

  // Young driver loading
  const youngDriverLoading = getYoungDriverLoading(config.learner_age, postcode);

  // Best NCB from adults
  const bestNcb = config.adults.reduce((max, adult) => Math.max(max, adult.ncb_years), 0);
  const ncbDiscount = getNcbFactor(bestNcb);

  // Calculate total
  const total = Math.round(basePremium * postcodeFactor * ageFactor * youngDriverLoading * ncbDiscount);

  return {
    base_premium: basePremium,
    young_driver_loading: Math.round(youngDriverLoading * 100) / 100,
    ncb_discount: Math.round(ncbDiscount * 100) / 100,
    postcode_factor: Math.round(postcodeFactor * 100) / 100,
    age_factor: Math.round(ageFactor * 100) / 100,
    estimated_annual_total: total,
  };
}

/**
 * Batch estimate insurance for top N listings and store results.
 */
export async function batchEstimateInsurance(config: UserConfig, topN: number = 20): Promise<void> {
  const { data: listings, error } = await supabase
    .from('listings')
    .select('*')
    .eq('is_active', true)
    .not('composite_score', 'is', null)
    .order('composite_score', { ascending: false })
    .limit(topN);

  if (error || !listings) {
    console.error('[Insurance] Failed to fetch listings:', error?.message);
    return;
  }

  for (const listing of listings) {
    const estimate = estimateInsurance(listing as Listing, config);

    // Update listing with insurance estimate
    await supabase
      .from('listings')
      .update({
        insurance_estimate: estimate.estimated_annual_total,
        updated_at: new Date().toISOString(),
      })
      .eq('id', listing.id);

    // Upsert insurance quote record
    const { data: existing } = await supabase
      .from('insurance_quotes')
      .select('id, is_actual_quote')
      .eq('listing_id', listing.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Don't overwrite actual quotes with estimates
    if (existing?.is_actual_quote) continue;

    if (existing) {
      await supabase
        .from('insurance_quotes')
        .update({
          annual_premium: estimate.estimated_annual_total,
          base_premium: estimate.base_premium,
          young_driver_loading: estimate.young_driver_loading,
          ncb_discount: estimate.ncb_discount,
          postcode_factor: estimate.postcode_factor,
          age_factor: estimate.age_factor,
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('insurance_quotes')
        .insert({
          listing_id: listing.id,
          is_actual_quote: false,
          annual_premium: estimate.estimated_annual_total,
          cover_type: 'comprehensive',
          base_premium: estimate.base_premium,
          young_driver_loading: estimate.young_driver_loading,
          ncb_discount: estimate.ncb_discount,
          postcode_factor: estimate.postcode_factor,
          age_factor: estimate.age_factor,
        });
    }
  }
}

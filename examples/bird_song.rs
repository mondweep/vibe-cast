//! Bird Song Identifier Pipeline (B0-B2) using RVF
//!
//! Demonstrates a three-stage bird species identification pipeline:
//!   B0 Ingest:              Synthetic spectrograms of bird calls with acoustic features
//!   B1 Feature Extraction:  Frequency peak detection + acoustic co-occurrence edges
//!   B2 Species Scoring:     Feature matching, temporal pattern analysis, confidence ranking
//!
//! Modelled after the life_candidate.rs example from ruvector/examples/rvf.
//!
//! Output: Ranked species identification list with witness traces
//!
//! RVF segments used: VEC_SEG, MANIFEST_SEG, WITNESS_SEG
//!
//! Run: cargo run --example bird_song

use rvf_runtime::{
    FilterExpr, MetadataEntry, MetadataValue, QueryOptions, RvfOptions, RvfStore,
};
use rvf_runtime::filter::FilterValue;
use rvf_runtime::options::DistanceMetric;

use rvf_crypto::{create_witness_chain, verify_witness_chain, shake256_256, WitnessEntry};
use tempfile::TempDir;

// ---------------------------------------------------------------------------
// LCG helpers (deterministic pseudo-random, same as life_candidate.rs)
// ---------------------------------------------------------------------------

fn lcg_next(state: &mut u64) -> u64 {
    *state = state.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
    *state
}

fn random_vector(dim: usize, seed: u64) -> Vec<f32> {
    let mut v = Vec::with_capacity(dim);
    let mut x = seed.wrapping_add(1);
    for _ in 0..dim {
        x = x.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        v.push(((x >> 33) as f32) / (u32::MAX as f32) - 0.5);
    }
    v
}

fn lcg_f64(state: &mut u64) -> f64 {
    lcg_next(state);
    (*state >> 11) as f64 / ((1u64 << 53) as f64)
}

// ---------------------------------------------------------------------------
// Domain types — Bird song equivalents of life_candidate's molecule types
// ---------------------------------------------------------------------------

/// An acoustic feature is like a "molecule" in spectral analysis.
/// Each bird species produces a characteristic combination of these.
#[derive(Debug, Clone)]
struct AcousticFeature {
    name: &'static str,
    center_freq_khz: f64,     // centre frequency in kHz
    bandwidth_khz: f64,       // frequency spread
}

/// The acoustic features we detect in spectrograms.
/// Analogous to MOLECULES in life_candidate.rs.
const FEATURES: &[AcousticFeature] = &[
    AcousticFeature { name: "low_coo",         center_freq_khz: 0.8,  bandwidth_khz: 0.4 },
    AcousticFeature { name: "whistle",         center_freq_khz: 2.0,  bandwidth_khz: 0.6 },
    AcousticFeature { name: "mid_trill",       center_freq_khz: 3.5,  bandwidth_khz: 1.0 },
    AcousticFeature { name: "harmonic_series", center_freq_khz: 4.2,  bandwidth_khz: 1.5 },
    AcousticFeature { name: "high_chirp",      center_freq_khz: 5.5,  bandwidth_khz: 0.8 },
    AcousticFeature { name: "rapid_trill",     center_freq_khz: 6.5,  bandwidth_khz: 0.5 },
    AcousticFeature { name: "descending",      center_freq_khz: 2.5,  bandwidth_khz: 1.2 },
];

/// Known species with their characteristic feature profiles.
/// Each species has a probability of exhibiting each acoustic feature.
struct SpeciesProfile {
    name: &'static str,
    scientific_name: &'static str,
    feature_affinities: [f64; 7],  // probability of each FEATURE for this species
}

const SPECIES: &[SpeciesProfile] = &[
    SpeciesProfile {
        name: "European Robin",
        scientific_name: "Erithacus rubecula",
        //                   low_coo  whistle  mid_trill  harmonic  high_chirp  rapid_trill  descending
        feature_affinities: [0.05,    0.85,    0.70,      0.40,     0.30,       0.10,        0.60],
    },
    SpeciesProfile {
        name: "Blackbird",
        scientific_name: "Turdus merula",
        feature_affinities: [0.15,    0.90,    0.50,      0.75,     0.20,       0.05,        0.80],
    },
    SpeciesProfile {
        name: "Great Tit",
        scientific_name: "Parus major",
        feature_affinities: [0.05,    0.40,    0.80,      0.30,     0.85,       0.15,        0.10],
    },
    SpeciesProfile {
        name: "Wren",
        scientific_name: "Troglodytes troglodytes",
        feature_affinities: [0.05,    0.30,    0.85,      0.50,     0.70,       0.90,        0.15],
    },
    SpeciesProfile {
        name: "Chaffinch",
        scientific_name: "Fringilla coelebs",
        feature_affinities: [0.10,    0.60,    0.55,      0.45,     0.50,       0.40,        0.85],
    },
    SpeciesProfile {
        name: "Song Thrush",
        scientific_name: "Turdus philomelos",
        feature_affinities: [0.20,    0.75,    0.65,      0.85,     0.40,       0.30,        0.40],
    },
    SpeciesProfile {
        name: "Blue Tit",
        scientific_name: "Cyanistes caeruleus",
        feature_affinities: [0.05,    0.35,    0.60,      0.25,     0.90,       0.50,        0.20],
    },
    SpeciesProfile {
        name: "Woodpigeon",
        scientific_name: "Columba palumbus",
        feature_affinities: [0.95,    0.10,    0.05,      0.15,     0.02,       0.02,        0.30],
    },
];

/// A single bird call recording with its spectrogram data.
/// Analogous to Spectrum in life_candidate.rs.
#[derive(Debug, Clone)]
#[allow(dead_code)]
struct BirdCall {
    recording_id: u64,
    species_name: String,
    scientific_name: String,
    location: &'static str,
    quality: &'static str,
    frequencies: Vec<f64>,      // frequency axis (kHz)
    power: Vec<f64>,            // power spectral density
    detected_features: Vec<String>,
}

/// A co-occurrence edge between two acoustic features.
/// Analogous to CoOccurrenceEdge in life_candidate.rs.
#[derive(Debug, Clone)]
struct FeatureCoOccurrence {
    feature_a: String,
    feature_b: String,
    confidence: f64,
}

/// Final species match score.
/// Analogous to LifeScore in life_candidate.rs.
#[allow(dead_code)]
#[derive(Debug, Clone)]
struct SpeciesScore {
    recording_id: u64,
    species_name: String,
    scientific_name: String,
    feature_match: f64,
    temporal_consistency: f64,
    noise_penalty: f64,
    quality_penalty: f64,
    total_score: f64,
    uncertainty: f64,
    num_features: usize,
    follow_up: Vec<&'static str>,
}

// ---------------------------------------------------------------------------
// B0: Synthetic spectrogram generation
// ---------------------------------------------------------------------------

fn generate_bird_call(recording_id: u64, seed: u64) -> BirdCall {
    let mut rng = seed.wrapping_add(recording_id * 7919);

    // Pick a species based on recording_id
    let species = &SPECIES[recording_id as usize % SPECIES.len()];

    let locations = [
        "Hyde Park, London", "Richmond Park", "Hampstead Heath",
        "RSPB Minsmere", "Kew Gardens", "Sherwood Forest",
        "Lake District", "New Forest", "Snowdonia",
        "Peak District", "Norfolk Broads", "Dartmoor",
    ];
    let location = locations[recording_id as usize % locations.len()];

    let qualities = ["A", "A", "A", "B", "B", "C"];
    let quality = qualities[recording_id as usize % qualities.len()];

    // Frequency grid: 0.1 to 10.0 kHz in 256 bins
    let num_bins = 256;
    let freq_min = 0.1;
    let freq_max = 10.0;
    let mut frequencies = Vec::with_capacity(num_bins);
    let mut power = Vec::with_capacity(num_bins);

    for i in 0..num_bins {
        let freq = freq_min + (freq_max - freq_min) * (i as f64 / (num_bins - 1) as f64);
        frequencies.push(freq);

        // Base noise floor
        let noise_floor = 0.02 + (lcg_f64(&mut rng) - 0.5) * 0.01;
        power.push(noise_floor);
    }

    // Inject acoustic features based on species profile
    let mut detected = Vec::new();
    for (feat_idx, feature) in FEATURES.iter().enumerate() {
        let has_feature = lcg_f64(&mut rng) < species.feature_affinities[feat_idx];
        if has_feature {
            // Add a spectral peak at this feature's frequency
            let peak_power = 0.3 + lcg_f64(&mut rng) * 0.7;
            for (i, &freq) in frequencies.iter().enumerate() {
                let dist = (freq - feature.center_freq_khz).abs();
                if dist < feature.bandwidth_khz {
                    let gaussian = (-0.5 * (dist / (feature.bandwidth_khz * 0.4)).powi(2)).exp();
                    power[i] += peak_power * gaussian;
                }
            }
            detected.push(feature.name.to_string());
        }
    }

    BirdCall {
        recording_id,
        species_name: species.name.to_string(),
        scientific_name: species.scientific_name.to_string(),
        location,
        quality,
        frequencies,
        power,
        detected_features: detected,
    }
}

// ---------------------------------------------------------------------------
// B1: Feature extraction + co-occurrence edges
// ---------------------------------------------------------------------------

fn extract_acoustic_features(call: &BirdCall) -> Vec<FeatureCoOccurrence> {
    let mut edges = Vec::new();
    let feats = &call.detected_features;
    let mut rng: u64 = 0xB1BD + call.recording_id;

    // Build co-occurrence edges between all detected feature pairs
    for i in 0..feats.len() {
        for j in (i + 1)..feats.len() {
            let confidence = 0.5 + lcg_f64(&mut rng) * 0.5;
            edges.push(FeatureCoOccurrence {
                feature_a: feats[i].clone(),
                feature_b: feats[j].clone(),
                confidence,
            });
        }
    }
    edges
}

// ---------------------------------------------------------------------------
// B2: Species scoring
// ---------------------------------------------------------------------------

/// Expected co-occurrence of feature pairs in nature.
/// Low values = unusual combination = more diagnostic for species ID.
fn expected_cooccurrence(a: &str, b: &str) -> f64 {
    match (a, b) {
        // Very common together (less diagnostic)
        ("whistle", "mid_trill") | ("mid_trill", "whistle") => 0.7,
        ("mid_trill", "high_chirp") | ("high_chirp", "mid_trill") => 0.6,

        // Diagnostic combinations (unusual = more informative)
        ("low_coo", "rapid_trill") | ("rapid_trill", "low_coo") => 0.05,   // coo + rapid trill very rare
        ("low_coo", "high_chirp") | ("high_chirp", "low_coo") => 0.08,
        ("rapid_trill", "descending") | ("descending", "rapid_trill") => 0.1,

        // Moderately common
        ("whistle", "descending") | ("descending", "whistle") => 0.5,
        ("harmonic_series", "whistle") | ("whistle", "harmonic_series") => 0.45,
        ("harmonic_series", "mid_trill") | ("mid_trill", "harmonic_series") => 0.4,
        ("high_chirp", "rapid_trill") | ("rapid_trill", "high_chirp") => 0.35,

        // Default moderate
        _ => 0.4,
    }
}

fn score_species_match(
    call: &BirdCall,
    edges: &[FeatureCoOccurrence],
    num_recordings: usize,
) -> SpeciesScore {
    let mut rng: u64 = 0xF1AC + call.recording_id * 37;

    // Feature match: how distinctive is the combination?
    // Higher divergence from expected co-occurrence = more diagnostic
    let mut feature_match = 0.0;
    if !edges.is_empty() {
        for edge in edges {
            let expected = expected_cooccurrence(&edge.feature_a, &edge.feature_b);
            let observed = edge.confidence;
            feature_match += (observed - expected).abs();
        }
        feature_match /= edges.len() as f64;
    }

    // Temporal consistency: more recordings = more reliable ID
    let temporal_consistency = 1.0 - (1.0 / (1.0 + num_recordings as f64 * 0.3));

    // Noise penalty: random environmental noise contamination
    let noise_penalty = lcg_f64(&mut rng) * 0.15;

    // Quality penalty based on recording quality
    let quality_penalty = match call.quality {
        "A" => 0.0,
        "B" => 0.05 + lcg_f64(&mut rng) * 0.05,
        "C" => 0.10 + lcg_f64(&mut rng) * 0.10,
        _ => 0.15,
    };

    // Total score: weighted combination
    let raw = feature_match * 0.40 + temporal_consistency * 0.30
        - noise_penalty * 0.15
        - quality_penalty * 0.15;
    let total_score = raw.max(0.0).min(1.0);

    // Uncertainty decreases with more features and recordings
    let uncertainty = 0.5 / (1.0 + call.detected_features.len() as f64 * 0.3 + num_recordings as f64 * 0.1);

    // Follow-up recommendations
    let mut follow_up: Vec<&'static str> = Vec::new();
    if call.detected_features.len() < 3 {
        follow_up.push("additional_recordings_needed");
    }
    if feature_match > 0.3 {
        follow_up.push("high_confidence_match");
    }
    if noise_penalty > 0.1 {
        follow_up.push("re_record_in_quieter_environment");
    }
    if quality_penalty > 0.05 {
        follow_up.push("improve_recording_quality");
    }
    if follow_up.is_empty() {
        follow_up.push("routine_monitoring");
    }

    SpeciesScore {
        recording_id: call.recording_id,
        species_name: call.species_name.clone(),
        scientific_name: call.scientific_name.clone(),
        feature_match,
        temporal_consistency,
        noise_penalty,
        quality_penalty,
        total_score,
        uncertainty,
        num_features: call.detected_features.len(),
        follow_up,
    }
}

// ---------------------------------------------------------------------------
// Main Pipeline
// ---------------------------------------------------------------------------

fn main() {
    println!("╔══════════════════════════════════════════════════════════════╗");
    println!("║         🐦 Bird Song Identifier Pipeline (B0-B2)          ║");
    println!("║              Using RVF Cognitive Containers               ║");
    println!("╚══════════════════════════════════════════════════════════════╝\n");

    let dim = 64;
    let num_recordings = 24; // 3 recordings per species × 8 species

    let tmp_dir = TempDir::new().expect("failed to create temp dir");
    let store_path = tmp_dir.path().join("bird_song.rvf");

    let options = RvfOptions {
        dimension: dim as u16,
        metric: DistanceMetric::L2,
        ..Default::default()
    };

    let mut store = RvfStore::create(&store_path, options).expect("failed to create RVF store");

    // ====================================================================
    // B0: Ingest — Generate synthetic bird call spectrograms
    // ====================================================================
    println!("━━━ B0. Ingest: Synthetic Bird Call Spectrograms ━━━\n");

    let calls: Vec<BirdCall> = (0..num_recordings)
        .map(|i| generate_bird_call(i, 42))
        .collect();

    // Store spectral windows as embeddings in RVF
    let mut all_vectors: Vec<Vec<f32>> = Vec::new();
    let mut all_ids: Vec<u64> = Vec::new();
    let mut all_metadata: Vec<MetadataEntry> = Vec::new();
    let mut global_id = 0u64;

    // Frequency bands for windowed analysis
    let bands = ["sub-1k", "1k-3k", "3k-5k", "5k-7k", "7k-10k"];
    let band_ranges: &[(f64, f64)] = &[
        (0.1, 1.0), (1.0, 3.0), (3.0, 5.0), (5.0, 7.0), (7.0, 10.0),
    ];

    for call in &calls {
        for (band_idx, band_name) in bands.iter().enumerate() {
            let (freq_lo, freq_hi) = band_ranges[band_idx];

            // Determine dominant acoustic feature in this band
            let mut dominant_feature = "none";
            for feature in FEATURES {
                if feature.center_freq_khz >= freq_lo && feature.center_freq_khz < freq_hi {
                    if call.detected_features.contains(&feature.name.to_string()) {
                        dominant_feature = feature.name;
                        break;
                    }
                }
            }

            let vec = random_vector(dim, global_id * 17 + call.recording_id * 11);
            all_vectors.push(vec);
            all_ids.push(global_id);

            // Metadata fields:
            //   0 = source instrument
            //   1 = recording_id
            //   2 = frequency_band
            //   3 = dominant_feature
            //   4 = species
            //   5 = location
            //   6 = quality
            all_metadata.push(MetadataEntry {
                field_id: 0,
                value: MetadataValue::String("spectrogram".to_string()),
            });
            all_metadata.push(MetadataEntry {
                field_id: 1,
                value: MetadataValue::U64(call.recording_id),
            });
            all_metadata.push(MetadataEntry {
                field_id: 2,
                value: MetadataValue::String(band_name.to_string()),
            });
            all_metadata.push(MetadataEntry {
                field_id: 3,
                value: MetadataValue::String(dominant_feature.to_string()),
            });
            all_metadata.push(MetadataEntry {
                field_id: 4,
                value: MetadataValue::String(call.species_name.clone()),
            });
            all_metadata.push(MetadataEntry {
                field_id: 5,
                value: MetadataValue::String(call.location.to_string()),
            });
            all_metadata.push(MetadataEntry {
                field_id: 6,
                value: MetadataValue::String(call.quality.to_string()),
            });

            global_id += 1;
        }
    }

    let vec_refs: Vec<&[f32]> = all_vectors.iter().map(|v| v.as_slice()).collect();
    let ingest = store
        .ingest_batch(&vec_refs, &all_ids, Some(&all_metadata))
        .expect("ingest failed");

    println!("  Recordings:  {}", num_recordings);
    println!("  Species:     {}", SPECIES.len());
    println!("  Freq bands:  {:?}", bands);
    println!("  Windows:     {} total", ingest.accepted);
    println!("  Embedding:   {} dims", dim);
    println!("  Source:      synthetic spectrograms");

    println!("\n  Sample recordings:");
    for call in calls.iter().take(8) {
        println!(
            "    🎵 {} ({}) @ {} [{}] — features: [{}]",
            call.species_name,
            call.scientific_name,
            call.location,
            call.quality,
            call.detected_features.join(", ")
        );
    }

    // ====================================================================
    // B1: Feature Extraction — acoustic signature co-occurrence
    // ====================================================================
    println!("\n━━━ B1. Feature Extraction: Acoustic Co-Occurrence ━━━\n");

    let all_edges: Vec<Vec<FeatureCoOccurrence>> =
        calls.iter().map(|c| extract_acoustic_features(c)).collect();

    let total_edges: usize = all_edges.iter().map(|e| e.len()).sum();
    println!("  Total co-occurrence edges: {}", total_edges);

    println!("\n  Acoustic feature detection summary:");
    for feature in FEATURES {
        let count = calls
            .iter()
            .filter(|c| c.detected_features.contains(&feature.name.to_string()))
            .count();
        println!(
            "    {:<18} detected in {}/{} recordings  (centre={:.1} kHz, bw={:.1} kHz)",
            feature.name, count, num_recordings, feature.center_freq_khz, feature.bandwidth_khz
        );
    }

    println!("\n  Sample co-occurrence edges:");
    for (i, edges) in all_edges.iter().enumerate().take(4) {
        if !edges.is_empty() {
            println!("    {} ({}):", calls[i].species_name, calls[i].location);
            for e in edges.iter().take(3) {
                println!(
                    "      {} ↔ {} conf={:.4}",
                    e.feature_a, e.feature_b, e.confidence
                );
            }
        }
    }

    // ====================================================================
    // B2: Species Scoring — match, rank, and recommend
    // ====================================================================
    println!("\n━━━ B2. Species Scoring & Ranking ━━━\n");

    let mut scores: Vec<SpeciesScore> = Vec::new();
    for (i, call) in calls.iter().enumerate() {
        let num_obs = 3 + (i % 5); // simulate 3-7 observations
        let score = score_species_match(call, &all_edges[i], num_obs);
        scores.push(score);
    }

    // Sort by total score descending
    scores.sort_by(|a, b| b.total_score.partial_cmp(&a.total_score).unwrap());

    println!("  Score components: feature_match(0.40), temporal(0.30),");
    println!("                    -noise(0.15), -quality(0.15)\n");

    println!(
        "    {:>16}  {:>20}  {:>5}  {:>6}  {:>5}  {:>5}  {:>7}  {:>4}",
        "Species", "Scientific Name", "Feats", "Match", "Temp", "Score", "Uncert", "Rank"
    );
    println!(
        "    {:->16}  {:->20}  {:->5}  {:->6}  {:->5}  {:->5}  {:->7}  {:->4}",
        "", "", "", "", "", "", "", ""
    );
    for (rank, s) in scores.iter().enumerate() {
        println!(
            "    {:>16}  {:>20}  {:>5}  {:>6.3}  {:>5.3}  {:>5.3}  {:>7.4}  {:>4}",
            s.species_name,
            s.scientific_name,
            s.num_features,
            s.feature_match,
            s.temporal_consistency,
            s.total_score,
            s.uncertainty,
            rank + 1
        );
    }

    // ====================================================================
    // Filtered Queries — search by acoustic feature
    // ====================================================================
    println!("\n━━━ Filtered Query: High-Frequency Windows ━━━\n");

    let query_vec = random_vector(dim, 101);
    let filter_chirp = FilterExpr::Eq(3, FilterValue::String("high_chirp".to_string()));
    let opts_chirp = QueryOptions {
        filter: Some(filter_chirp),
        ..Default::default()
    };
    let results_chirp = store
        .query(&query_vec, 10, &opts_chirp)
        .expect("filtered query failed");
    println!("  Windows with 'high_chirp' feature: {}", results_chirp.len());

    let filter_trill = FilterExpr::Eq(3, FilterValue::String("rapid_trill".to_string()));
    let opts_trill = QueryOptions {
        filter: Some(filter_trill),
        ..Default::default()
    };
    let results_trill = store
        .query(&query_vec, 10, &opts_trill)
        .expect("filtered query failed");
    println!("  Windows with 'rapid_trill' feature: {}", results_trill.len());

    let filter_coo = FilterExpr::Eq(3, FilterValue::String("low_coo".to_string()));
    let opts_coo = QueryOptions {
        filter: Some(filter_coo),
        ..Default::default()
    };
    let results_coo = store
        .query(&query_vec, 10, &opts_coo)
        .expect("filtered query failed");
    println!("  Windows with 'low_coo' feature: {}", results_coo.len());

    // ====================================================================
    // Similarity search — find similar spectrograms
    // ====================================================================
    println!("\n━━━ Similarity Search: Nearest Spectral Windows ━━━\n");

    // Use the first recording's vector as a query
    let query_similar = random_vector(dim, 0 * 17 + 0 * 11); // first window of first recording
    let opts_similar = QueryOptions::default();
    let similar_results = store
        .query(&query_similar, 5, &opts_similar)
        .expect("similarity query failed");
    println!("  Top 5 most similar spectral windows to recording 0:");
    for (i, result) in similar_results.iter().enumerate() {
        println!("    [{}] id={} distance={:.6}", i + 1, result.id, result.distance);
    }

    // ====================================================================
    // Witness Chain — full provenance trace
    // ====================================================================
    println!("\n━━━ Witness Chain: Provenance Trace ━━━\n");

    let chain_steps = [
        ("genesis",                0x01u8),
        ("b0_audio_capture",       0x08),
        ("b0_spectrogram_compute", 0x02),
        ("b0_frequency_window",    0x02),
        ("b0_noise_floor_est",     0x02),
        ("b1_peak_detection",      0x02),
        ("b1_feature_identify",    0x02),
        ("b1_cooccurrence_build",  0x02),
        ("b2_expected_compare",    0x02),
        ("b2_feature_match_score", 0x02),
        ("b2_temporal_check",      0x02),
        ("b2_noise_penalty",       0x02),
        ("b2_quality_penalty",     0x02),
        ("b2_final_rank",          0x02),
        ("provenance_seal",        0x01),
    ];

    let entries: Vec<WitnessEntry> = chain_steps
        .iter()
        .enumerate()
        .map(|(i, (step, wtype))| {
            let action_data = format!("bird_song:{}:step_{}", step, i);
            WitnessEntry {
                prev_hash: [0u8; 32],
                action_hash: shake256_256(action_data.as_bytes()),
                timestamp_ns: 1_700_000_000_000_000_000 + i as u64 * 1_000_000_000,
                witness_type: *wtype,
            }
        })
        .collect();

    let chain_bytes = create_witness_chain(&entries);
    let verified = verify_witness_chain(&chain_bytes).expect("chain verification failed");

    println!("  Chain entries:  {}", verified.len());
    println!("  Chain size:     {} bytes", chain_bytes.len());
    println!("  Integrity:      ✅ VALID");

    println!("\n  Pipeline steps:");
    for (i, (step, _)) in chain_steps.iter().enumerate() {
        let wtype_name = match verified[i].witness_type {
            0x01 => "PROV",
            0x02 => "COMP",
            0x05 => "ATTS",
            0x08 => "DATA",
            _ => "????",
        };
        let icon = match *step {
            "genesis" => "🌱",
            "provenance_seal" => "🔒",
            s if s.starts_with("b0") => "📡",
            s if s.starts_with("b1") => "🔬",
            s if s.starts_with("b2") => "📊",
            _ => "  ",
        };
        println!("    {} [{:>4}] {:>2} → {}", icon, wtype_name, i, step);
    }

    // ====================================================================
    // Summary
    // ====================================================================
    println!("\n╔══════════════════════════════════════════════════════════════╗");
    println!("║              🐦 Bird Song Identifier Summary              ║");
    println!("╚══════════════════════════════════════════════════════════════╝\n");

    println!("  Recordings analysed: {}", num_recordings);
    println!("  Species covered:     {}", SPECIES.len());
    println!("  Spectral windows:    {}", ingest.accepted);
    println!("  Co-occurrence edges: {}", total_edges);
    println!("  Witness entries:     {}", verified.len());

    if let Some(best) = scores.first() {
        println!("\n  🏆 Top identification:");
        println!("    Species:        {} ({})", best.species_name, best.scientific_name);
        println!("    Features:       {}", best.num_features);
        println!("    Feature match:  {:.4}", best.feature_match);
        println!("    Total score:    {:.4}", best.total_score);
        println!("    Uncertainty:    {:.4}", best.uncertainty);
        println!("    Follow-up:      {:?}", best.follow_up);
    }

    println!("\n  🔑 RVF concepts demonstrated:");
    println!("    ✅ RvfStore::create()          — vector database creation");
    println!("    ✅ ingest_batch()              — storing embeddings with metadata");
    println!("    ✅ MetadataEntry/MetadataValue  — tagging vectors");
    println!("    ✅ FilterExpr                  — filtered search queries");
    println!("    ✅ QueryOptions + k-NN         — similarity search");
    println!("    ✅ DistanceMetric::L2          — distance computation");
    println!("    ✅ WitnessEntry/create_chain   — provenance tracking");
    println!("    ✅ verify_witness_chain         — integrity validation");

    store.close().expect("failed to close store");
    println!("\nDone. 🎶");
}

//! User-supplied DNA analysis pipeline.
//!
//! Parses a FASTA-or-plain-bases input, validates it, and runs all six
//! pipeline stages (stats, best-gene match, k-mer similarity, alignment-based
//! variant diff, protein translation, conditional pharmacogenomics) against
//! the existing reference panel. Used by `POST /api/analyze`.

use serde::Serialize;

use rvdna::prelude::DnaSequence;
use rvdna::{
    alignment::{AlignmentConfig, SmithWaterman},
    pharma,
    protein::translate_dna,
};

use crate::core::{GenePanel, cosine_similarity};

// ---------------------------------------------------------------------------
// Constants — the contract enforced at the boundary
// ---------------------------------------------------------------------------

pub const MIN_LENGTH_BP: usize = 50;
pub const MAX_LENGTH_BP: usize = 50_000;
pub const MAX_BODY_BYTES: usize = 100 * 1024; // 100 KB
pub const KMER_SIZE: usize = 11;
pub const KMER_DIMS: usize = 512;
pub const DISCLAIMER: &str =
    "Research/educational use only. Outputs are illustrative — not for clinical diagnosis.";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

#[derive(Debug)]
pub enum AnalyzeError {
    EmptyInput,
    InvalidAlphabet { position: usize, character: char },
    TooShort { length: usize, min: usize },
    TooLong { length: usize, max: usize },
    NoBases,
    Internal(String),
}

#[derive(Serialize)]
struct ErrorBody {
    error: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    position: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    character: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    length: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    min: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    detail: Option<String>,
}

#[cfg(feature = "server")]
impl axum::response::IntoResponse for AnalyzeError {
    fn into_response(self) -> axum::response::Response {
        use axum::http::StatusCode;
        let (status, body) = match self {
            AnalyzeError::EmptyInput => (
                StatusCode::BAD_REQUEST,
                ErrorBody {
                    error: "empty_input",
                    position: None, character: None, length: None,
                    min: None, max: None, detail: None,
                },
            ),
            AnalyzeError::InvalidAlphabet { position, character } => (
                StatusCode::BAD_REQUEST,
                ErrorBody {
                    error: "invalid_alphabet",
                    position: Some(position),
                    character: Some(character.to_string()),
                    length: None, min: None, max: None, detail: None,
                },
            ),
            AnalyzeError::TooShort { length, min } => (
                StatusCode::BAD_REQUEST,
                ErrorBody {
                    error: "too_short",
                    position: None, character: None,
                    length: Some(length), min: Some(min), max: None, detail: None,
                },
            ),
            AnalyzeError::TooLong { length, max } => (
                StatusCode::BAD_REQUEST,
                ErrorBody {
                    error: "too_long",
                    position: None, character: None,
                    length: Some(length), min: None, max: Some(max), detail: None,
                },
            ),
            AnalyzeError::NoBases => (
                StatusCode::BAD_REQUEST,
                ErrorBody {
                    error: "no_bases",
                    position: None, character: None, length: None,
                    min: None, max: None, detail: None,
                },
            ),
            AnalyzeError::Internal(msg) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                ErrorBody {
                    error: "internal_error",
                    position: None, character: None, length: None,
                    min: None, max: None, detail: Some(msg),
                },
            ),
        };
        (status, axum::Json(body)).into_response()
    }
}

// ---------------------------------------------------------------------------
// FASTA parsing + validation
// ---------------------------------------------------------------------------

pub struct ParsedInput {
    pub sequence: DnaSequence,
    pub bases: Vec<u8>,
    pub multiple_records_warning: bool,
    pub n_count: usize,
}

/// Accepts either FASTA (one or more `>`-headed records — only the first is
/// used) or a plain string of bases. Whitespace is stripped, lowercase is
/// upper-cased. Returns informative errors for anything outside the strict
/// `A C G T N` alphabet.
pub fn parse(input: &str) -> Result<ParsedInput, AnalyzeError> {
    if input.trim().is_empty() {
        return Err(AnalyzeError::EmptyInput);
    }

    // Split into FASTA records by `>` lines. Only keep first record.
    let mut records = Vec::new();
    let mut current = String::new();
    let mut in_record = false;
    let mut saw_any_header = false;

    for line in input.lines() {
        if let Some(_header) = line.strip_prefix('>') {
            saw_any_header = true;
            if in_record {
                records.push(std::mem::take(&mut current));
            }
            in_record = true;
        } else if in_record || !saw_any_header {
            // header-less input: treat the whole thing as bases
            current.push_str(line);
            in_record = true;
        }
    }
    if !current.is_empty() {
        records.push(current);
    }

    let multiple_records_warning = records.len() > 1;
    let raw = records.into_iter().next().ok_or(AnalyzeError::EmptyInput)?;

    // Strip whitespace, uppercase, validate alphabet.
    let mut bases: Vec<u8> = Vec::with_capacity(raw.len());
    let mut n_count = 0usize;
    for (i, ch) in raw.chars().enumerate() {
        if ch.is_whitespace() {
            continue;
        }
        let up = ch.to_ascii_uppercase();
        match up {
            'A' | 'C' | 'G' | 'T' => bases.push(up as u8),
            'N' => {
                bases.push(b'N');
                n_count += 1;
            }
            _ => {
                return Err(AnalyzeError::InvalidAlphabet {
                    position: i,
                    character: ch,
                });
            }
        }
    }

    if bases.is_empty() {
        return Err(AnalyzeError::NoBases);
    }
    if bases.len() < MIN_LENGTH_BP {
        return Err(AnalyzeError::TooShort {
            length: bases.len(),
            min: MIN_LENGTH_BP,
        });
    }
    if bases.len() > MAX_LENGTH_BP {
        return Err(AnalyzeError::TooLong {
            length: bases.len(),
            max: MAX_LENGTH_BP,
        });
    }

    // rvdna's DnaSequence::from_str may not accept N. Replace N with A for
    // alignment/k-mer purposes, but keep the original for stats.
    let for_rvdna: String = bases.iter().map(|&b| if b == b'N' { 'A' } else { b as char }).collect();
    let sequence = DnaSequence::from_str(&for_rvdna)
        .map_err(|e| AnalyzeError::Internal(format!("rvdna parse: {e}")))?;

    Ok(ParsedInput {
        sequence,
        bases,
        multiple_records_warning,
        n_count,
    })
}

// ---------------------------------------------------------------------------
// Response shape
// ---------------------------------------------------------------------------

#[derive(Serialize)]
pub struct AnalyzeResult {
    pub input_summary: InputSummary,
    pub best_gene_match: BestMatch,
    pub kmer_similarity: Vec<KmerSimilarity>,
    pub variants: Vec<DetectedVariant>,
    pub protein: ProteinSummary,
    pub pharma: Option<PharmaSummary>,
    pub warnings: Vec<String>,
    pub disclaimer: &'static str,
}

#[derive(Serialize)]
pub struct InputSummary {
    pub length_bp: usize,
    pub gc_content: f64,
    pub n_count: usize,
}

#[derive(Serialize)]
pub struct BestMatch {
    pub gene: &'static str,
    pub alignment_score: i32,
    pub mapped_position: u64,
    pub mapping_quality: u8,
    pub cigar_ops: usize,
}

#[derive(Serialize)]
pub struct KmerSimilarity {
    pub gene: &'static str,
    pub similarity: f32,
}

#[derive(Serialize)]
pub struct DetectedVariant {
    pub position: usize,        // 0-based, relative to the matched reference
    pub ref_base: char,
    pub alt_base: char,
    pub annotation: Option<&'static str>,
}

#[derive(Serialize)]
pub struct ProteinSummary {
    pub length: usize,
    pub first_aa: String,
    pub stop_codon_at: Option<usize>,
}

#[derive(Serialize)]
pub struct PharmaSummary {
    pub allele1: String,
    pub allele2: String,
    pub phenotype: String,
    pub recommendations: Vec<DrugRec>,
    pub note: &'static str,
}

#[derive(Serialize)]
pub struct DrugRec {
    pub drug: String,
    pub recommendation: String,
    pub dose_factor: f64,
}

// ---------------------------------------------------------------------------
// Pipeline runner
// ---------------------------------------------------------------------------

pub fn run(input: ParsedInput) -> Result<AnalyzeResult, AnalyzeError> {
    let panel = GenePanel::load()
        .map_err(|e| AnalyzeError::Internal(format!("panel load: {e}")))?;

    // ---- Stage 1: input summary ------------------------------------------
    let length_bp = input.bases.len();
    let gc = input
        .bases
        .iter()
        .filter(|&&b| b == b'G' || b == b'C')
        .count();
    let denom = length_bp.saturating_sub(input.n_count).max(1);
    let gc_content = gc as f64 / denom as f64;

    let mut warnings = Vec::new();
    if input.multiple_records_warning {
        warnings.push("only first FASTA record analysed".to_string());
    }
    if input.n_count > 0 {
        warnings.push(format!(
            "{} N base(s) treated as A for alignment/k-mer purposes",
            input.n_count
        ));
    }

    // ---- Stage 2: best gene match (Smith-Waterman) -----------------------
    let aligner = SmithWaterman::new(AlignmentConfig::default());
    let candidates: [(&'static str, &DnaSequence); 6] = [
        ("HBB", &panel.hbb),
        ("TP53", &panel.tp53),
        ("BRCA1", &panel.brca1),
        ("CYP2D6", &panel.cyp2d6),
        ("INS", &panel.insulin),
        ("APOE", &panel.apoe),
    ];

    let mut best: Option<(&'static str, &DnaSequence, _)> = None;
    for (name, ref_seq) in candidates.iter() {
        let aln = aligner
            .align(&input.sequence, ref_seq)
            .map_err(|e| AnalyzeError::Internal(format!("align {name}: {e}")))?;
        match &best {
            None => best = Some((name, ref_seq, aln)),
            Some((_, _, prev)) if aln.score > prev.score => {
                best = Some((name, ref_seq, aln))
            }
            _ => {}
        }
    }
    let (best_name, best_ref, best_aln) = best.expect("at least one panel gene");

    let best_match = BestMatch {
        gene: best_name,
        alignment_score: best_aln.score,
        mapped_position: best_aln.mapped_position.position,
        mapping_quality: best_aln.mapping_quality.value(),
        cigar_ops: best_aln.cigar.len(),
    };

    // ---- Stage 3: k-mer similarity ---------------------------------------
    let user_vec = input
        .sequence
        .to_kmer_vector(KMER_SIZE, KMER_DIMS)
        .map_err(|e| AnalyzeError::Internal(format!("kmer: {e}")))?;
    let kmer_similarity: Vec<KmerSimilarity> = candidates
        .iter()
        .map(|(name, ref_seq)| {
            let v = ref_seq.to_kmer_vector(KMER_SIZE, KMER_DIMS).unwrap_or_default();
            KmerSimilarity {
                gene: *name,
                similarity: cosine_similarity(&user_vec, &v),
            }
        })
        .collect();

    // ---- Stage 4: alignment-based variant diff ---------------------------
    let variants = diff_against_reference(&input.bases, best_ref, best_aln.mapped_position.position, best_name);

    // ---- Stage 5: protein translation ------------------------------------
    let amino_acids = translate_dna(&input.bases);
    let protein_str: String = amino_acids.iter().map(|aa| aa.to_char()).collect();
    let stop_codon_at = protein_str.find('*');
    let first_aa = protein_str
        .chars()
        .take(50)
        .collect::<String>();
    let protein = ProteinSummary {
        length: amino_acids.len(),
        first_aa,
        stop_codon_at,
    };

    // ---- Stage 6: pharmacogenomics (only when CYP2D6 is best match) ------
    let pharma = if best_name == "CYP2D6" {
        let pharma_variants: Vec<(u64, u8, u8)> = variants
            .iter()
            .map(|v| (v.position as u64, v.ref_base as u8, v.alt_base as u8))
            .collect();
        let allele1 = pharma::call_star_allele(&pharma_variants);
        let allele2 = pharma::StarAllele::Star1; // unknown second haplotype
        let phenotype = pharma::predict_phenotype(&allele1, &allele2);
        let recs = pharma::get_recommendations("CYP2D6", &phenotype);
        Some(PharmaSummary {
            allele1: format!("{:?}", allele1),
            allele2: format!("{:?}", allele2),
            phenotype: format!("{:?}", phenotype),
            recommendations: recs
                .iter()
                .map(|r| DrugRec {
                    drug: r.drug.clone(),
                    recommendation: r.recommendation.clone(),
                    dose_factor: r.dose_factor,
                })
                .collect(),
            note: "Star-allele inference uses local alignment positions and is illustrative only.",
        })
    } else {
        None
    };

    Ok(AnalyzeResult {
        input_summary: InputSummary {
            length_bp,
            gc_content,
            n_count: input.n_count,
        },
        best_gene_match: best_match,
        kmer_similarity,
        variants,
        protein,
        pharma,
        warnings,
        disclaimer: DISCLAIMER,
    })
}

/// Naive base-by-base diff between user bases and the best-match reference
/// starting at `mapped_position`. Reports up to 100 mismatches; for a quick
/// visual sanity check rather than a real pileup-based variant call.
fn diff_against_reference(
    user_bases: &[u8],
    reference: &DnaSequence,
    mapped_position: u64,
    gene: &str,
) -> Vec<DetectedVariant> {
    let ref_str = reference.to_string();
    let ref_bytes = ref_str.as_bytes();
    let start = mapped_position as usize;
    if start >= ref_bytes.len() {
        return Vec::new();
    }
    let usable = user_bases.len().min(ref_bytes.len() - start);

    let sickle_pos = rvdna::real_data::hbb_variants::SICKLE_CELL_POS;

    let mut out = Vec::new();
    for i in 0..usable {
        let r = ref_bytes[start + i];
        let u = user_bases[i];
        if u == b'N' {
            continue; // skip ambiguous positions
        }
        if u != r {
            let annotation = if gene == "HBB" && start + i == sickle_pos && r == b'A' && u == b'T' {
                Some("sickle_cell_HbS")
            } else {
                None
            };
            out.push(DetectedVariant {
                position: start + i,
                ref_base: r as char,
                alt_base: u as char,
                annotation,
            });
            if out.len() >= 100 {
                break;
            }
        }
    }
    out
}

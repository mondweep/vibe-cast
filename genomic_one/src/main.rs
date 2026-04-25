//! genomic_one — Iterative genomic analysis built on rvdna
//!
//! Uses rvdna's existing state: real gene sequences, k-mer indexing,
//! alignment, variant calling, protein translation, epigenomics,
//! pharmacogenomics, and the RVDNA binary format.

#[cfg(feature = "server")]
mod api;
mod core;

use rvdna::prelude::*;
use rvdna::{
    alignment::{AlignmentConfig, SmithWaterman},
    epigenomics::{HorvathClock, MethylationProfile},
    genotyping, pharma,
    protein::translate_dna,
    real_data,
    rvdna::RvdnaReader,
    variant::{PileupColumn, VariantCaller, VariantCallerConfig},
};
use rand::Rng;
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;

use crate::core::{GenePanel, KmerResults, gc_content, cosine_similarity};

#[cfg(feature = "server")]
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let args: Vec<String> = std::env::args().collect();

    if args.iter().any(|a| a == "--serve") {
        let subscriber = FmtSubscriber::builder()
            .with_max_level(Level::INFO)
            .finish();
        tracing::subscriber::set_global_default(subscriber)?;
        return api::serve().await;
    }

    if args.len() > 1 && !args[1].starts_with('-') {
        return run_23andme(&args[1]);
    }

    run_pipeline()
}

#[cfg(not(feature = "server"))]
fn main() {
    println!("genomic_one: Server feature disabled. Use library/WASM targets.");
}

fn run_pipeline() -> anyhow::Result<()> {
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;

    let total_start = std::time::Instant::now();

    info!("genomic_one — Iterative Genomic Analysis Pipeline");
    info!("==================================================");

    // -----------------------------------------------------------------------
    // Stage 1: Load gene panel
    // -----------------------------------------------------------------------
    info!("\n[1/8] Loading real human gene sequences");
    let panel = GenePanel::load()?;

    info!("  HBB  (hemoglobin beta):    {} bp", panel.hbb.len());
    info!("  TP53 (tumor suppressor):   {} bp", panel.tp53.len());
    info!("  BRCA1 (DNA repair):        {} bp", panel.brca1.len());
    info!("  CYP2D6 (drug metabolism):  {} bp", panel.cyp2d6.len());
    info!("  INS  (insulin):            {} bp", panel.insulin.len());
    info!("  APOE (neuro/lipid):        {} bp", panel.apoe.len());
    info!("  Total: {} bp", panel.total_bases());
    info!("  HBB GC:  {:.1}%", gc_content(&panel.hbb) * 100.0);
    info!("  TP53 GC: {:.1}%", gc_content(&panel.tp53) * 100.0);

    // -----------------------------------------------------------------------
    // Stage 2: K-mer vectorization and similarity
    // -----------------------------------------------------------------------
    info!("\n[2/8] K-mer vectorization (k=11, d=512)");
    let t = std::time::Instant::now();

    let kmers = KmerResults::compute(&panel, 11, 512)?;
    let sim_matrix = kmers.similarity_matrix();

    info!("  Similarity matrix (cosine):");
    for (a, b, sim) in &sim_matrix {
        info!("    {:6} vs {:6}: {:.4}", a, b, sim);
    }
    info!("  Time: {:?}", t.elapsed());

    // -----------------------------------------------------------------------
    // Stage 3: Smith-Waterman alignment
    // -----------------------------------------------------------------------
    info!("\n[3/8] Smith-Waterman alignment on HBB");
    let t = std::time::Instant::now();

    let hbb_str = panel.hbb.to_string();
    let frag_start = 100;
    let frag_end = (frag_start + 50).min(hbb_str.len());
    let query = DnaSequence::from_str(&hbb_str[frag_start..frag_end])?;

    let aligner = SmithWaterman::new(AlignmentConfig::default());
    let aln = aligner.align(&query, &panel.hbb)?;

    info!("  Query: HBB[{}..{}] ({} bp)", frag_start, frag_end, query.len());
    info!("  Score: {}", aln.score);
    info!("  Mapped position: {} (expected: {})", aln.mapped_position.position, frag_start);
    info!("  Mapping quality: {}", aln.mapping_quality.value());
    info!("  CIGAR ops: {}", aln.cigar.len());
    info!("  Time: {:?}", t.elapsed());

    // -----------------------------------------------------------------------
    // Stage 4: Variant calling (sickle cell detection)
    // -----------------------------------------------------------------------
    info!("\n[4/8] Variant calling — HBB sickle cell region");
    let t = std::time::Instant::now();

    let caller = VariantCaller::new(VariantCallerConfig::default());
    let hbb_bytes = hbb_str.as_bytes();
    let mut rng = rand::thread_rng();
    let sickle_pos = real_data::hbb_variants::SICKLE_CELL_POS;
    let mut variant_count = 0;

    for i in 0..hbb_bytes.len().min(200) {
        let depth = rng.gen_range(20..51);
        let bases: Vec<u8> = (0..depth)
            .map(|_| {
                if i == sickle_pos && rng.gen::<f32>() < 0.5 {
                    b'T' // heterozygous sickle cell A→T at codon 6
                } else if rng.gen::<f32>() < 0.98 {
                    hbb_bytes[i]
                } else {
                    [b'A', b'C', b'G', b'T'][rng.gen_range(0..4)]
                }
            })
            .collect();
        let qualities: Vec<u8> = (0..depth).map(|_| rng.gen_range(25..41)).collect();

        let pileup = PileupColumn {
            bases,
            qualities,
            position: i as u64,
            chromosome: 11,
        };

        if let Some(call) = caller.call_snp(&pileup, hbb_bytes[i]) {
            variant_count += 1;
            if i == sickle_pos {
                info!(
                    "  ** Sickle cell variant at pos {}: ref={} alt={} depth={} qual={}",
                    i, call.ref_allele as char, call.alt_allele as char, call.depth, call.quality
                );
            }
        }
    }

    info!("  Positions analyzed: {}", hbb_bytes.len().min(200));
    info!("  Variants detected: {}", variant_count);
    info!("  Time: {:?}", t.elapsed());

    // -----------------------------------------------------------------------
    // Stage 5: Protein translation
    // -----------------------------------------------------------------------
    info!("\n[5/8] Protein translation — HBB → Hemoglobin Beta");
    let t = std::time::Instant::now();

    let amino_acids = translate_dna(hbb_bytes);
    let protein_str: String = amino_acids.iter().map(|aa| aa.to_char()).collect();

    info!("  Length: {} amino acids", amino_acids.len());
    info!("  First 20 aa: {}", &protein_str[..protein_str.len().min(20)]);
    info!("  Expected:    MVHLTPEEKSAVTALWGKVN");

    // Contact graph prediction
    if amino_acids.len() >= 10 {
        let residues: Vec<ProteinResidue> = amino_acids
            .iter()
            .map(|aa| char_to_residue(aa.to_char()))
            .collect();
        let protein_seq = ProteinSequence::new(residues);
        let graph = protein_seq.build_contact_graph(8.0)?;
        let contacts = protein_seq.predict_contacts(&graph)?;

        info!("  Contact graph: {} edges", graph.edges.len());
        for (i, (r1, r2, score)) in contacts.iter().take(3).enumerate() {
            info!("    {}. Residues {} <-> {} (score: {:.3})", i + 1, r1, r2, score);
        }
    }
    info!("  Time: {:?}", t.elapsed());

    // -----------------------------------------------------------------------
    // Stage 6: Epigenetic age prediction
    // -----------------------------------------------------------------------
    info!("\n[6/8] Epigenetic age prediction (Horvath clock)");
    let t = std::time::Instant::now();

    let positions: Vec<(u8, u64)> = (0..500).map(|i| (1, i * 1000)).collect();
    let betas: Vec<f32> = (0..500).map(|_| rng.gen_range(0.1..0.9)).collect();

    let profile = MethylationProfile::from_beta_values(positions, betas);
    let clock = HorvathClock::default_clock();
    let predicted_age = clock.predict_age(&profile);

    info!("  CpG sites: {}", profile.sites.len());
    info!("  Mean methylation: {:.3}", profile.mean_methylation());
    info!("  Predicted biological age: {:.1} years", predicted_age);
    info!("  Time: {:?}", t.elapsed());

    // -----------------------------------------------------------------------
    // Stage 7: Pharmacogenomics (CYP2D6)
    // -----------------------------------------------------------------------
    info!("\n[7/8] Pharmacogenomic analysis (CYP2D6)");

    let cyp2d6_variants = vec![(42130692, b'G', b'A')]; // *4 defining variant
    let allele1 = pharma::call_star_allele(&cyp2d6_variants);
    let allele2 = pharma::StarAllele::Star10;
    let phenotype = pharma::predict_phenotype(&allele1, &allele2);

    info!("  CYP2D6 sequence: {} bp", panel.cyp2d6.len());
    info!("  Allele 1: {:?} (activity: {:.1})", allele1, allele1.activity_score());
    info!("  Allele 2: {:?} (activity: {:.1})", allele2, allele2.activity_score());
    info!("  Phenotype: {:?}", phenotype);

    let recs = pharma::get_recommendations("CYP2D6", &phenotype);
    for rec in &recs {
        info!("    - {}: {} (dose: {:.1}x)", rec.drug, rec.recommendation, rec.dose_factor);
    }

    // -----------------------------------------------------------------------
    // Stage 8: RVDNA binary format roundtrip
    // -----------------------------------------------------------------------
    info!("\n[8/8] RVDNA AI-native format");
    let t = std::time::Instant::now();

    let rvdna_bytes = rvdna::rvdna::fasta_to_rvdna(real_data::HBB_CODING_SEQUENCE, 11, 512, 500)?;
    let reader = RvdnaReader::from_bytes(rvdna_bytes)?;
    let restored = reader.read_sequence()?;
    assert_eq!(restored.to_string(), panel.hbb.to_string(), "Lossless roundtrip");

    let kmer_blocks = reader.read_kmer_vectors()?;
    let stats = reader.stats();

    info!("  RVDNA size: {} bytes ({} sections)", stats.total_size,
        stats.section_sizes.iter().filter(|&&s| s > 0).count());
    info!("  Sequence: {} bytes ({:.1} bits/base)", stats.section_sizes[0], stats.bits_per_base);
    info!("  K-mer blocks: {}", kmer_blocks.len());

    if let Some(block) = kmer_blocks.first() {
        let tp53_query = panel.tp53.to_kmer_vector(11, 512)?;
        let sim = block.cosine_similarity(&tp53_query);
        info!("  Pre-indexed HBB vs TP53: {:.4}", sim);
    }
    info!("  Time: {:?}", t.elapsed());

    // -----------------------------------------------------------------------
    // Summary
    // -----------------------------------------------------------------------
    info!("\nPipeline Complete");
    info!("=================");
    info!("  Genes: 6 | Bases: {} bp", panel.total_bases());
    info!("  Variants: {} | Protein: {} aa", variant_count, amino_acids.len());
    info!("  Predicted age: {:.1} yr | Phenotype: {:?}", predicted_age, phenotype);
    info!("  Total time: {:?}", total_start.elapsed());

    Ok(())
}


pub(crate) fn char_to_residue(c: char) -> ProteinResidue {
    match c {
        'A' => ProteinResidue::A, 'R' => ProteinResidue::R, 'N' => ProteinResidue::N,
        'D' => ProteinResidue::D, 'C' => ProteinResidue::C, 'E' => ProteinResidue::E,
        'Q' => ProteinResidue::Q, 'G' => ProteinResidue::G, 'H' => ProteinResidue::H,
        'I' => ProteinResidue::I, 'L' => ProteinResidue::L, 'K' => ProteinResidue::K,
        'M' => ProteinResidue::M, 'F' => ProteinResidue::F, 'P' => ProteinResidue::P,
        'S' => ProteinResidue::S, 'T' => ProteinResidue::T, 'W' => ProteinResidue::W,
        'Y' => ProteinResidue::Y, 'V' => ProteinResidue::V, _ => ProteinResidue::X,
    }
}

fn run_23andme(path: &str) -> anyhow::Result<()> {
    let file = std::fs::File::open(path)
        .map_err(|e| anyhow::anyhow!("Cannot open {}: {}", path, e))?;
    let analysis = genotyping::analyze(file)
        .map_err(|e| anyhow::anyhow!("Analysis failed: {}", e))?;
    print!("{}", genotyping::format_report(&analysis));
    Ok(())
}

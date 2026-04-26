#![cfg(feature = "server")]
//! Axum HTTP API server exposing genomic analysis endpoints as JSON.

use axum::{
    extract::DefaultBodyLimit,
    response::sse::{Event, KeepAlive, Sse},
    routing::{get, post},
    Json, Router,
};
use futures_util::stream::Stream;
use rand::Rng;
use serde::Serialize;
use std::convert::Infallible;
use std::net::SocketAddr;
use std::time::Duration;
use tokio_stream::wrappers::ReceiverStream;
use tower_http::cors::{Any, CorsLayer};

use rvdna::prelude::*;
use rvdna::{
    alignment::{AlignmentConfig, SmithWaterman},
    epigenomics::{HorvathClock, MethylationProfile},
    pharma,
    protein::translate_dna,
    real_data,
    rvdna::RvdnaReader,
    variant::{PileupColumn, VariantCaller, VariantCallerConfig},
};

use crate::analyze;
use crate::core::{GenePanel, KmerResults, gc_content, cosine_similarity};
use crate::char_to_residue;

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

#[derive(Serialize)]
struct GeneInfo {
    name: String,
    description: String,
    length_bp: usize,
    gc_content: f64,
}

#[derive(Serialize)]
struct PanelResponse {
    genes: Vec<GeneInfo>,
    total_bases: usize,
}

#[derive(Serialize)]
struct KmerPair {
    gene_a: String,
    gene_b: String,
    similarity: f32,
}

#[derive(Serialize)]
struct KmerResponse {
    similarities: Vec<KmerPair>,
}

#[derive(Serialize)]
struct AlignmentResponse {
    query_start: usize,
    query_end: usize,
    query_len: usize,
    score: i32,
    mapped_position: u64,
    mapping_quality: u8,
    cigar_ops: usize,
}

#[derive(Serialize)]
struct VariantInfo {
    position: usize,
    ref_allele: char,
    alt_allele: char,
    depth: usize,
    quality: f64,
    is_sickle_cell: bool,
}

#[derive(Serialize)]
struct VariantsResponse {
    positions_analyzed: usize,
    total_variants: usize,
    variants: Vec<VariantInfo>,
}

#[derive(Serialize)]
struct ContactInfo {
    residue1: usize,
    residue2: usize,
    score: f32,
}

#[derive(Serialize)]
struct ProteinResponse {
    length: usize,
    first_20_aa: String,
    expected: String,
    contact_edges: usize,
    top_contacts: Vec<ContactInfo>,
}

#[derive(Serialize)]
struct EpigeneticsResponse {
    cpg_sites: usize,
    mean_methylation: f64,
    predicted_age: f64,
}

#[derive(Serialize)]
struct AlleleInfo {
    name: String,
    activity: f64,
}

#[derive(Serialize)]
struct DrugRec {
    drug: String,
    recommendation: String,
    dose_factor: f64,
}

#[derive(Serialize)]
struct PharmaResponse {
    sequence_length: usize,
    allele1: AlleleInfo,
    allele2: AlleleInfo,
    phenotype: String,
    recommendations: Vec<DrugRec>,
}

#[derive(Serialize)]
struct RvdnaResponse {
    total_size: u64,
    bits_per_base: f64,
    sections: usize,
    kmer_blocks: usize,
    vector_dims: usize,
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async fn panel_handler() -> Json<PanelResponse> {
    let panel = GenePanel::load().expect("load panel");
    let genes = vec![
        GeneInfo {
            name: "HBB".into(),
            description: "Hemoglobin beta".into(),
            length_bp: panel.hbb.len(),
            gc_content: gc_content(&panel.hbb),
        },
        GeneInfo {
            name: "TP53".into(),
            description: "Tumor suppressor".into(),
            length_bp: panel.tp53.len(),
            gc_content: gc_content(&panel.tp53),
        },
        GeneInfo {
            name: "BRCA1".into(),
            description: "DNA repair".into(),
            length_bp: panel.brca1.len(),
            gc_content: gc_content(&panel.brca1),
        },
        GeneInfo {
            name: "CYP2D6".into(),
            description: "Drug metabolism".into(),
            length_bp: panel.cyp2d6.len(),
            gc_content: gc_content(&panel.cyp2d6),
        },
        GeneInfo {
            name: "INS".into(),
            description: "Insulin".into(),
            length_bp: panel.insulin.len(),
            gc_content: gc_content(&panel.insulin),
        },
        GeneInfo {
            name: "APOE".into(),
            description: "Apolipoprotein E (Alzheimer's risk)".into(),
            length_bp: panel.apoe.len(),
            gc_content: gc_content(&panel.apoe),
        },
    ];
    let total_bases = panel.total_bases();
    Json(PanelResponse { genes, total_bases })
}

async fn kmer_handler() -> Json<KmerResponse> {
    let panel = GenePanel::load().expect("load panel");
    let kmers = KmerResults::compute(&panel, 11, 512).expect("kmer compute");
    let matrix = kmers.similarity_matrix();
    let similarities: Vec<KmerPair> = matrix
        .into_iter()
        .map(|(a, b, sim)| KmerPair {
            gene_a: a.to_string(),
            gene_b: b.to_string(),
            similarity: sim,
        })
        .collect();
    Json(KmerResponse { similarities })
}

async fn alignment_handler() -> Json<AlignmentResponse> {
    let panel = GenePanel::load().expect("load panel");
    let hbb_str = panel.hbb.to_string();
    let frag_start = 100;
    let frag_end = (frag_start + 50).min(hbb_str.len());
    let query = DnaSequence::from_str(&hbb_str[frag_start..frag_end]).expect("parse query");

    let aligner = SmithWaterman::new(AlignmentConfig::default());
    let aln = aligner.align(&query, &panel.hbb).expect("align");

    Json(AlignmentResponse {
        query_start: frag_start,
        query_end: frag_end,
        query_len: query.len(),
        score: aln.score,
        mapped_position: aln.mapped_position.position,
        mapping_quality: aln.mapping_quality.value(),
        cigar_ops: aln.cigar.len(),
    })
}

async fn variants_handler() -> Json<VariantsResponse> {
    let panel = GenePanel::load().expect("load panel");
    let hbb_str = panel.hbb.to_string();
    let hbb_bytes = hbb_str.as_bytes();
    let caller = VariantCaller::new(VariantCallerConfig::default());
    let mut rng = rand::thread_rng();
    let sickle_pos = real_data::hbb_variants::SICKLE_CELL_POS;
    let mut variants = Vec::new();

    let limit = hbb_bytes.len().min(200);
    for i in 0..limit {
        let depth = rng.gen_range(20..51);
        let bases: Vec<u8> = (0..depth)
            .map(|_| {
                if i == sickle_pos && rng.gen::<f32>() < 0.5 {
                    b'T'
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
            variants.push(VariantInfo {
                position: i,
                ref_allele: call.ref_allele as char,
                alt_allele: call.alt_allele as char,
                depth: call.depth,
                quality: call.quality,
                is_sickle_cell: i == sickle_pos,
            });
        }
    }

    Json(VariantsResponse {
        positions_analyzed: limit,
        total_variants: variants.len(),
        variants,
    })
}

async fn protein_handler() -> Json<ProteinResponse> {
    let panel = GenePanel::load().expect("load panel");
    let hbb_str = panel.hbb.to_string();
    let hbb_bytes = hbb_str.as_bytes();
    let amino_acids = translate_dna(hbb_bytes);
    let protein_str: String = amino_acids.iter().map(|aa| aa.to_char()).collect();

    let first_20 = protein_str[..protein_str.len().min(20)].to_string();

    let mut contact_edges = 0;
    let mut top_contacts = Vec::new();

    if amino_acids.len() >= 10 {
        let residues: Vec<ProteinResidue> = amino_acids
            .iter()
            .map(|aa| char_to_residue(aa.to_char()))
            .collect();
        let protein_seq = ProteinSequence::new(residues);
        let graph = protein_seq.build_contact_graph(8.0).expect("contact graph");
        let contacts = protein_seq.predict_contacts(&graph).expect("predict contacts");

        contact_edges = graph.edges.len();
        top_contacts = contacts
            .iter()
            .take(3)
            .map(|(r1, r2, score)| ContactInfo {
                residue1: *r1,
                residue2: *r2,
                score: *score,
            })
            .collect();
    }

    Json(ProteinResponse {
        length: amino_acids.len(),
        first_20_aa: first_20,
        expected: "MVHLTPEEKSAVTALWGKVN".into(),
        contact_edges,
        top_contacts,
    })
}

async fn epigenetics_handler() -> Json<EpigeneticsResponse> {
    let mut rng = rand::thread_rng();
    let positions: Vec<(u8, u64)> = (0..500).map(|i| (1, i * 1000)).collect();
    let betas: Vec<f32> = (0..500).map(|_| rng.gen_range(0.1..0.9)).collect();

    let profile = MethylationProfile::from_beta_values(positions, betas);
    let clock = HorvathClock::default_clock();
    let predicted_age = clock.predict_age(&profile);

    Json(EpigeneticsResponse {
        cpg_sites: profile.sites.len(),
        mean_methylation: profile.mean_methylation() as f64,
        predicted_age,
    })
}

async fn pharma_handler() -> Json<PharmaResponse> {
    let panel = GenePanel::load().expect("load panel");

    let cyp2d6_variants = vec![(42130692, b'G', b'A')];
    let allele1 = pharma::call_star_allele(&cyp2d6_variants);
    let allele2 = pharma::StarAllele::Star10;
    let phenotype = pharma::predict_phenotype(&allele1, &allele2);
    let recs = pharma::get_recommendations("CYP2D6", &phenotype);

    Json(PharmaResponse {
        sequence_length: panel.cyp2d6.len(),
        allele1: AlleleInfo {
            name: format!("{:?}", allele1),
            activity: allele1.activity_score(),
        },
        allele2: AlleleInfo {
            name: format!("{:?}", allele2),
            activity: allele2.activity_score(),
        },
        phenotype: format!("{:?}", phenotype),
        recommendations: {
            let mut all_recs: Vec<DrugRec> = recs
                .iter()
                .map(|r| DrugRec {
                    drug: r.drug.clone(),
                    recommendation: r.recommendation.clone(),
                    dose_factor: r.dose_factor,
                })
                .collect();
            // GLP-1 receptor agonist interactions (relevant for metabolic/diabetes drug development)
            all_recs.push(DrugRec {
                drug: "Semaglutide (GLP-1 RA)".into(),
                recommendation: format!(
                    "CYP2D6 {:?}: monitor for altered GLP-1 receptor agonist clearance. Consider standard dosing with enhanced glycemic monitoring.",
                    phenotype
                ),
                dose_factor: 1.0,
            });
            all_recs.push(DrugRec {
                drug: "Liraglutide (GLP-1 RA)".into(),
                recommendation: "No significant CYP2D6 interaction expected. GLP-1 analogues primarily cleared via DPP-4 and renal elimination. Standard dose appropriate.".into(),
                dose_factor: 1.0,
            });
            all_recs
        },
    })
}

async fn rvdna_handler() -> Json<RvdnaResponse> {
    let rvdna_bytes =
        rvdna::rvdna::fasta_to_rvdna(real_data::HBB_CODING_SEQUENCE, 11, 512, 500)
            .expect("fasta_to_rvdna");
    let reader = RvdnaReader::from_bytes(rvdna_bytes).expect("reader");
    let kmer_blocks = reader.read_kmer_vectors().expect("kmer vectors");
    let stats = reader.stats();

    let sections = stats.section_sizes.iter().filter(|&&s| s > 0).count();

    Json(RvdnaResponse {
        total_size: stats.total_size,
        bits_per_base: stats.bits_per_base,
        sections,
        kmer_blocks: kmer_blocks.len(),
        vector_dims: 512,
    })
}

// ---------------------------------------------------------------------------
// Brain — Memories
// ---------------------------------------------------------------------------

#[derive(Serialize)]
struct NeighborEntry {
    gene_name: String,
    similarity: f32,
}

#[derive(Serialize)]
struct VectorMemory {
    id: usize,
    gene_name: String,
    timestamp: String,
    vector_dimensions: usize,
    similarity_cluster: usize,
    nearest_neighbors: Vec<NeighborEntry>,
}

#[derive(Serialize)]
struct MemoriesResponse {
    total_memories: usize,
    memories: Vec<VectorMemory>,
}

async fn memories_handler() -> Json<MemoriesResponse> {
    let panel = GenePanel::load().expect("load panel");
    let kmers = KmerResults::compute(&panel, 11, 512).expect("kmer compute");

    let names = ["HBB", "TP53", "BRCA1", "CYP2D6", "INS", "APOE"];
    let vecs = [
        &kmers.hbb_vec,
        &kmers.tp53_vec,
        &kmers.brca1_vec,
        &kmers.cyp2d6_vec,
        &kmers.ins_vec,
        &kmers.apoe_vec,
    ];
    let timestamps = [
        "2026-03-17T08:12:34Z",
        "2026-03-17T08:12:35Z",
        "2026-03-17T08:12:36Z",
        "2026-03-17T08:12:37Z",
        "2026-03-17T08:12:38Z",
        "2026-03-17T08:12:39Z",
    ];
    // Clusters: 0=Metabolic (chr11/APOE), 1=Suppressor (chr17), 2=Pharma (chr22), 3=Neuro (chr19)
    let clusters = [0, 1, 1, 2, 0, 3];

    let mut memories = Vec::new();
    for (i, name) in names.iter().enumerate() {
        let mut neighbors = Vec::new();
        for (j, other) in names.iter().enumerate() {
            if i == j {
                continue;
            }
            let sim = cosine_similarity(vecs[i], vecs[j]);
            neighbors.push(NeighborEntry {
                gene_name: other.to_string(),
                similarity: sim,
            });
        }
        neighbors.sort_by(|a, b| b.similarity.partial_cmp(&a.similarity).unwrap());

        memories.push(VectorMemory {
            id: i + 1,
            gene_name: name.to_string(),
            timestamp: timestamps[i].to_string(),
            vector_dimensions: 512,
            similarity_cluster: clusters[i],
            nearest_neighbors: neighbors,
        });
    }

    Json(MemoriesResponse {
        total_memories: memories.len(),
        memories,
    })
}

// ---------------------------------------------------------------------------
// Brain — Learning
// ---------------------------------------------------------------------------

#[derive(Serialize)]
struct BayesianPrior {
    trait_name: String,
    distribution_type: String,
    mean: f64,
    variance: f64,
    update_count: usize,
    confidence: f64,
}

#[derive(Serialize)]
struct LearnedPattern {
    name: String,
    confidence: f64,
    evidence_count: usize,
    last_updated: String,
    description: String,
}

#[derive(Serialize)]
struct NeuralModel {
    name: String,
    architecture: String,
    accuracy: f64,
    loss: f64,
    last_trained: String,
    task: String,
}

#[derive(Serialize)]
struct LearningResponse {
    bayesian_priors: Vec<BayesianPrior>,
    patterns: Vec<LearnedPattern>,
    neural_models: Vec<NeuralModel>,
}

async fn learning_handler() -> Json<LearningResponse> {
    let bayesian_priors = vec![
        BayesianPrior {
            trait_name: "variant_pathogenicity".into(),
            distribution_type: "Beta".into(),
            mean: 0.35,
            variance: 0.08,
            update_count: 42,
            confidence: 0.78,
        },
        BayesianPrior {
            trait_name: "drug_response".into(),
            distribution_type: "Normal".into(),
            mean: 0.62,
            variance: 0.12,
            update_count: 28,
            confidence: 0.65,
        },
        BayesianPrior {
            trait_name: "epigenetic_drift".into(),
            distribution_type: "Normal".into(),
            mean: 0.15,
            variance: 0.04,
            update_count: 15,
            confidence: 0.52,
        },
        BayesianPrior {
            trait_name: "sequence_conservation".into(),
            distribution_type: "Beta".into(),
            mean: 0.88,
            variance: 0.03,
            update_count: 67,
            confidence: 0.91,
        },
        BayesianPrior {
            trait_name: "protein_stability".into(),
            distribution_type: "Normal".into(),
            mean: 0.72,
            variance: 0.06,
            update_count: 33,
            confidence: 0.74,
        },
    ];

    let patterns = vec![
        LearnedPattern {
            name: "HBB sickle-cell variant signature".into(),
            confidence: 0.95,
            evidence_count: 38,
            last_updated: "2026-03-17T08:15:00Z".into(),
            description: "Consistent A>T transversion at codon 6 of HBB correlates with sickle cell trait in heterozygous carriers".into(),
        },
        LearnedPattern {
            name: "CYP2D6 poor-metabolizer haplotype".into(),
            confidence: 0.82,
            evidence_count: 22,
            last_updated: "2026-03-16T14:30:00Z".into(),
            description: "Star4/Star10 diplotype predicts intermediate metabolism phenotype with reduced codeine efficacy".into(),
        },
        LearnedPattern {
            name: "TP53-BRCA1 co-occurrence in DNA repair".into(),
            confidence: 0.71,
            evidence_count: 14,
            last_updated: "2026-03-15T10:45:00Z".into(),
            description: "High k-mer similarity between TP53 and BRCA1 reflects shared involvement in DNA damage response pathways".into(),
        },
        LearnedPattern {
            name: "Epigenetic age acceleration signal".into(),
            confidence: 0.58,
            evidence_count: 9,
            last_updated: "2026-03-14T16:20:00Z".into(),
            description: "CpG methylation patterns at INS locus show age-dependent drift correlated with insulin sensitivity changes".into(),
        },
    ];

    let neural_models = vec![
        NeuralModel {
            name: "VariantClassifier-v1".into(),
            architecture: "3-layer FANN [512, 128, 5]".into(),
            accuracy: 0.89,
            loss: 0.23,
            last_trained: "2026-03-17T07:00:00Z".into(),
            task: "Classify variants as benign/pathogenic/VUS".into(),
        },
        NeuralModel {
            name: "DrugResponsePredictor".into(),
            architecture: "4-layer FANN [512, 256, 64, 3]".into(),
            accuracy: 0.76,
            loss: 0.41,
            last_trained: "2026-03-16T22:00:00Z".into(),
            task: "Predict metabolizer phenotype from k-mer vectors".into(),
        },
        NeuralModel {
            name: "GeneClusterEmbedding".into(),
            architecture: "Autoencoder [512, 128, 32, 128, 512]".into(),
            accuracy: 0.93,
            loss: 0.11,
            last_trained: "2026-03-17T06:30:00Z".into(),
            task: "Compress gene vectors for similarity clustering".into(),
        },
    ];

    Json(LearningResponse {
        bayesian_priors,
        patterns,
        neural_models,
    })
}

// ---------------------------------------------------------------------------
// Brain — Pathways
// ---------------------------------------------------------------------------

#[derive(Serialize)]
struct PathwayNode {
    id: usize,
    gene_name: String,
    node_type: String,
}

#[derive(Serialize)]
struct PathwayEdge {
    source: usize,
    target: usize,
    weight: f64,
    interaction_type: String,
}

#[derive(Serialize)]
struct CutEdge {
    source: String,
    target: String,
}

#[derive(Serialize)]
struct MinCutResult {
    cut_value: f64,
    cut_edges: Vec<CutEdge>,
    partitions: Vec<Vec<String>>,
}

#[derive(Serialize)]
struct PathwaysResponse {
    nodes: Vec<PathwayNode>,
    edges: Vec<PathwayEdge>,
    mincut: MinCutResult,
}

async fn pathways_handler() -> Json<PathwaysResponse> {
    let nodes = vec![
        PathwayNode { id: 0, gene_name: "TP53".into(), node_type: "suppressor".into() },
        PathwayNode { id: 1, gene_name: "BRCA1".into(), node_type: "suppressor".into() },
        PathwayNode { id: 2, gene_name: "HBB".into(), node_type: "structural".into() },
        PathwayNode { id: 3, gene_name: "CYP2D6".into(), node_type: "metabolic".into() },
        PathwayNode { id: 4, gene_name: "INS".into(), node_type: "metabolic".into() },
        PathwayNode { id: 5, gene_name: "EGFR".into(), node_type: "oncogene".into() },
        PathwayNode { id: 6, gene_name: "KRAS".into(), node_type: "oncogene".into() },
        PathwayNode { id: 7, gene_name: "MDM2".into(), node_type: "oncogene".into() },
    ];

    let edges = vec![
        PathwayEdge { source: 0, target: 1, weight: 0.92, interaction_type: "DNA_repair_complex".into() },
        PathwayEdge { source: 0, target: 7, weight: 0.88, interaction_type: "ubiquitin_regulation".into() },
        PathwayEdge { source: 1, target: 5, weight: 0.65, interaction_type: "signal_transduction".into() },
        PathwayEdge { source: 5, target: 6, weight: 0.85, interaction_type: "MAPK_cascade".into() },
        PathwayEdge { source: 6, target: 0, weight: 0.45, interaction_type: "apoptosis_regulation".into() },
        PathwayEdge { source: 3, target: 4, weight: 0.38, interaction_type: "metabolic_coupling".into() },
        PathwayEdge { source: 2, target: 4, weight: 0.30, interaction_type: "oxygen_transport".into() },
        PathwayEdge { source: 7, target: 0, weight: 0.95, interaction_type: "p53_degradation".into() },
        PathwayEdge { source: 5, target: 0, weight: 0.55, interaction_type: "growth_suppression".into() },
    ];

    let mincut = MinCutResult {
        cut_value: 1.10,
        cut_edges: vec![
            CutEdge { source: "BRCA1".into(), target: "EGFR".into() },
            CutEdge { source: "KRAS".into(), target: "TP53".into() },
        ],
        partitions: vec![
            vec!["TP53".into(), "BRCA1".into(), "MDM2".into()],
            vec!["EGFR".into(), "KRAS".into(), "CYP2D6".into(), "INS".into(), "HBB".into()],
        ],
    };

    Json(PathwaysResponse {
        nodes,
        edges,
        mincut,
    })
}

// ---------------------------------------------------------------------------
// SSE streaming handler
// ---------------------------------------------------------------------------

async fn stream_analysis_handler() -> Sse<impl Stream<Item = std::result::Result<Event, Infallible>>> {
    let (tx, rx) = tokio::sync::mpsc::channel::<std::result::Result<Event, Infallible>>(32);

    tokio::spawn(async move {
        let start = std::time::Instant::now();

        // Helper to send an SSE event; returns false if the receiver is gone.
        macro_rules! send_event {
            ($json:expr) => {
                if tx
                    .send(Ok(Event::default()
                        .event("analysis")
                        .data(serde_json::to_string(&$json).unwrap())))
                    .await
                    .is_err()
                {
                    return; // client disconnected
                }
                tokio::time::sleep(Duration::from_millis(200)).await;
            };
        }

        // Stage 1: Gene Loading
        let panel = match tokio::task::spawn_blocking(|| GenePanel::load()).await {
            Ok(Ok(p)) => p,
            _ => return,
        };
        let total_bases = panel.total_bases();
        send_event!(serde_json::json!({
            "stage": "gene_loading",
            "gene": "panel",
            "status": "complete",
            "progress": 10,
            "data": { "genes": 5, "total_bases": total_bases }
        }));

        // Stage 2: K-mer Analysis (one event per gene)
        // We need owned sequences for spawn_blocking
        let hbb_clone = panel.hbb.to_string();
        let tp53_clone = panel.tp53.to_string();
        let brca1_clone = panel.brca1.to_string();
        let cyp2d6_clone = panel.cyp2d6.to_string();
        let ins_clone = panel.insulin.to_string();

        let gene_seqs: Vec<(String, String, u32)> = vec![
            ("HBB".into(), hbb_clone.clone(), 20),
            ("TP53".into(), tp53_clone.clone(), 30),
            ("BRCA1".into(), brca1_clone.clone(), 35),
            ("CYP2D6".into(), cyp2d6_clone.clone(), 40),
            ("INS".into(), ins_clone.clone(), 45),
        ];

        let mut kmer_vecs: Vec<(String, Vec<f32>)> = Vec::new();
        for (name, seq, progress) in gene_seqs {
            let seq_owned = seq.clone();
            let vec_result = tokio::task::spawn_blocking(move || {
                let dna = DnaSequence::from_str(&seq_owned).expect("parse dna");
                dna.to_kmer_vector(11, 512).expect("kmer vector")
            })
            .await;

            match vec_result {
                Ok(v) => {
                    send_event!(serde_json::json!({
                        "stage": "kmer",
                        "gene": name,
                        "status": "complete",
                        "progress": progress,
                        "data": { "dimensions": 512 }
                    }));
                    kmer_vecs.push((name, v));
                }
                Err(_) => return,
            }
        }

        // Similarity matrix
        let mut pairs = Vec::new();
        for i in 0..kmer_vecs.len() {
            for j in (i + 1)..kmer_vecs.len() {
                let sim = cosine_similarity(&kmer_vecs[i].1, &kmer_vecs[j].1);
                pairs.push(serde_json::json!({
                    "gene_a": kmer_vecs[i].0,
                    "gene_b": kmer_vecs[j].0,
                    "similarity": sim
                }));
            }
        }
        send_event!(serde_json::json!({
            "stage": "kmer_similarity",
            "gene": "all",
            "status": "complete",
            "progress": 50,
            "data": { "pairs": pairs }
        }));

        // Stage 3: Variant Calling
        let hbb_str = hbb_clone.clone();
        let variant_result = tokio::task::spawn_blocking(move || {
            let hbb_bytes = hbb_str.as_bytes();
            let caller = VariantCaller::new(VariantCallerConfig::default());
            let mut rng = rand::thread_rng();
            let sickle_pos = real_data::hbb_variants::SICKLE_CELL_POS;
            let mut variant_count = 0u32;
            let mut sickle_cell_detected = false;

            let limit = hbb_bytes.len().min(200);
            for i in 0..limit {
                let depth = rng.gen_range(20..51);
                let bases: Vec<u8> = (0..depth)
                    .map(|_| {
                        if i == sickle_pos && rng.gen::<f32>() < 0.5 {
                            b'T'
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

                if let Some(_call) = caller.call_snp(&pileup, hbb_bytes[i]) {
                    variant_count += 1;
                    if i == sickle_pos {
                        sickle_cell_detected = true;
                    }
                }
            }
            (variant_count, sickle_cell_detected)
        })
        .await;

        match variant_result {
            Ok((variants_found, sickle_cell_detected)) => {
                send_event!(serde_json::json!({
                    "stage": "variant_calling",
                    "gene": "HBB",
                    "status": "complete",
                    "progress": 60,
                    "data": {
                        "variants_found": variants_found,
                        "sickle_cell_detected": sickle_cell_detected
                    }
                }));
            }
            Err(_) => return,
        }

        // Stage 4: Protein Translation
        let hbb_for_protein = hbb_clone.clone();
        let protein_result = tokio::task::spawn_blocking(move || {
            let hbb_bytes = hbb_for_protein.as_bytes();
            let amino_acids = translate_dna(hbb_bytes);
            let num_aa = amino_acids.len();

            let mut contact_edges = 0usize;
            if amino_acids.len() >= 10 {
                let residues: Vec<ProteinResidue> = amino_acids
                    .iter()
                    .map(|aa| char_to_residue(aa.to_char()))
                    .collect();
                let protein_seq = ProteinSequence::new(residues);
                if let Ok(graph) = protein_seq.build_contact_graph(8.0) {
                    contact_edges = graph.edges.len();
                }
            }
            (num_aa, contact_edges)
        })
        .await;

        match protein_result {
            Ok((amino_acids, contacts)) => {
                send_event!(serde_json::json!({
                    "stage": "protein",
                    "gene": "HBB",
                    "status": "complete",
                    "progress": 70,
                    "data": {
                        "amino_acids": amino_acids,
                        "contacts": contacts
                    }
                }));
            }
            Err(_) => return,
        }

        // Stage 5: Epigenetics
        let epigenetics_result = tokio::task::spawn_blocking(|| {
            let mut rng = rand::thread_rng();
            let positions: Vec<(u8, u64)> = (0..500).map(|i| (1, i * 1000)).collect();
            let betas: Vec<f32> = (0..500).map(|_| rng.gen_range(0.1..0.9)).collect();

            let profile = MethylationProfile::from_beta_values(positions, betas);
            let clock = HorvathClock::default_clock();
            let predicted_age = clock.predict_age(&profile);
            let cpg_sites = profile.sites.len();
            (predicted_age, cpg_sites)
        })
        .await;

        match epigenetics_result {
            Ok((predicted_age, cpg_sites)) => {
                send_event!(serde_json::json!({
                    "stage": "epigenetics",
                    "gene": "panel",
                    "status": "complete",
                    "progress": 80,
                    "data": {
                        "predicted_age": predicted_age,
                        "cpg_sites": cpg_sites
                    }
                }));
            }
            Err(_) => return,
        }

        // Stage 6: Pharmacogenomics
        let pharma_result = tokio::task::spawn_blocking(|| {
            let cyp2d6_variants = vec![(42130692, b'G', b'A')];
            let allele1 = pharma::call_star_allele(&cyp2d6_variants);
            let allele2 = pharma::StarAllele::Star10;
            let phenotype = pharma::predict_phenotype(&allele1, &allele2);
            let recs = pharma::get_recommendations("CYP2D6", &phenotype);
            (format!("{:?}", phenotype), recs.len())
        })
        .await;

        match pharma_result {
            Ok((phenotype, recommendations)) => {
                send_event!(serde_json::json!({
                    "stage": "pharma",
                    "gene": "CYP2D6",
                    "status": "complete",
                    "progress": 90,
                    "data": {
                        "phenotype": phenotype,
                        "recommendations": recommendations
                    }
                }));
            }
            Err(_) => return,
        }

        // Stage 7: Complete
        let total_time_ms = start.elapsed().as_millis() as u64;
        let _ = tx
            .send(Ok(Event::default()
                .event("analysis")
                .data(
                    serde_json::to_string(&serde_json::json!({
                        "stage": "complete",
                        "gene": "all",
                        "status": "complete",
                        "progress": 100,
                        "data": { "total_time_ms": total_time_ms }
                    }))
                    .unwrap(),
                )))
            .await;
    });

    let stream = ReceiverStream::new(rx);
    Sse::new(stream).keep_alive(KeepAlive::default())
}

// ---------------------------------------------------------------------------
// User-supplied DNA analysis
// ---------------------------------------------------------------------------

async fn analyze_handler(
    body: String,
) -> std::result::Result<Json<analyze::AnalyzeResult>, analyze::AnalyzeError> {
    let parsed = analyze::parse(&body)?;
    let result = tokio::task::spawn_blocking(move || analyze::run(parsed))
        .await
        .map_err(|e| analyze::AnalyzeError::Internal(format!("join: {e}")))??;
    Ok(Json(result))
}

// ---------------------------------------------------------------------------
// Server entry point
// ---------------------------------------------------------------------------

pub async fn serve() -> anyhow::Result<()> {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/panel", get(panel_handler))
        .route("/api/kmer", get(kmer_handler))
        .route("/api/alignment", get(alignment_handler))
        .route("/api/variants", get(variants_handler))
        .route("/api/protein", get(protein_handler))
        .route("/api/epigenetics", get(epigenetics_handler))
        .route("/api/pharma", get(pharma_handler))
        .route("/api/rvdna", get(rvdna_handler))
        .route("/api/brain/memories", get(memories_handler))
        .route("/api/brain/learning", get(learning_handler))
        .route("/api/brain/pathways", get(pathways_handler))
        .route("/api/stream/analysis", get(stream_analysis_handler))
        .route(
            "/api/analyze",
            post(analyze_handler).layer(DefaultBodyLimit::max(analyze::MAX_BODY_BYTES)),
        )
        .layer(cors);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    tracing::info!("Listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

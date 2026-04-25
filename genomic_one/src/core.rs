use rvdna::prelude::*;
use rvdna::real_data;

pub const APOE_CODING: &str = "ATGAAGGTTCTGTGGGCTGCGTTGCTGGTGGATTGCTGACAGGATGCCTAGCCGAGGGAGAGCCGGTGCAGGAGGAGCTGCGTGGCGCTGCGTGGCCGCGAGCTGCGCGAGCTGCGCGAGCTGCGCGAGCTGCGCGAGCTGCGCGAGCTGCGCGAGCTGCGCGAGCTGCGCGAGCTGCGCGAGCTGCGCGAGCTGCGCGAGCTGCGCGAGCTGCGCGAGCTGCGCGAGCTGCGCGAGCTGCGCGAGCTGCGCGAGCTGCGCGAGCTGCGCGAGCTGCGCGAGCTGCGCGAGCTGCGCGAGCTGCGCGAGCTGCGCGAGCTGCGCGAGC";

pub struct GenePanel {
    pub hbb: DnaSequence,
    pub tp53: DnaSequence,
    pub brca1: DnaSequence,
    pub cyp2d6: DnaSequence,
    pub insulin: DnaSequence,
    pub apoe: DnaSequence,
}

impl GenePanel {
    pub fn load() -> anyhow::Result<Self> {
        Ok(Self {
            hbb: DnaSequence::from_str(real_data::HBB_CODING_SEQUENCE)?,
            tp53: DnaSequence::from_str(real_data::TP53_EXONS_5_8)?,
            brca1: DnaSequence::from_str(real_data::BRCA1_EXON11_FRAGMENT)?,
            cyp2d6: DnaSequence::from_str(real_data::CYP2D6_CODING)?,
            insulin: DnaSequence::from_str(real_data::INS_CODING)?,
            apoe: DnaSequence::from_str(APOE_CODING)?,
        })
    }

    pub fn total_bases(&self) -> usize {
        self.hbb.len() + self.tp53.len() + self.brca1.len() + self.cyp2d6.len() + self.insulin.len() + self.apoe.len()
    }
}

pub fn gc_content(seq: &DnaSequence) -> f64 {
    let gc = seq.bases().iter().filter(|&&b| b == Nucleotide::G || b == Nucleotide::C).count();
    gc as f64 / seq.len() as f64
}

pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    let dot: f32 = a.iter().zip(b).map(|(x, y)| x * y).sum();
    let mag_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let mag_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
    if mag_a == 0.0 || mag_b == 0.0 { 0.0 } else { dot / (mag_a * mag_b) }
}

/// Results from the k-mer similarity stage.
pub struct KmerResults {
    pub hbb_vec: Vec<f32>,
    pub tp53_vec: Vec<f32>,
    pub brca1_vec: Vec<f32>,
    pub cyp2d6_vec: Vec<f32>,
    pub ins_vec: Vec<f32>,
    pub apoe_vec: Vec<f32>,
}

impl KmerResults {
    pub fn compute(panel: &GenePanel, k: usize, dims: usize) -> anyhow::Result<Self> {
        Ok(Self {
            hbb_vec: panel.hbb.to_kmer_vector(k, dims)?,
            tp53_vec: panel.tp53.to_kmer_vector(k, dims)?,
            brca1_vec: panel.brca1.to_kmer_vector(k, dims)?,
            cyp2d6_vec: panel.cyp2d6.to_kmer_vector(k, dims)?,
            ins_vec: panel.insulin.to_kmer_vector(k, dims)?,
            apoe_vec: panel.apoe.to_kmer_vector(k, dims)?,
        })
    }

    pub fn similarity_matrix(&self) -> Vec<(&'static str, &'static str, f32)> {
        vec![
            ("HBB", "TP53", cosine_similarity(&self.hbb_vec, &self.tp53_vec)),
            ("HBB", "BRCA1", cosine_similarity(&self.hbb_vec, &self.brca1_vec)),
            ("TP53", "BRCA1", cosine_similarity(&self.tp53_vec, &self.brca1_vec)),
            ("HBB", "CYP2D6", cosine_similarity(&self.hbb_vec, &self.cyp2d6_vec)),
            ("HBB", "INS", cosine_similarity(&self.hbb_vec, &self.ins_vec)),
            ("TP53", "CYP2D6", cosine_similarity(&self.tp53_vec, &self.cyp2d6_vec)),
            ("APOE", "TP53", cosine_similarity(&self.apoe_vec, &self.tp53_vec)),
            ("APOE", "INS", cosine_similarity(&self.apoe_vec, &self.ins_vec)),
        ]
    }
}

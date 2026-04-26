import * as staticData from "./static-data";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function fetchEndpoint<T>(path: string, fallback: T): Promise<T> {
  if (typeof window === "undefined") return fallback;
  try {
    const res = await fetch(`${API_BASE}${path}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`Genomic One API Error [${path}]:`, err);
    return fallback;
  }
}

export const getPanel = () => fetchEndpoint("/api/panel", staticData.panelData);
export const getKmer = () => fetchEndpoint("/api/kmer", staticData.kmerData);
export const getAlignment = () => fetchEndpoint("/api/alignment", staticData.alignmentData);
export const getVariants = () => fetchEndpoint("/api/variants", staticData.variantData);
export const getProtein = () => fetchEndpoint("/api/protein", staticData.proteinData);
export const getEpigenetics = () => fetchEndpoint("/api/epigenetics", staticData.epigeneticsData);
export const getPharma = () => fetchEndpoint("/api/pharma", staticData.pharmaData);
export const getRvdna = () => fetchEndpoint("/api/rvdna", staticData.rvdnaData);
export const getMemories = () => fetchEndpoint("/api/brain/memories", staticData.memoriesData);
export const getLearning = () => fetchEndpoint("/api/brain/learning", staticData.learningData);
export const getPathways = () => fetchEndpoint("/api/brain/pathways", staticData.pathwaysData);
export const getMolecules = () => fetchEndpoint("/api/brain/molecules", staticData.moleculeData);

// ---- DNA analysis ---------------------------------------------------------

export interface AnalyzeResult {
  input_summary: { length_bp: number; gc_content: number; n_count: number };
  best_gene_match: {
    gene: string;
    alignment_score: number;
    mapped_position: number;
    mapping_quality: number;
    cigar_ops: number;
  };
  kmer_similarity: { gene: string; similarity: number }[];
  variants: {
    position: number;
    ref_base: string;
    alt_base: string;
    annotation: string | null;
  }[];
  protein: { length: number; first_aa: string; stop_codon_at: number | null };
  pharma: {
    allele1: string;
    allele2: string;
    phenotype: string;
    recommendations: { drug: string; recommendation: string; dose_factor: number }[];
    note: string;
  } | null;
  warnings: string[];
  disclaimer: string;
}

export interface AnalyzeError {
  error: string;
  position?: number;
  character?: string;
  length?: number;
  min?: number;
  max?: number;
  detail?: string;
}

/**
 * Analyze a user-supplied DNA sequence. Cold start on Render free tier can
 * take ~15 seconds, hence the long timeout. Throws AnalyzeError on 4xx.
 */
export async function analyzeSequence(sequence: string): Promise<AnalyzeResult> {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: sequence,
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: `http_${res.status}` }))) as AnalyzeError;
    throw body;
  }
  return res.json();
}

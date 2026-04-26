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

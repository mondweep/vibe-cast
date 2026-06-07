import { pipeline } from '@xenova/transformers';

/**
 * Query-time embeddings for GraphRAG. MUST use the same model the KG nodes
 * were indexed with (Xenova/all-MiniLM-L6-v2, 384-dim) or retrieval degrades.
 * The extractor is loaded lazily once and reused.
 */
let extractorPromise: Promise<any> | null = null;

export async function embedText(text: string): Promise<number[]> {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  const extractor = await extractorPromise;
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data as Float32Array);
}

/** pgvector text literal form, e.g. "[0.1,0.2,...]" */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

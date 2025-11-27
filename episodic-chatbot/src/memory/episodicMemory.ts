import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';

// Memory episode structure
export interface Episode {
  id: string;
  timestamp: number;
  role: 'user' | 'assistant';
  content: string;
  embedding: number[];
  signature?: string; // Ed25519 signature for provenance
  metadata?: Record<string, unknown>;
}

interface EpisodicMemoryDB extends DBSchema {
  episodes: {
    key: string;
    value: Episode;
    indexes: {
      'by-timestamp': number;
      'by-role': string;
    };
  };
  keypair: {
    key: string;
    value: { publicKey: string; privateKey: string };
  };
}

// Simple text to embedding (TF-IDF-like bag of words)
// In production, you'd use a real embedding model
function textToEmbedding(text: string): number[] {
  const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  const vocab = new Map<string, number>();

  // Build vocabulary from common words + text words
  const commonWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
    'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its',
    'may', 'new', 'now', 'old', 'see', 'way', 'who', 'boy', 'did', 'let', 'put', 'say',
    'she', 'too', 'use', 'what', 'when', 'where', 'why', 'how', 'help', 'remember',
    'think', 'know', 'want', 'need', 'like', 'feel', 'make', 'time', 'good', 'just'];

  commonWords.forEach((w, i) => vocab.set(w, i));

  // Create 64-dimensional embedding
  const embedding = new Array(64).fill(0);

  words.forEach(word => {
    const hash = simpleHash(word) % 64;
    embedding[hash] += 1;
  });

  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0)) || 1;
  return embedding.map(v => v / magnitude);
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Cosine similarity between two embeddings
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

export class EpisodicMemory {
  private db: IDBPDatabase<EpisodicMemoryDB> | null = null;
  private keyPair: CryptoKeyPair | null = null;

  async init(): Promise<void> {
    this.db = await openDB<EpisodicMemoryDB>('episodic-memory', 1, {
      upgrade(db) {
        const episodeStore = db.createObjectStore('episodes', { keyPath: 'id' });
        episodeStore.createIndex('by-timestamp', 'timestamp');
        episodeStore.createIndex('by-role', 'role');

        db.createObjectStore('keypair', { keyPath: 'id' });
      },
    });

    // Initialize or load Ed25519 keypair for signing
    await this.initializeKeys();
  }

  private async initializeKeys(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stored = await this.db.get('keypair', 'main');

    if (stored) {
      // Import existing keys
      const privateKey = await crypto.subtle.importKey(
        'jwk',
        JSON.parse(stored.privateKey),
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign']
      );
      const publicKey = await crypto.subtle.importKey(
        'jwk',
        JSON.parse(stored.publicKey),
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['verify']
      );
      this.keyPair = { privateKey, publicKey };
    } else {
      // Generate new keypair (using P-256 as Ed25519 isn't widely supported in WebCrypto)
      this.keyPair = await crypto.subtle.generateKey(
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign', 'verify']
      );

      // Store for persistence
      const privateKeyJwk = await crypto.subtle.exportKey('jwk', this.keyPair.privateKey);
      const publicKeyJwk = await crypto.subtle.exportKey('jwk', this.keyPair.publicKey);

      await this.db.put('keypair', {
        id: 'main',
        privateKey: JSON.stringify(privateKeyJwk),
        publicKey: JSON.stringify(publicKeyJwk),
      } as any);
    }
  }

  private async signMessage(content: string): Promise<string> {
    if (!this.keyPair) throw new Error('Keys not initialized');

    const encoder = new TextEncoder();
    const data = encoder.encode(content);

    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      this.keyPair.privateKey,
      data
    );

    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  }

  async verifyMessage(content: string, signature: string): Promise<boolean> {
    if (!this.keyPair) throw new Error('Keys not initialized');

    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const sig = Uint8Array.from(atob(signature), c => c.charCodeAt(0));

    return crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      this.keyPair.publicKey,
      sig,
      data
    );
  }

  async addEpisode(role: 'user' | 'assistant', content: string, metadata?: Record<string, unknown>): Promise<Episode> {
    if (!this.db) throw new Error('Database not initialized');

    const episode: Episode = {
      id: uuidv4(),
      timestamp: Date.now(),
      role,
      content,
      embedding: textToEmbedding(content),
      signature: await this.signMessage(content),
      metadata,
    };

    await this.db.put('episodes', episode);
    return episode;
  }

  async recall(query: string, topK: number = 5): Promise<Episode[]> {
    if (!this.db) throw new Error('Database not initialized');

    const queryEmbedding = textToEmbedding(query);
    const allEpisodes = await this.db.getAll('episodes');

    // Calculate similarity scores
    const scored = allEpisodes.map(episode => ({
      episode,
      score: cosineSimilarity(queryEmbedding, episode.embedding),
    }));

    // Sort by similarity and return top K
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map(s => s.episode);
  }

  async getRecentEpisodes(limit: number = 10): Promise<Episode[]> {
    if (!this.db) throw new Error('Database not initialized');

    const all = await this.db.getAllFromIndex('episodes', 'by-timestamp');
    return all.slice(-limit).reverse();
  }

  async getEpisodeCount(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.count('episodes');
  }

  async clearMemory(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.clear('episodes');
  }

  async getPublicKey(): Promise<string> {
    if (!this.keyPair) throw new Error('Keys not initialized');
    const jwk = await crypto.subtle.exportKey('jwk', this.keyPair.publicKey);
    return JSON.stringify(jwk);
  }
}

export const memory = new EpisodicMemory();

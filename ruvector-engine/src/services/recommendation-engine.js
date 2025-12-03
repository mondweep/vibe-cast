/**
 * Recommendation Engine Service
 *
 * GPU-less, serverless media recommendation engine using hypergraph embeddings.
 * Supports query-time filtering for stateless CloudRun deployment.
 */

const { Hypergraph, HyperNode, HyperEdge } = require('../core/hypergraph');
const {
  EmbeddingConfig,
  FastRPEmbedder,
  HyperedgeEmbedder,
  MarketEmbedder
} = require('../core/embeddings');
const { VectorStore } = require('../core/vector-store');
const { SPSAOptimizer, SPSAConfig } = require('../core/spsa-optimizer');

class RecommendationConfig {
  constructor(options = {}) {
    this.embeddingDimensions = options.embeddingDimensions || 128;
    this.topK = options.topK || 10;
    this.diversityWeight = options.diversityWeight || 0.3;
    this.recencyWeight = options.recencyWeight || 0.2;
    this.popularityWeight = options.popularityWeight || 0.1;
    this.useIVFIndex = options.useIVFIndex || false;
    this.numClusters = options.numClusters || 16;
  }
}

/**
 * Main Recommendation Engine
 */
class RecommendationEngine {
  constructor(config = new RecommendationConfig()) {
    this.config = config;
    this.graph = null;
    this.vectorStore = new VectorStore({
      dimensions: config.embeddingDimensions,
      distanceMetric: 'cosine',
      numClusters: config.numClusters
    });
    this.embeddings = new Map();
    this.edgeEmbeddings = new Map();
    this.isInitialized = false;
    this.lastUpdated = null;
  }

  /**
   * Initialize with a hypergraph
   */
  async initialize(graph) {
    this.graph = graph;

    // Generate embeddings using FastRP (CPU-optimized)
    console.log('Generating node embeddings with FastRP...');
    const embedder = new FastRPEmbedder(new EmbeddingConfig({
      dimensions: this.config.embeddingDimensions,
      iterations: 3
    }));

    this.embeddings = embedder.fit(graph);

    // Generate hyperedge embeddings
    console.log('Generating hyperedge embeddings...');
    const edgeEmbedder = new HyperedgeEmbedder('attention');
    this.edgeEmbeddings = edgeEmbedder.generateHyperedgeEmbeddings(graph, this.embeddings);

    // Generate market embedding
    console.log('Generating market embedding...');
    const marketEmbedder = new MarketEmbedder();
    marketEmbedder.generateMarketEmbedding(graph, this.embeddings);

    // Add all embeddings to vector store
    console.log('Building vector index...');
    for (const [nodeId, vector] of this.embeddings) {
      const node = graph.nodes.get(nodeId);
      if (node) {
        this.vectorStore.add(nodeId, vector, {
          type: node.type,
          ...node.data
        });
      }
    }

    // Build IVF index for large datasets
    if (this.config.useIVFIndex && this.embeddings.size > 100) {
      this.vectorStore.buildIVFIndex();
    }

    this.isInitialized = true;
    this.lastUpdated = Date.now();

    console.log(`Recommendation engine initialized with ${this.embeddings.size} nodes`);
    return this;
  }

  /**
   * Fine-tune embeddings with new interaction data
   */
  async fineTune(interactions, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Engine not initialized');
    }

    const optimizer = new SPSAOptimizer(new SPSAConfig({
      epochs: options.epochs || 5,
      batchSize: options.batchSize || 32,
      margin: options.margin || 0.2
    }));

    // Add interaction edges to graph
    for (const { userId, mediaId, interactionType, rating } of interactions) {
      const edge = new HyperEdge(
        null,
        `user_${interactionType}`,
        [userId, mediaId],
        rating || 1.0,
        { timestamp: Date.now() }
      );
      this.graph.addEdge(edge);
    }

    // Fine-tune with SPSA
    const result = optimizer.train(this.graph, this.embeddings, this.vectorStore);

    this.lastUpdated = Date.now();
    return result;
  }

  /**
   * Get recommendations for a user
   */
  async getRecommendations(userId, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Engine not initialized');
    }

    const {
      limit = this.config.topK,
      filters = {},
      excludeIds = [],
      includeExplanation = false
    } = options;

    // Get user embedding (or generate on-the-fly)
    let userEmbedding = this.embeddings.get(userId);

    if (!userEmbedding) {
      // Generate user embedding from their interactions
      userEmbedding = this._generateUserEmbedding(userId);
    }

    if (!userEmbedding) {
      // Cold start: use market embedding or random recommendations
      return this._coldStartRecommendations(limit, filters);
    }

    // Find similar media items
    const mediaFilter = { type: 'media', ...filters };
    const candidates = this.config.useIVFIndex
      ? this.vectorStore.findNearestIVF(userEmbedding, limit * 3, 5, mediaFilter)
      : this.vectorStore.findNearest(userEmbedding, limit * 3, mediaFilter);

    // Filter and diversify
    const recommendations = this._diversifyResults(
      candidates.filter(c => !excludeIds.includes(c.id)),
      limit
    );

    // Add explanations if requested
    if (includeExplanation) {
      for (const rec of recommendations) {
        rec.explanation = this._generateExplanation(userId, rec.id);
      }
    }

    return recommendations;
  }

  /**
   * Get similar items
   */
  async getSimilarItems(itemId, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Engine not initialized');
    }

    const {
      limit = this.config.topK,
      filters = {},
      excludeSelf = true
    } = options;

    const itemEmbedding = this.embeddings.get(itemId);
    if (!itemEmbedding) {
      return [];
    }

    const candidates = this.config.useIVFIndex
      ? this.vectorStore.findNearestIVF(itemEmbedding, limit + 1, 5, filters)
      : this.vectorStore.findNearest(itemEmbedding, limit + 1, filters);

    return candidates.filter(c => !excludeSelf || c.id !== itemId).slice(0, limit);
  }

  /**
   * Get recommendations based on multiple seed items
   */
  async getMultiSeedRecommendations(seedIds, options = {}) {
    const {
      limit = this.config.topK,
      aggregation = 'mean',
      filters = {}
    } = options;

    const seedEmbeddings = seedIds
      .map(id => this.embeddings.get(id))
      .filter(e => e !== undefined);

    if (seedEmbeddings.length === 0) {
      return [];
    }

    // Aggregate seed embeddings
    const dim = seedEmbeddings[0].length;
    const aggregatedEmbedding = new Array(dim).fill(0);

    if (aggregation === 'mean') {
      for (const emb of seedEmbeddings) {
        for (let i = 0; i < dim; i++) {
          aggregatedEmbedding[i] += emb[i] / seedEmbeddings.length;
        }
      }
    } else if (aggregation === 'max') {
      for (let i = 0; i < dim; i++) {
        aggregatedEmbedding[i] = Math.max(...seedEmbeddings.map(e => e[i]));
      }
    }

    // Normalize
    const norm = Math.sqrt(aggregatedEmbedding.reduce((s, v) => s + v * v, 0)) || 1;
    const normalizedEmbedding = aggregatedEmbedding.map(v => v / norm);

    const candidates = this.config.useIVFIndex
      ? this.vectorStore.findNearestIVF(normalizedEmbedding, limit + seedIds.length, 5, filters)
      : this.vectorStore.findNearest(normalizedEmbedding, limit + seedIds.length, filters);

    return candidates.filter(c => !seedIds.includes(c.id)).slice(0, limit);
  }

  /**
   * Get trending items in a market segment
   */
  async getTrending(marketId, options = {}) {
    const { limit = this.config.topK, timeWindow = 24 * 60 * 60 * 1000 } = options;

    const cutoff = Date.now() - timeWindow;

    // Filter by recent interactions
    const trendingCandidates = [];

    for (const [edgeId, edge] of this.graph.edges) {
      if (edge.createdAt < cutoff) continue;
      if (!edge.type.startsWith('user_')) continue;

      for (const nodeId of edge.nodeIds) {
        const node = this.graph.nodes.get(nodeId);
        if (node && node.type === 'media') {
          const existing = trendingCandidates.find(t => t.id === nodeId);
          if (existing) {
            existing.score += edge.weight;
          } else {
            trendingCandidates.push({
              id: nodeId,
              score: edge.weight,
              metadata: node.data
            });
          }
        }
      }
    }

    return trendingCandidates
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Generate user embedding from their interactions
   */
  _generateUserEmbedding(userId) {
    const userEdges = this.graph.getEdgesForNode(userId);
    if (userEdges.length === 0) return null;

    const interactedItems = [];
    const weights = [];

    for (const edge of userEdges) {
      if (!edge.type.startsWith('user_')) continue;

      for (const nodeId of edge.nodeIds) {
        if (nodeId === userId) continue;

        const itemEmbedding = this.embeddings.get(nodeId);
        if (itemEmbedding) {
          interactedItems.push(itemEmbedding);
          weights.push(edge.weight);
        }
      }
    }

    if (interactedItems.length === 0) return null;

    // Weighted average
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const dim = interactedItems[0].length;
    const userEmbedding = new Array(dim).fill(0);

    for (let i = 0; i < interactedItems.length; i++) {
      const w = weights[i] / totalWeight;
      for (let d = 0; d < dim; d++) {
        userEmbedding[d] += interactedItems[i][d] * w;
      }
    }

    // Normalize
    const norm = Math.sqrt(userEmbedding.reduce((s, v) => s + v * v, 0)) || 1;
    return userEmbedding.map(v => v / norm);
  }

  /**
   * Cold start recommendations
   */
  _coldStartRecommendations(limit, filters) {
    // Use market embedding or popular items
    if (this.graph.marketEmbedding) {
      const candidates = this.vectorStore.findNearest(
        this.graph.marketEmbedding,
        limit,
        { type: 'media', ...filters }
      );
      return candidates;
    }

    // Fallback to random popular items
    const mediaNodes = this.graph.getNodesByType('media');
    const shuffled = [...mediaNodes].sort(() => Math.random() - 0.5);

    return shuffled.slice(0, limit).map(node => ({
      id: node.id,
      distance: 0.5,
      metadata: node.data
    }));
  }

  /**
   * Diversify recommendations using MMR (Maximal Marginal Relevance)
   */
  _diversifyResults(candidates, limit) {
    if (candidates.length <= limit) return candidates;

    const selected = [candidates[0]];
    const remaining = candidates.slice(1);

    while (selected.length < limit && remaining.length > 0) {
      let bestScore = -Infinity;
      let bestIdx = 0;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];

        // Relevance score (inverse of distance)
        const relevance = 1 - candidate.distance;

        // Diversity score (max distance to already selected)
        const candidateEmb = this.embeddings.get(candidate.id);
        let maxSimilarity = 0;

        for (const sel of selected) {
          const selEmb = this.embeddings.get(sel.id);
          if (candidateEmb && selEmb) {
            const sim = this._cosineSimilarity(candidateEmb, selEmb);
            maxSimilarity = Math.max(maxSimilarity, sim);
          }
        }

        const diversity = 1 - maxSimilarity;

        // MMR score
        const lambda = 1 - this.config.diversityWeight;
        const mmrScore = lambda * relevance + (1 - lambda) * diversity;

        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestIdx = i;
        }
      }

      selected.push(remaining[bestIdx]);
      remaining.splice(bestIdx, 1);
    }

    return selected;
  }

  _cosineSimilarity(a, b) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
  }

  /**
   * Generate explanation for a recommendation
   */
  _generateExplanation(userId, itemId) {
    const userEdges = this.graph.getEdgesForNode(userId);
    const itemNode = this.graph.nodes.get(itemId);

    if (!itemNode) return 'Popular item';

    // Find common connections
    const reasons = [];

    for (const edge of userEdges) {
      const itemEdges = this.graph.getEdgesForNode(itemId);

      for (const itemEdge of itemEdges) {
        // Check for shared attributes
        if (edge.type === itemEdge.type && edge.type !== 'user_interaction') {
          const sharedNodes = edge.nodeIds.filter(n =>
            itemEdge.nodeIds.includes(n) && n !== userId && n !== itemId
          );

          if (sharedNodes.length > 0) {
            const sharedNode = this.graph.nodes.get(sharedNodes[0]);
            if (sharedNode) {
              reasons.push(`Similar ${edge.type.replace('same_', '')}: ${sharedNode.data.name || sharedNode.id}`);
            }
          }
        }
      }
    }

    return reasons.length > 0 ? reasons.slice(0, 3).join('; ') : 'Recommended based on your preferences';
  }

  /**
   * Export state for persistence
   */
  exportState() {
    return {
      config: this.config,
      graph: this.graph ? this.graph.toAdjacencyList() : null,
      vectorStore: this.vectorStore.toJSON(),
      embeddings: Object.fromEntries(this.embeddings),
      edgeEmbeddings: Object.fromEntries(this.edgeEmbeddings),
      lastUpdated: this.lastUpdated
    };
  }

  /**
   * Import state from persistence
   */
  static fromState(state) {
    const engine = new RecommendationEngine(state.config);

    if (state.graph) {
      engine.graph = Hypergraph.fromAdjacencyList(state.graph);
    }

    engine.vectorStore = VectorStore.fromJSON(state.vectorStore);
    engine.embeddings = new Map(Object.entries(state.embeddings));
    engine.edgeEmbeddings = new Map(Object.entries(state.edgeEmbeddings));
    engine.lastUpdated = state.lastUpdated;
    engine.isInitialized = true;

    return engine;
  }

  /**
   * Get engine statistics
   */
  getStats() {
    return {
      isInitialized: this.isInitialized,
      lastUpdated: this.lastUpdated,
      numNodes: this.embeddings.size,
      numEdges: this.edgeEmbeddings.size,
      vectorStoreStats: this.vectorStore.getStats(),
      graphStats: this.graph ? this.graph.getStats() : null,
      config: this.config
    };
  }
}

module.exports = {
  RecommendationConfig,
  RecommendationEngine
};

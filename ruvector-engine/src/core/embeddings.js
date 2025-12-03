/**
 * CPU-Optimized Embedding Generation
 *
 * Implements Node2Vec and FastRP algorithms optimized for CPU-only environments.
 * Uses incremental embedding refinement instead of GNN training.
 */

const { Matrix } = require('ml-matrix');

class EmbeddingConfig {
  constructor(options = {}) {
    this.dimensions = options.dimensions || 128;
    this.walkLength = options.walkLength || 80;
    this.numWalks = options.numWalks || 10;
    this.p = options.p || 1.0; // Return parameter (Node2Vec)
    this.q = options.q || 1.0; // In-out parameter (Node2Vec)
    this.windowSize = options.windowSize || 5;
    this.iterations = options.iterations || 3; // FastRP iterations
    this.learningRate = options.learningRate || 0.025;
  }
}

/**
 * Node2Vec implementation - CPU optimized random walks
 */
class Node2VecEmbedder {
  constructor(config = new EmbeddingConfig()) {
    this.config = config;
    this.embeddings = new Map();
  }

  /**
   * Generate random walks from the hypergraph
   */
  generateRandomWalks(graph) {
    const walks = [];
    const nodeIds = Array.from(graph.nodes.keys());

    for (let walkNum = 0; walkNum < this.config.numWalks; walkNum++) {
      for (const startNode of nodeIds) {
        const walk = this._randomWalk(graph, startNode);
        walks.push(walk);
      }
    }

    return walks;
  }

  /**
   * Perform a single biased random walk
   */
  _randomWalk(graph, startNode) {
    const walk = [startNode];
    let prevNode = null;
    let currentNode = startNode;

    for (let step = 1; step < this.config.walkLength; step++) {
      const neighbors = graph.getNeighbors(currentNode);

      if (neighbors.length === 0) break;

      // Calculate transition probabilities with bias
      const probs = neighbors.map(neighbor => {
        let weight = 1.0;

        if (prevNode !== null) {
          if (neighbor.id === prevNode) {
            weight = 1 / this.config.p; // Return to previous
          } else if (graph.getNeighbors(prevNode).some(n => n.id === neighbor.id)) {
            weight = 1.0; // Common neighbor
          } else {
            weight = 1 / this.config.q; // Move away
          }
        }

        return weight;
      });

      // Normalize and sample
      const totalWeight = probs.reduce((a, b) => a + b, 0);
      const normalizedProbs = probs.map(p => p / totalWeight);

      const nextNode = this._weightedSample(neighbors, normalizedProbs);

      prevNode = currentNode;
      currentNode = nextNode.id;
      walk.push(currentNode);
    }

    return walk;
  }

  _weightedSample(items, weights) {
    const r = Math.random();
    let cumSum = 0;

    for (let i = 0; i < items.length; i++) {
      cumSum += weights[i];
      if (r <= cumSum) {
        return items[i];
      }
    }

    return items[items.length - 1];
  }

  /**
   * Learn embeddings using Skip-gram with negative sampling
   */
  learnEmbeddings(walks, vocabulary) {
    const vocabSize = vocabulary.length;
    const dim = this.config.dimensions;

    // Initialize embeddings randomly
    const embeddings = Matrix.rand(vocabSize, dim).mul(0.01);
    const contextEmbeddings = Matrix.rand(vocabSize, dim).mul(0.01);

    // Create vocabulary index
    const vocabIndex = new Map();
    vocabulary.forEach((word, idx) => vocabIndex.set(word, idx));

    // Training with negative sampling
    const negSamples = 5;
    let lr = this.config.learningRate;

    for (const walk of walks) {
      for (let i = 0; i < walk.length; i++) {
        const center = walk[i];
        const centerIdx = vocabIndex.get(center);
        if (centerIdx === undefined) continue;

        // Context window
        const start = Math.max(0, i - this.config.windowSize);
        const end = Math.min(walk.length, i + this.config.windowSize + 1);

        for (let j = start; j < end; j++) {
          if (i === j) continue;

          const context = walk[j];
          const contextIdx = vocabIndex.get(context);
          if (contextIdx === undefined) continue;

          // Positive sample gradient
          const centerVec = embeddings.getRow(centerIdx);
          const contextVec = contextEmbeddings.getRow(contextIdx);

          const dot = this._dotProduct(centerVec, contextVec);
          const sigmoid = 1 / (1 + Math.exp(-dot));
          const gradient = lr * (1 - sigmoid);

          // Update embeddings
          for (let d = 0; d < dim; d++) {
            embeddings.set(centerIdx, d, embeddings.get(centerIdx, d) + gradient * contextVec[d]);
            contextEmbeddings.set(contextIdx, d, contextEmbeddings.get(contextIdx, d) + gradient * centerVec[d]);
          }

          // Negative samples
          for (let neg = 0; neg < negSamples; neg++) {
            const negIdx = Math.floor(Math.random() * vocabSize);
            if (negIdx === contextIdx) continue;

            const negVec = contextEmbeddings.getRow(negIdx);
            const negDot = this._dotProduct(centerVec, negVec);
            const negSigmoid = 1 / (1 + Math.exp(-negDot));
            const negGradient = lr * negSigmoid;

            for (let d = 0; d < dim; d++) {
              embeddings.set(centerIdx, d, embeddings.get(centerIdx, d) - negGradient * negVec[d]);
              contextEmbeddings.set(negIdx, d, contextEmbeddings.get(negIdx, d) - negGradient * centerVec[d]);
            }
          }
        }
      }

      // Decay learning rate
      lr *= 0.9999;
    }

    // Store embeddings
    vocabulary.forEach((word, idx) => {
      this.embeddings.set(word, Array.from(embeddings.getRow(idx)));
    });

    return this.embeddings;
  }

  _dotProduct(a, b) {
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
  }

  /**
   * Generate embeddings for the entire hypergraph
   */
  fit(graph) {
    const vocabulary = Array.from(graph.nodes.keys());
    const walks = this.generateRandomWalks(graph);
    return this.learnEmbeddings(walks, vocabulary);
  }

  getEmbedding(nodeId) {
    return this.embeddings.get(nodeId);
  }
}

/**
 * FastRP - Fast Random Projection for CPU-efficient embeddings
 * Much faster than Node2Vec, suitable for large graphs
 */
class FastRPEmbedder {
  constructor(config = new EmbeddingConfig()) {
    this.config = config;
    this.embeddings = new Map();
  }

  /**
   * Generate embeddings using iterative random projections
   */
  fit(graph) {
    const nodeIds = Array.from(graph.nodes.keys());
    const n = nodeIds.length;
    const dim = this.config.dimensions;

    const nodeIndex = new Map();
    nodeIds.forEach((id, idx) => nodeIndex.set(id, idx));

    // Initialize with sparse random projection
    const L0 = this._sparseRandomProjection(n, dim);

    // Build normalized adjacency matrix (sparse representation)
    const adjacency = this._buildAdjacency(graph, nodeIndex);

    // Iterative propagation
    let L = L0;
    const weights = [1.0];

    for (let iter = 1; iter <= this.config.iterations; iter++) {
      weights.push(Math.pow(2, iter));
    }

    // Normalize weights
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const normalizedWeights = weights.map(w => w / totalWeight);

    // Combine iterations with weights
    let combined = L0.clone().mul(normalizedWeights[0]);

    for (let iter = 1; iter <= this.config.iterations; iter++) {
      L = this._sparseMatMul(adjacency, L, nodeIndex);
      combined = combined.add(L.clone().mul(normalizedWeights[iter]));
    }

    // L2 normalize each row
    for (let i = 0; i < n; i++) {
      const row = combined.getRow(i);
      const norm = Math.sqrt(row.reduce((sum, v) => sum + v * v, 0)) || 1;
      for (let j = 0; j < dim; j++) {
        combined.set(i, j, combined.get(i, j) / norm);
      }
    }

    // Store embeddings
    nodeIds.forEach((id, idx) => {
      this.embeddings.set(id, Array.from(combined.getRow(idx)));
    });

    return this.embeddings;
  }

  /**
   * Sparse random projection initialization
   */
  _sparseRandomProjection(n, dim) {
    const matrix = Matrix.zeros(n, dim);
    const sqrtDim = Math.sqrt(dim);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < dim; j++) {
        const r = Math.random();
        if (r < 1/6) {
          matrix.set(i, j, sqrtDim);
        } else if (r < 2/6) {
          matrix.set(i, j, -sqrtDim);
        }
        // Otherwise remains 0
      }
    }

    return matrix;
  }

  /**
   * Build sparse adjacency representation
   */
  _buildAdjacency(graph, nodeIndex) {
    const adjacency = new Map();

    for (const [nodeId, node] of graph.nodes) {
      const neighbors = graph.getNeighbors(nodeId);
      const degree = neighbors.length || 1;

      const neighborList = [];
      for (const neighbor of neighbors) {
        const idx = nodeIndex.get(neighbor.id);
        if (idx !== undefined) {
          neighborList.push({
            idx,
            weight: 1 / degree // Row-normalized
          });
        }
      }

      adjacency.set(nodeIndex.get(nodeId), neighborList);
    }

    return adjacency;
  }

  /**
   * Sparse matrix multiplication for propagation
   */
  _sparseMatMul(adjacency, embeddings, nodeIndex) {
    const n = embeddings.rows;
    const dim = embeddings.columns;
    const result = Matrix.zeros(n, dim);

    for (const [rowIdx, neighbors] of adjacency) {
      for (const { idx, weight } of neighbors) {
        for (let d = 0; d < dim; d++) {
          result.set(rowIdx, d, result.get(rowIdx, d) + weight * embeddings.get(idx, d));
        }
      }
    }

    return result;
  }

  getEmbedding(nodeId) {
    return this.embeddings.get(nodeId);
  }
}

/**
 * Hyperedge Embedding Generator
 * Computes hyperedge embeddings as weighted aggregations of connected node embeddings
 */
class HyperedgeEmbedder {
  constructor(aggregation = 'mean') {
    this.aggregation = aggregation; // 'mean', 'max', 'attention'
  }

  /**
   * Generate embeddings for all hyperedges
   */
  generateHyperedgeEmbeddings(graph, nodeEmbeddings) {
    const edgeEmbeddings = new Map();

    for (const [edgeId, edge] of graph.edges) {
      const nodeVectors = edge.nodeIds
        .map(id => nodeEmbeddings.get(id))
        .filter(v => v !== undefined);

      if (nodeVectors.length === 0) continue;

      const embedding = this._aggregate(nodeVectors, edge.weight);
      edgeEmbeddings.set(edgeId, embedding);
      edge.embedding = embedding;
    }

    return edgeEmbeddings;
  }

  _aggregate(vectors, weight = 1.0) {
    const dim = vectors[0].length;
    const result = new Array(dim).fill(0);

    if (this.aggregation === 'mean') {
      for (const vec of vectors) {
        for (let i = 0; i < dim; i++) {
          result[i] += vec[i] / vectors.length;
        }
      }
    } else if (this.aggregation === 'max') {
      for (let i = 0; i < dim; i++) {
        result[i] = Math.max(...vectors.map(v => v[i]));
      }
    } else if (this.aggregation === 'attention') {
      // Simple attention-like weighting based on vector norms
      const norms = vectors.map(v => Math.sqrt(v.reduce((s, x) => s + x * x, 0)));
      const totalNorm = norms.reduce((a, b) => a + b, 0);
      const weights = norms.map(n => n / totalNorm);

      for (let i = 0; i < dim; i++) {
        for (let j = 0; j < vectors.length; j++) {
          result[i] += vectors[j][i] * weights[j];
        }
      }
    }

    // Apply edge weight
    for (let i = 0; i < dim; i++) {
      result[i] *= weight;
    }

    return result;
  }
}

/**
 * Market Embedding Generator
 * Creates aggregated embeddings for market segments
 */
class MarketEmbedder {
  /**
   * Generate market embedding from subgraph
   */
  generateMarketEmbedding(graph, nodeEmbeddings) {
    const mediaNodes = graph.getNodesByType('media');
    const vectors = mediaNodes
      .map(n => nodeEmbeddings.get(n.id))
      .filter(v => v !== undefined);

    if (vectors.length === 0) return null;

    const dim = vectors[0].length;
    const result = new Array(dim).fill(0);

    for (const vec of vectors) {
      for (let i = 0; i < dim; i++) {
        result[i] += vec[i] / vectors.length;
      }
    }

    graph.marketEmbedding = result;
    return result;
  }
}

module.exports = {
  EmbeddingConfig,
  Node2VecEmbedder,
  FastRPEmbedder,
  HyperedgeEmbedder,
  MarketEmbedder
};

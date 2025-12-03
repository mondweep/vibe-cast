/**
 * SPSA (Simultaneous Perturbation Stochastic Approximation) Optimizer
 *
 * Gradient-free optimization for CPU-only fine-tuning of embeddings.
 * Uses evolutionary strategies with contrastive learning.
 */

class SPSAConfig {
  constructor(options = {}) {
    // SPSA hyperparameters
    this.a = options.a || 0.1; // Step size scaling
    this.c = options.c || 0.1; // Perturbation scaling
    this.alpha = options.alpha || 0.602; // Step decay rate
    this.gamma = options.gamma || 0.101; // Perturbation decay rate
    this.A = options.A || 100; // Stability constant

    // Training parameters
    this.batchSize = options.batchSize || 32;
    this.epochs = options.epochs || 10;
    this.margin = options.margin || 0.2; // Triplet loss margin

    // Distributed settings
    this.numWorkers = options.numWorkers || 4;
  }
}

/**
 * Triplet Generator for Contrastive Learning
 */
class TripletGenerator {
  constructor(graph, vectorStore) {
    this.graph = graph;
    this.vectorStore = vectorStore;
  }

  /**
   * Generate positive pairs from verified relationships
   */
  generatePositivePairs(count = 100) {
    const pairs = [];
    const edges = Array.from(this.graph.edges.values());

    for (let i = 0; i < count && pairs.length < count; i++) {
      const edge = edges[Math.floor(Math.random() * edges.length)];
      if (edge.nodeIds.length < 2) continue;

      // Sample two nodes from the same hyperedge
      const shuffled = [...edge.nodeIds].sort(() => Math.random() - 0.5);
      pairs.push({
        anchor: shuffled[0],
        positive: shuffled[1],
        edgeType: edge.type,
        weight: edge.weight
      });
    }

    return pairs;
  }

  /**
   * Hard negative mining - find negatives close in embedding space but unrelated
   */
  generateHardNegatives(anchorId, numNegatives = 5) {
    const anchorData = this.vectorStore.get(anchorId);
    if (!anchorData) return [];

    // Find nearest neighbors that are NOT connected via edges
    const connectedNodes = new Set();
    const edges = this.graph.getEdgesForNode(anchorId);
    for (const edge of edges) {
      for (const nodeId of edge.nodeIds) {
        connectedNodes.add(nodeId);
      }
    }

    // Search for similar but unrelated nodes
    const candidates = this.vectorStore.findNearest(anchorData.vector, numNegatives * 3);

    const negatives = [];
    for (const candidate of candidates) {
      if (candidate.id === anchorId) continue;
      if (connectedNodes.has(candidate.id)) continue;

      negatives.push(candidate.id);
      if (negatives.length >= numNegatives) break;
    }

    return negatives;
  }

  /**
   * Generate triplets (anchor, positive, negative) for training
   */
  generateTriplets(batchSize = 32) {
    const triplets = [];
    const positivePairs = this.generatePositivePairs(batchSize);

    for (const { anchor, positive, edgeType, weight } of positivePairs) {
      const negatives = this.generateHardNegatives(anchor, 1);
      if (negatives.length === 0) continue;

      triplets.push({
        anchor,
        positive,
        negative: negatives[0],
        edgeType,
        weight
      });
    }

    return triplets;
  }
}

/**
 * SPSA Optimizer for Embedding Fine-tuning
 */
class SPSAOptimizer {
  constructor(config = new SPSAConfig()) {
    this.config = config;
    this.iteration = 0;
    this.losses = [];
  }

  /**
   * Calculate current step size (a_k)
   */
  getStepSize() {
    return this.config.a / Math.pow(this.iteration + 1 + this.config.A, this.config.alpha);
  }

  /**
   * Calculate current perturbation magnitude (c_k)
   */
  getPerturbation() {
    return this.config.c / Math.pow(this.iteration + 1, this.config.gamma);
  }

  /**
   * Generate Bernoulli perturbation vector
   */
  generatePerturbation(dim) {
    return Array.from({ length: dim }, () => Math.random() < 0.5 ? 1 : -1);
  }

  /**
   * Triplet margin loss
   */
  tripletLoss(anchorVec, positiveVec, negativeVec) {
    const posDist = this._cosineDistance(anchorVec, positiveVec);
    const negDist = this._cosineDistance(anchorVec, negativeVec);

    return Math.max(0, posDist - negDist + this.config.margin);
  }

  _cosineDistance(a, b) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const similarity = dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
    return 1 - similarity;
  }

  /**
   * SPSA update step for a batch of triplets
   */
  updateStep(embeddings, triplets, vectorStore) {
    this.iteration++;

    const ak = this.getStepSize();
    const ck = this.getPerturbation();

    const updates = new Map();

    for (const { anchor, positive, negative, weight } of triplets) {
      const anchorVec = embeddings.get(anchor);
      const positiveVec = embeddings.get(positive);
      const negativeVec = embeddings.get(negative);

      if (!anchorVec || !positiveVec || !negativeVec) continue;

      const dim = anchorVec.length;

      // Generate perturbation
      const delta = this.generatePerturbation(dim);

      // Perturbed anchor vectors
      const anchorPlus = anchorVec.map((v, i) => v + ck * delta[i]);
      const anchorMinus = anchorVec.map((v, i) => v - ck * delta[i]);

      // Calculate losses
      const lossPlus = this.tripletLoss(anchorPlus, positiveVec, negativeVec);
      const lossMinus = this.tripletLoss(anchorMinus, positiveVec, negativeVec);

      // SPSA gradient approximation
      const gradApprox = delta.map(d => (lossPlus - lossMinus) / (2 * ck * d));

      // Accumulate updates
      if (!updates.has(anchor)) {
        updates.set(anchor, {
          gradSum: new Array(dim).fill(0),
          count: 0
        });
      }

      const update = updates.get(anchor);
      for (let i = 0; i < dim; i++) {
        update.gradSum[i] += gradApprox[i] * weight;
      }
      update.count++;
    }

    // Apply updates
    let totalLoss = 0;

    for (const [nodeId, { gradSum, count }] of updates) {
      const currentVec = embeddings.get(nodeId);
      if (!currentVec) continue;

      const newVec = currentVec.map((v, i) => {
        return v - ak * (gradSum[i] / count);
      });

      // Normalize
      const norm = Math.sqrt(newVec.reduce((s, v) => s + v * v, 0)) || 1;
      const normalizedVec = newVec.map(v => v / norm);

      embeddings.set(nodeId, normalizedVec);

      // Update vector store
      const data = vectorStore.get(nodeId);
      if (data) {
        vectorStore.add(nodeId, normalizedVec, data.metadata);
      }
    }

    // Calculate average loss for this batch
    for (const { anchor, positive, negative } of triplets) {
      const anchorVec = embeddings.get(anchor);
      const positiveVec = embeddings.get(positive);
      const negativeVec = embeddings.get(negative);
      if (anchorVec && positiveVec && negativeVec) {
        totalLoss += this.tripletLoss(anchorVec, positiveVec, negativeVec);
      }
    }

    const avgLoss = totalLoss / triplets.length;
    this.losses.push(avgLoss);

    return avgLoss;
  }

  /**
   * Train embeddings using SPSA
   */
  train(graph, embeddings, vectorStore) {
    const tripletGenerator = new TripletGenerator(graph, vectorStore);
    const results = {
      epochLosses: [],
      finalLoss: 0,
      iterations: 0
    };

    for (let epoch = 0; epoch < this.config.epochs; epoch++) {
      let epochLoss = 0;
      const numBatches = Math.ceil(graph.nodes.size / this.config.batchSize);

      for (let batch = 0; batch < numBatches; batch++) {
        const triplets = tripletGenerator.generateTriplets(this.config.batchSize);
        if (triplets.length === 0) continue;

        const batchLoss = this.updateStep(embeddings, triplets, vectorStore);
        epochLoss += batchLoss;
      }

      const avgEpochLoss = epochLoss / numBatches;
      results.epochLosses.push(avgEpochLoss);

      console.log(`Epoch ${epoch + 1}/${this.config.epochs}, Loss: ${avgEpochLoss.toFixed(4)}`);
    }

    results.finalLoss = results.epochLosses[results.epochLosses.length - 1];
    results.iterations = this.iteration;

    return results;
  }

  /**
   * Get training statistics
   */
  getStats() {
    return {
      iteration: this.iteration,
      losses: this.losses,
      currentStepSize: this.getStepSize(),
      currentPerturbation: this.getPerturbation()
    };
  }
}

/**
 * Distributed SPSA Worker
 * Designed for parallel execution across CloudRun instances
 */
class DistributedSPSAWorker {
  constructor(workerId, config = new SPSAConfig()) {
    this.workerId = workerId;
    this.optimizer = new SPSAOptimizer(config);
    this.localUpdates = new Map();
  }

  /**
   * Process a micro-batch of triplets
   */
  processMicroBatch(triplets, embeddings) {
    const updates = new Map();
    const ck = this.optimizer.getPerturbation();

    for (const { anchor, positive, negative, weight } of triplets) {
      const anchorVec = embeddings.get(anchor);
      const positiveVec = embeddings.get(positive);
      const negativeVec = embeddings.get(negative);

      if (!anchorVec || !positiveVec || !negativeVec) continue;

      const dim = anchorVec.length;
      const delta = this.optimizer.generatePerturbation(dim);

      const anchorPlus = anchorVec.map((v, i) => v + ck * delta[i]);
      const anchorMinus = anchorVec.map((v, i) => v - ck * delta[i]);

      const lossPlus = this.optimizer.tripletLoss(anchorPlus, positiveVec, negativeVec);
      const lossMinus = this.optimizer.tripletLoss(anchorMinus, positiveVec, negativeVec);

      const gradApprox = delta.map(d => (lossPlus - lossMinus) / (2 * ck * d));

      updates.set(anchor, {
        gradient: gradApprox,
        weight,
        loss: (lossPlus + lossMinus) / 2
      });
    }

    return updates;
  }

  /**
   * Export local updates for federated averaging
   */
  exportUpdates() {
    const exported = {};
    for (const [nodeId, update] of this.localUpdates) {
      exported[nodeId] = {
        gradient: update.gradient,
        weight: update.weight
      };
    }
    return {
      workerId: this.workerId,
      updates: exported,
      iteration: this.optimizer.iteration
    };
  }
}

/**
 * Federated Averaging Coordinator
 * Aggregates updates from multiple CloudRun instances
 */
class FederatedAverager {
  constructor() {
    this.workerUpdates = new Map();
  }

  /**
   * Receive updates from a worker
   */
  receiveUpdates(workerId, updates) {
    this.workerUpdates.set(workerId, updates);
  }

  /**
   * Aggregate updates using federated averaging
   */
  aggregate() {
    const aggregated = new Map();

    for (const [workerId, { updates }] of this.workerUpdates) {
      for (const [nodeId, { gradient, weight }] of Object.entries(updates)) {
        if (!aggregated.has(nodeId)) {
          aggregated.set(nodeId, {
            gradientSum: new Array(gradient.length).fill(0),
            totalWeight: 0,
            count: 0
          });
        }

        const agg = aggregated.get(nodeId);
        for (let i = 0; i < gradient.length; i++) {
          agg.gradientSum[i] += gradient[i] * weight;
        }
        agg.totalWeight += weight;
        agg.count++;
      }
    }

    // Normalize
    const result = new Map();
    for (const [nodeId, { gradientSum, totalWeight }] of aggregated) {
      result.set(nodeId, gradientSum.map(g => g / totalWeight));
    }

    return result;
  }

  /**
   * Apply aggregated updates to embeddings
   */
  applyUpdates(embeddings, aggregatedGradients, stepSize) {
    for (const [nodeId, gradient] of aggregatedGradients) {
      const currentVec = embeddings.get(nodeId);
      if (!currentVec) continue;

      const newVec = currentVec.map((v, i) => v - stepSize * gradient[i]);

      // Normalize
      const norm = Math.sqrt(newVec.reduce((s, v) => s + v * v, 0)) || 1;
      embeddings.set(nodeId, newVec.map(v => v / norm));
    }

    // Clear for next round
    this.workerUpdates.clear();

    return embeddings;
  }
}

module.exports = {
  SPSAConfig,
  TripletGenerator,
  SPSAOptimizer,
  DistributedSPSAWorker,
  FederatedAverager
};

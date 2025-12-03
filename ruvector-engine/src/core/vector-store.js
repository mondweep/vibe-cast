/**
 * Vector Store - In-memory vector storage with similarity search
 *
 * Designed for CloudRun stateless deployment with Cloud SQL pgvector-like capabilities.
 * Uses efficient approximate nearest neighbor search optimized for CPU.
 */

const Heap = require('heap-js').default;

class VectorStore {
  constructor(options = {}) {
    this.dimensions = options.dimensions || 128;
    this.distanceMetric = options.distanceMetric || 'cosine'; // 'cosine', 'euclidean', 'dot'
    this.vectors = new Map(); // id -> { vector, metadata }
    this.ivfClusters = null; // For IVF indexing
    this.numClusters = options.numClusters || 16;
  }

  /**
   * Add a vector to the store
   */
  add(id, vector, metadata = {}) {
    if (vector.length !== this.dimensions) {
      throw new Error(`Vector dimension mismatch: expected ${this.dimensions}, got ${vector.length}`);
    }

    // Normalize for cosine similarity
    if (this.distanceMetric === 'cosine') {
      vector = this._normalize(vector);
    }

    this.vectors.set(id, { vector, metadata, timestamp: Date.now() });

    // Invalidate IVF index
    this.ivfClusters = null;

    return id;
  }

  /**
   * Bulk add vectors
   */
  addBatch(items) {
    for (const { id, vector, metadata } of items) {
      this.add(id, vector, metadata);
    }
    return items.length;
  }

  /**
   * Get a vector by ID
   */
  get(id) {
    return this.vectors.get(id);
  }

  /**
   * Delete a vector
   */
  delete(id) {
    const existed = this.vectors.has(id);
    this.vectors.delete(id);
    this.ivfClusters = null;
    return existed;
  }

  /**
   * Find k nearest neighbors using brute force (for small datasets)
   */
  findNearest(queryVector, k = 10, filters = {}) {
    if (queryVector.length !== this.dimensions) {
      throw new Error(`Query dimension mismatch: expected ${this.dimensions}, got ${queryVector.length}`);
    }

    if (this.distanceMetric === 'cosine') {
      queryVector = this._normalize(queryVector);
    }

    // Use max heap for efficient top-k
    const compareDistance = (a, b) => b.distance - a.distance; // Max heap
    const heap = new Heap(compareDistance);

    for (const [id, { vector, metadata }] of this.vectors) {
      // Apply filters
      if (!this._matchesFilters(metadata, filters)) continue;

      const distance = this._calculateDistance(queryVector, vector);

      if (heap.size() < k) {
        heap.push({ id, distance, metadata });
      } else if (distance < heap.peek().distance) {
        heap.pop();
        heap.push({ id, distance, metadata });
      }
    }

    // Convert to sorted array (ascending by distance)
    return heap.toArray().sort((a, b) => a.distance - b.distance);
  }

  /**
   * Find neighbors within a distance threshold
   */
  findWithinRadius(queryVector, radius, filters = {}) {
    if (this.distanceMetric === 'cosine') {
      queryVector = this._normalize(queryVector);
    }

    const results = [];

    for (const [id, { vector, metadata }] of this.vectors) {
      if (!this._matchesFilters(metadata, filters)) continue;

      const distance = this._calculateDistance(queryVector, vector);

      if (distance <= radius) {
        results.push({ id, distance, metadata });
      }
    }

    return results.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Build IVF index for approximate nearest neighbor search
   * More efficient for large datasets
   */
  buildIVFIndex() {
    const allVectors = Array.from(this.vectors.entries());
    if (allVectors.length < this.numClusters) {
      console.warn('Not enough vectors for IVF indexing');
      return;
    }

    // K-means clustering
    const centroids = this._kMeansClustering(allVectors.map(([_, { vector }]) => vector));

    // Assign vectors to clusters
    this.ivfClusters = new Array(this.numClusters).fill(null).map(() => []);

    for (const [id, { vector, metadata }] of allVectors) {
      const clusterIdx = this._findNearestCentroid(vector, centroids);
      this.ivfClusters[clusterIdx].push({ id, vector, metadata });
    }

    this.centroids = centroids;
    return this.numClusters;
  }

  /**
   * Approximate nearest neighbor search using IVF
   */
  findNearestIVF(queryVector, k = 10, nProbe = 3, filters = {}) {
    if (!this.ivfClusters) {
      this.buildIVFIndex();
    }

    if (this.distanceMetric === 'cosine') {
      queryVector = this._normalize(queryVector);
    }

    // Find nearest clusters to probe
    const clusterDistances = this.centroids
      .map((c, i) => ({ index: i, distance: this._calculateDistance(queryVector, c) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, nProbe);

    // Search in selected clusters
    const compareDistance = (a, b) => b.distance - a.distance;
    const heap = new Heap(compareDistance);

    for (const { index } of clusterDistances) {
      for (const { id, vector, metadata } of this.ivfClusters[index]) {
        if (!this._matchesFilters(metadata, filters)) continue;

        const distance = this._calculateDistance(queryVector, vector);

        if (heap.size() < k) {
          heap.push({ id, distance, metadata });
        } else if (distance < heap.peek().distance) {
          heap.pop();
          heap.push({ id, distance, metadata });
        }
      }
    }

    return heap.toArray().sort((a, b) => a.distance - b.distance);
  }

  /**
   * Simple k-means clustering
   */
  _kMeansClustering(vectors, maxIterations = 50) {
    const k = this.numClusters;
    const dim = this.dimensions;

    // Initialize centroids randomly
    const shuffled = [...vectors].sort(() => Math.random() - 0.5);
    let centroids = shuffled.slice(0, k).map(v => [...v]);

    for (let iter = 0; iter < maxIterations; iter++) {
      // Assign vectors to clusters
      const clusters = new Array(k).fill(null).map(() => []);

      for (const vector of vectors) {
        const clusterIdx = this._findNearestCentroid(vector, centroids);
        clusters[clusterIdx].push(vector);
      }

      // Update centroids
      let converged = true;
      const newCentroids = [];

      for (let i = 0; i < k; i++) {
        if (clusters[i].length === 0) {
          newCentroids.push(centroids[i]);
          continue;
        }

        const newCentroid = new Array(dim).fill(0);
        for (const vec of clusters[i]) {
          for (let d = 0; d < dim; d++) {
            newCentroid[d] += vec[d] / clusters[i].length;
          }
        }

        // Check convergence
        const dist = this._calculateDistance(centroids[i], newCentroid);
        if (dist > 0.001) converged = false;

        newCentroids.push(newCentroid);
      }

      centroids = newCentroids;
      if (converged) break;
    }

    return centroids;
  }

  _findNearestCentroid(vector, centroids) {
    let minDist = Infinity;
    let minIdx = 0;

    for (let i = 0; i < centroids.length; i++) {
      const dist = this._calculateDistance(vector, centroids[i]);
      if (dist < minDist) {
        minDist = dist;
        minIdx = i;
      }
    }

    return minIdx;
  }

  _calculateDistance(a, b) {
    if (this.distanceMetric === 'cosine') {
      // For normalized vectors, cosine distance = 1 - dot product
      let dot = 0;
      for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
      }
      return 1 - dot;
    } else if (this.distanceMetric === 'euclidean') {
      let sum = 0;
      for (let i = 0; i < a.length; i++) {
        const diff = a[i] - b[i];
        sum += diff * diff;
      }
      return Math.sqrt(sum);
    } else if (this.distanceMetric === 'dot') {
      let dot = 0;
      for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
      }
      return -dot; // Negative because higher dot product = more similar
    }

    throw new Error(`Unknown distance metric: ${this.distanceMetric}`);
  }

  _normalize(vector) {
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
    return vector.map(v => v / norm);
  }

  _matchesFilters(metadata, filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (Array.isArray(value)) {
        if (!value.includes(metadata[key])) return false;
      } else if (metadata[key] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Export store to JSON for persistence
   */
  toJSON() {
    const vectors = [];
    for (const [id, data] of this.vectors) {
      vectors.push({ id, ...data });
    }

    return {
      dimensions: this.dimensions,
      distanceMetric: this.distanceMetric,
      numClusters: this.numClusters,
      vectors,
      centroids: this.centroids || null
    };
  }

  /**
   * Import from JSON
   */
  static fromJSON(data) {
    const store = new VectorStore({
      dimensions: data.dimensions,
      distanceMetric: data.distanceMetric,
      numClusters: data.numClusters
    });

    for (const { id, vector, metadata, timestamp } of data.vectors) {
      store.vectors.set(id, { vector, metadata, timestamp });
    }

    if (data.centroids) {
      store.centroids = data.centroids;
      store.buildIVFIndex();
    }

    return store;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalVectors: this.vectors.size,
      dimensions: this.dimensions,
      distanceMetric: this.distanceMetric,
      hasIVFIndex: !!this.ivfClusters,
      numClusters: this.numClusters
    };
  }
}

module.exports = { VectorStore };

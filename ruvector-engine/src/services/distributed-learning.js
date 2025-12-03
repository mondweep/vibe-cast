/**
 * CloudRun-Compatible Distributed Learning Layer
 *
 * Implements distributed fine-tuning across multiple stateless CloudRun instances.
 * Uses federated averaging for gradient aggregation.
 */

const { v4: uuidv4 } = require('uuid');
const {
  SPSAConfig,
  SPSAOptimizer,
  DistributedSPSAWorker,
  FederatedAverager,
  TripletGenerator
} = require('../core/spsa-optimizer');

/**
 * Job status tracking
 */
const JobStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * Learning Job - represents a distributed fine-tuning job
 */
class LearningJob {
  constructor(id, config = {}) {
    this.id = id || uuidv4();
    this.status = JobStatus.PENDING;
    this.config = {
      epochs: config.epochs || 10,
      batchSize: config.batchSize || 32,
      numWorkers: config.numWorkers || 4,
      ...config
    };
    this.progress = {
      currentEpoch: 0,
      currentBatch: 0,
      totalBatches: 0,
      losses: []
    };
    this.createdAt = Date.now();
    this.startedAt = null;
    this.completedAt = null;
    this.workerStates = new Map();
  }

  toJSON() {
    return {
      id: this.id,
      status: this.status,
      config: this.config,
      progress: this.progress,
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt
    };
  }
}

/**
 * Distributed Learning Coordinator
 * Manages distributed training across CloudRun instances
 */
class DistributedLearningCoordinator {
  constructor(options = {}) {
    this.instanceId = options.instanceId || uuidv4().slice(0, 8);
    this.jobs = new Map();
    this.averager = new FederatedAverager();
    this.storage = options.storage; // GCS client for graph/embedding storage
    this.messageQueue = options.messageQueue; // Pub/Sub for worker coordination
  }

  /**
   * Create a new distributed learning job
   */
  async createJob(graphId, config = {}) {
    const job = new LearningJob(uuidv4(), config);
    this.jobs.set(job.id, job);

    // In production, this would store job metadata in Firestore
    console.log(`Created learning job: ${job.id}`);

    return job;
  }

  /**
   * Start a distributed learning job
   */
  async startJob(jobId, graph, embeddings, vectorStore) {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);

    job.status = JobStatus.RUNNING;
    job.startedAt = Date.now();

    const spsaConfig = new SPSAConfig({
      epochs: job.config.epochs,
      batchSize: job.config.batchSize
    });

    const tripletGenerator = new TripletGenerator(graph, vectorStore);
    const totalTriplets = graph.nodes.size;
    job.progress.totalBatches = Math.ceil(totalTriplets / job.config.batchSize);

    try {
      // Simulate distributed workers (in production, these would be separate CloudRun instances)
      const workers = [];
      for (let i = 0; i < job.config.numWorkers; i++) {
        workers.push(new DistributedSPSAWorker(`worker-${i}`, spsaConfig));
      }

      for (let epoch = 0; epoch < job.config.epochs; epoch++) {
        job.progress.currentEpoch = epoch + 1;
        let epochLoss = 0;

        // Generate triplets and distribute to workers
        const allTriplets = tripletGenerator.generateTriplets(totalTriplets);
        const tripletsPerWorker = Math.ceil(allTriplets.length / job.config.numWorkers);

        // Each worker processes their micro-batch
        const workerResults = await Promise.all(workers.map(async (worker, idx) => {
          const start = idx * tripletsPerWorker;
          const end = Math.min(start + tripletsPerWorker, allTriplets.length);
          const workerTriplets = allTriplets.slice(start, end);

          return worker.processMicroBatch(workerTriplets, embeddings);
        }));

        // Federated averaging
        workerResults.forEach((updates, idx) => {
          const exported = {};
          for (const [nodeId, data] of updates) {
            exported[nodeId] = data;
          }
          this.averager.receiveUpdates(`worker-${idx}`, { updates: exported });
        });

        const aggregatedGradients = this.averager.aggregate();
        const stepSize = spsaConfig.a / Math.pow(epoch + 1 + spsaConfig.A, spsaConfig.alpha);

        this.averager.applyUpdates(embeddings, aggregatedGradients, stepSize);

        // Calculate epoch loss
        for (const { anchor, positive, negative } of allTriplets.slice(0, 100)) {
          const anchorVec = embeddings.get(anchor);
          const positiveVec = embeddings.get(positive);
          const negativeVec = embeddings.get(negative);

          if (anchorVec && positiveVec && negativeVec) {
            const loss = this._tripletLoss(anchorVec, positiveVec, negativeVec, spsaConfig.margin);
            epochLoss += loss;
          }
        }

        const avgLoss = epochLoss / Math.min(100, allTriplets.length);
        job.progress.losses.push(avgLoss);

        console.log(`[Job ${job.id}] Epoch ${epoch + 1}/${job.config.epochs}, Loss: ${avgLoss.toFixed(4)}`);

        // Update vector store with new embeddings
        for (const [nodeId, vector] of embeddings) {
          const data = vectorStore.get(nodeId);
          if (data) {
            vectorStore.add(nodeId, vector, data.metadata);
          }
        }
      }

      job.status = JobStatus.COMPLETED;
      job.completedAt = Date.now();

    } catch (error) {
      job.status = JobStatus.FAILED;
      job.error = error.message;
      throw error;
    }

    return job;
  }

  _tripletLoss(anchorVec, positiveVec, negativeVec, margin = 0.2) {
    const posDist = this._cosineDistance(anchorVec, positiveVec);
    const negDist = this._cosineDistance(anchorVec, negativeVec);
    return Math.max(0, posDist - negDist + margin);
  }

  _cosineDistance(a, b) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return 1 - dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
  }

  /**
   * Get job status
   */
  getJob(jobId) {
    return this.jobs.get(jobId);
  }

  /**
   * List all jobs
   */
  listJobs() {
    return Array.from(this.jobs.values()).map(j => j.toJSON());
  }

  /**
   * Cancel a running job
   */
  cancelJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (job.status === JobStatus.RUNNING) {
      job.status = JobStatus.FAILED;
      job.error = 'Cancelled by user';
    }

    return true;
  }
}

/**
 * Worker Process - runs on individual CloudRun instances
 */
class LearningWorker {
  constructor(workerId, options = {}) {
    this.workerId = workerId;
    this.config = new SPSAConfig(options);
    this.optimizer = new DistributedSPSAWorker(workerId, this.config);
  }

  /**
   * Process a batch of work
   */
  async processBatch(batchData) {
    const { triplets, embeddings, iteration } = batchData;

    // Convert embeddings from JSON to Map
    const embeddingsMap = new Map(Object.entries(embeddings));

    // Process micro-batch
    const updates = this.optimizer.processMicroBatch(triplets, embeddingsMap);

    // Export for aggregation
    const exported = {};
    let totalLoss = 0;

    for (const [nodeId, data] of updates) {
      exported[nodeId] = {
        gradient: data.gradient,
        weight: data.weight
      };
      totalLoss += data.loss;
    }

    return {
      workerId: this.workerId,
      updates: exported,
      avgLoss: updates.size > 0 ? totalLoss / updates.size : 0,
      processedTriplets: triplets.length
    };
  }
}

/**
 * Streaming Update Handler
 * Handles real-time embedding updates for the "500 million concurrent learning streaming" goal
 */
class StreamingUpdateHandler {
  constructor(options = {}) {
    this.batchSize = options.batchSize || 1000;
    this.flushInterval = options.flushInterval || 5000; // ms
    this.pendingUpdates = [];
    this.updateCallback = options.onBatchReady;
  }

  /**
   * Receive a streaming update
   */
  async receiveUpdate(update) {
    this.pendingUpdates.push({
      ...update,
      timestamp: Date.now()
    });

    if (this.pendingUpdates.length >= this.batchSize) {
      await this.flush();
    }
  }

  /**
   * Flush pending updates
   */
  async flush() {
    if (this.pendingUpdates.length === 0) return;

    const batch = this.pendingUpdates.splice(0, this.batchSize);

    if (this.updateCallback) {
      await this.updateCallback(batch);
    }

    return batch.length;
  }

  /**
   * Start automatic flushing
   */
  startAutoFlush() {
    this.flushTimer = setInterval(() => this.flush(), this.flushInterval);
  }

  /**
   * Stop automatic flushing
   */
  stopAutoFlush() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}

module.exports = {
  JobStatus,
  LearningJob,
  DistributedLearningCoordinator,
  LearningWorker,
  StreamingUpdateHandler
};

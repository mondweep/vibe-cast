/**
 * Google Cloud Platform Configuration
 *
 * Configuration for CloudRun, Firestore, Cloud Storage, and Cloud SQL (pgvector)
 */

module.exports = {
  // CloudRun settings
  cloudRun: {
    region: process.env.GCP_REGION || 'us-central1',
    serviceName: 'ruvector-engine',
    minInstances: parseInt(process.env.MIN_INSTANCES) || 0,
    maxInstances: parseInt(process.env.MAX_INSTANCES) || 100,
    concurrency: parseInt(process.env.CONCURRENCY) || 80,
    memory: process.env.MEMORY || '2Gi',
    cpu: parseInt(process.env.CPU) || 2,
    timeout: parseInt(process.env.TIMEOUT) || 300
  },

  // Firestore settings (for hypergraph document storage)
  firestore: {
    projectId: process.env.GCP_PROJECT_ID,
    databaseId: process.env.FIRESTORE_DATABASE || '(default)',
    collections: {
      graphs: 'hypergraphs',
      nodes: 'nodes',
      edges: 'edges',
      embeddings: 'embeddings',
      jobs: 'learning-jobs',
      metrics: 'metrics'
    }
  },

  // Cloud Storage settings (for serialized graph adjacency lists)
  storage: {
    projectId: process.env.GCP_PROJECT_ID,
    bucketName: process.env.GCS_BUCKET || `${process.env.GCP_PROJECT_ID}-ruvector`,
    paths: {
      graphs: 'graphs/',
      embeddings: 'embeddings/',
      models: 'models/',
      exports: 'exports/'
    }
  },

  // Cloud SQL settings (for pgvector similarity search - optional)
  cloudSQL: {
    instanceConnectionName: process.env.CLOUD_SQL_CONNECTION_NAME,
    database: process.env.CLOUD_SQL_DATABASE || 'ruvector',
    user: process.env.CLOUD_SQL_USER,
    password: process.env.CLOUD_SQL_PASSWORD,
    // pgvector extension settings
    vectorDimensions: parseInt(process.env.VECTOR_DIMENSIONS) || 128,
    indexType: process.env.VECTOR_INDEX_TYPE || 'ivfflat', // 'ivfflat' or 'hnsw'
    indexLists: parseInt(process.env.VECTOR_INDEX_LISTS) || 100
  },

  // Pub/Sub settings (for distributed learning coordination)
  pubSub: {
    projectId: process.env.GCP_PROJECT_ID,
    topics: {
      learningJobs: 'ruvector-learning-jobs',
      gradientUpdates: 'ruvector-gradient-updates',
      modelSync: 'ruvector-model-sync'
    },
    subscriptions: {
      worker: 'ruvector-worker-sub',
      coordinator: 'ruvector-coordinator-sub'
    }
  },

  // Metrics and monitoring
  monitoring: {
    enabled: process.env.ENABLE_MONITORING === 'true',
    metricsPrefix: 'ruvector',
    customMetrics: [
      'recommendation_latency',
      'embedding_generation_time',
      'fine_tuning_loss',
      'vector_search_time',
      'active_learning_jobs'
    ]
  }
};

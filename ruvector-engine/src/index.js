/**
 * RuVector Engine - GPU-less Serverless Media Recommendation Engine
 *
 * CloudRun-Native Hypergraph Architecture for CPU-only environments.
 * Designed for 500M concurrent learning streams using distributed SPSA optimization.
 *
 * Built for the Agentics Foundation TV5 Hackathon
 */

const express = require('express');
const cors = require('cors');
const routes = require('./api/routes');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Mount API routes
app.use('/api/v1', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'RuVector Engine',
    version: '1.0.0',
    description: 'GPU-less Serverless Media Recommendation Engine',
    architecture: 'CloudRun-Native Hypergraph',
    features: [
      'Hypergraph-based media relationships',
      'CPU-optimized Node2Vec/FastRP embeddings',
      'SPSA gradient-free fine-tuning',
      'Distributed learning with federated averaging',
      'IVF-based approximate nearest neighbor search',
      'Query-time filtering for stateless deployment'
    ],
    endpoints: {
      health: '/api/v1/health',
      initialize: 'POST /api/v1/initialize',
      recommendations: 'GET /api/v1/recommendations/:userId',
      similar: 'GET /api/v1/similar/:itemId',
      multiSeed: 'POST /api/v1/recommendations/multi-seed',
      trending: 'GET /api/v1/trending',
      interactions: 'POST /api/v1/interactions',
      media: 'POST /api/v1/media',
      fineTune: 'POST /api/v1/fine-tune',
      stats: 'GET /api/v1/stats',
      export: 'GET /api/v1/export',
      import: 'POST /api/v1/import'
    },
    hackathon: 'Agentics Foundation TV5'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                   RuVector Engine v1.0.0                       ║
║         GPU-less Serverless Media Recommendation               ║
╠═══════════════════════════════════════════════════════════════╣
║  Server running on port ${PORT}                                   ║
║  Environment: ${process.env.NODE_ENV || 'development'}                              ║
╠═══════════════════════════════════════════════════════════════╣
║  Architecture: CloudRun-Native Hypergraph                      ║
║  Embeddings: Node2Vec + FastRP (CPU-optimized)                 ║
║  Optimization: SPSA (Gradient-free)                            ║
║  Distribution: Federated Averaging                             ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;

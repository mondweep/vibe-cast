/**
 * API Routes for Recommendation Engine
 *
 * RESTful endpoints for the GPU-less serverless recommendation system.
 * Designed for CloudRun stateless deployment.
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const { Hypergraph, HyperNode, HyperEdge } = require('../core/hypergraph');
const { RecommendationEngine, RecommendationConfig } = require('../services/recommendation-engine');
const { DistributedLearningCoordinator } = require('../services/distributed-learning');

const router = express.Router();

// In-memory state (in production, load from GCS/Firestore)
let engine = null;
let learningCoordinator = null;

/**
 * Health check
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    engineInitialized: engine?.isInitialized || false,
    version: '1.0.0'
  });
});

/**
 * Initialize recommendation engine with sample data or provided graph
 */
router.post('/initialize', async (req, res) => {
  try {
    const { config = {}, graphData = null } = req.body;

    const recConfig = new RecommendationConfig(config);
    engine = new RecommendationEngine(recConfig);
    learningCoordinator = new DistributedLearningCoordinator();

    let graph;

    if (graphData) {
      // Load provided graph
      graph = Hypergraph.fromAdjacencyList(graphData);
    } else {
      // Create sample graph for demo
      graph = createSampleGraph();
    }

    await engine.initialize(graph);

    res.json({
      success: true,
      stats: engine.getStats()
    });
  } catch (error) {
    console.error('Initialization error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Add media item to the graph
 */
router.post('/media', (req, res) => {
  try {
    if (!engine?.isInitialized) {
      return res.status(400).json({ error: 'Engine not initialized' });
    }

    const { id, title, genres, actors, directors, year, metadata = {} } = req.body;

    const mediaId = id || uuidv4();
    const mediaNode = new HyperNode(mediaId, 'media', {
      title,
      year,
      ...metadata
    });

    engine.graph.addNode(mediaNode);

    // Add genre edges
    if (genres && genres.length > 0) {
      for (const genre of genres) {
        let genreNode = engine.graph.getNodesByType('genre').find(n => n.data.name === genre);
        if (!genreNode) {
          genreNode = engine.graph.addNode(new HyperNode(null, 'genre', { name: genre }));
        }

        engine.graph.addEdge(new HyperEdge(null, 'same_genre', [mediaId, genreNode.id], 1.0));
      }
    }

    // Add actor edges
    if (actors && actors.length > 0) {
      for (const actor of actors) {
        let actorNode = engine.graph.getNodesByType('actor').find(n => n.data.name === actor);
        if (!actorNode) {
          actorNode = engine.graph.addNode(new HyperNode(null, 'actor', { name: actor }));
        }

        engine.graph.addEdge(new HyperEdge(null, 'same_cast', [mediaId, actorNode.id], 1.0));
      }
    }

    // Add director edges
    if (directors && directors.length > 0) {
      for (const director of directors) {
        let directorNode = engine.graph.getNodesByType('director').find(n => n.data.name === director);
        if (!directorNode) {
          directorNode = engine.graph.addNode(new HyperNode(null, 'director', { name: director }));
        }

        engine.graph.addEdge(new HyperEdge(null, 'same_director', [mediaId, directorNode.id], 1.0));
      }
    }

    res.json({
      success: true,
      mediaId,
      graphStats: engine.graph.getStats()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Record user interaction
 */
router.post('/interactions', async (req, res) => {
  try {
    if (!engine?.isInitialized) {
      return res.status(400).json({ error: 'Engine not initialized' });
    }

    const { userId, mediaId, interactionType, rating = 1.0 } = req.body;

    // Ensure user node exists
    let userNode = engine.graph.nodes.get(userId);
    if (!userNode) {
      userNode = engine.graph.addNode(new HyperNode(userId, 'user', { createdAt: Date.now() }));
    }

    // Add interaction edge
    const edge = new HyperEdge(
      null,
      `user_${interactionType}`,
      [userId, mediaId],
      rating,
      { timestamp: Date.now() }
    );

    engine.graph.addEdge(edge);

    res.json({
      success: true,
      edgeId: edge.id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get personalized recommendations for a user
 */
router.get('/recommendations/:userId', async (req, res) => {
  try {
    if (!engine?.isInitialized) {
      return res.status(400).json({ error: 'Engine not initialized' });
    }

    const { userId } = req.params;
    const {
      limit = 10,
      genres,
      year,
      includeExplanation = false
    } = req.query;

    const filters = {};
    if (genres) filters.genres = genres.split(',');
    if (year) filters.year = parseInt(year);

    const recommendations = await engine.getRecommendations(userId, {
      limit: parseInt(limit),
      filters,
      includeExplanation: includeExplanation === 'true'
    });

    res.json({
      userId,
      recommendations,
      count: recommendations.length,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get similar items
 */
router.get('/similar/:itemId', async (req, res) => {
  try {
    if (!engine?.isInitialized) {
      return res.status(400).json({ error: 'Engine not initialized' });
    }

    const { itemId } = req.params;
    const { limit = 10 } = req.query;

    const similar = await engine.getSimilarItems(itemId, {
      limit: parseInt(limit)
    });

    res.json({
      itemId,
      similar,
      count: similar.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get multi-seed recommendations
 */
router.post('/recommendations/multi-seed', async (req, res) => {
  try {
    if (!engine?.isInitialized) {
      return res.status(400).json({ error: 'Engine not initialized' });
    }

    const { seedIds, limit = 10, aggregation = 'mean' } = req.body;

    const recommendations = await engine.getMultiSeedRecommendations(seedIds, {
      limit,
      aggregation
    });

    res.json({
      seedIds,
      recommendations,
      count: recommendations.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get trending items
 */
router.get('/trending', async (req, res) => {
  try {
    if (!engine?.isInitialized) {
      return res.status(400).json({ error: 'Engine not initialized' });
    }

    const { limit = 10, timeWindow = 86400000 } = req.query;

    const trending = await engine.getTrending('global', {
      limit: parseInt(limit),
      timeWindow: parseInt(timeWindow)
    });

    res.json({
      trending,
      count: trending.length,
      timeWindow: parseInt(timeWindow)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Start distributed fine-tuning job
 */
router.post('/fine-tune', async (req, res) => {
  try {
    if (!engine?.isInitialized) {
      return res.status(400).json({ error: 'Engine not initialized' });
    }

    const { epochs = 5, batchSize = 32, numWorkers = 4 } = req.body;

    const job = await learningCoordinator.createJob(engine.graph.marketId, {
      epochs,
      batchSize,
      numWorkers
    });

    // Start job asynchronously
    learningCoordinator.startJob(
      job.id,
      engine.graph,
      engine.embeddings,
      engine.vectorStore
    ).catch(err => console.error('Fine-tuning error:', err));

    res.json({
      success: true,
      jobId: job.id,
      status: job.status
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get fine-tuning job status
 */
router.get('/fine-tune/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    const job = learningCoordinator.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job.toJSON());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * List all fine-tuning jobs
 */
router.get('/fine-tune', (req, res) => {
  try {
    const jobs = learningCoordinator?.listJobs() || [];
    res.json({ jobs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Export engine state
 */
router.get('/export', (req, res) => {
  try {
    if (!engine?.isInitialized) {
      return res.status(400).json({ error: 'Engine not initialized' });
    }

    const state = engine.exportState();
    res.json(state);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Import engine state
 */
router.post('/import', (req, res) => {
  try {
    const state = req.body;
    engine = RecommendationEngine.fromState(state);
    learningCoordinator = new DistributedLearningCoordinator();

    res.json({
      success: true,
      stats: engine.getStats()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get engine statistics
 */
router.get('/stats', (req, res) => {
  try {
    if (!engine?.isInitialized) {
      return res.status(400).json({ error: 'Engine not initialized' });
    }

    res.json(engine.getStats());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create sample graph for demo purposes
 */
function createSampleGraph() {
  const graph = new Hypergraph('sample-market');

  // Sample movies
  const movies = [
    { id: 'movie-1', title: 'The Matrix', year: 1999, genres: ['Sci-Fi', 'Action'], actors: ['Keanu Reeves', 'Laurence Fishburne'], directors: ['Wachowskis'] },
    { id: 'movie-2', title: 'John Wick', year: 2014, genres: ['Action', 'Thriller'], actors: ['Keanu Reeves'], directors: ['Chad Stahelski'] },
    { id: 'movie-3', title: 'Inception', year: 2010, genres: ['Sci-Fi', 'Thriller'], actors: ['Leonardo DiCaprio'], directors: ['Christopher Nolan'] },
    { id: 'movie-4', title: 'The Dark Knight', year: 2008, genres: ['Action', 'Drama'], actors: ['Christian Bale', 'Heath Ledger'], directors: ['Christopher Nolan'] },
    { id: 'movie-5', title: 'Interstellar', year: 2014, genres: ['Sci-Fi', 'Drama'], actors: ['Matthew McConaughey'], directors: ['Christopher Nolan'] },
    { id: 'movie-6', title: 'Blade Runner', year: 1982, genres: ['Sci-Fi', 'Thriller'], actors: ['Harrison Ford'], directors: ['Ridley Scott'] },
    { id: 'movie-7', title: 'Gladiator', year: 2000, genres: ['Action', 'Drama'], actors: ['Russell Crowe'], directors: ['Ridley Scott'] },
    { id: 'movie-8', title: 'Constantine', year: 2005, genres: ['Action', 'Fantasy'], actors: ['Keanu Reeves'], directors: ['Francis Lawrence'] },
    { id: 'movie-9', title: 'Tenet', year: 2020, genres: ['Sci-Fi', 'Action'], actors: ['John David Washington'], directors: ['Christopher Nolan'] },
    { id: 'movie-10', title: 'Speed', year: 1994, genres: ['Action', 'Thriller'], actors: ['Keanu Reeves', 'Sandra Bullock'], directors: ['Jan de Bont'] }
  ];

  // Genre nodes
  const genreMap = new Map();
  const actorMap = new Map();
  const directorMap = new Map();

  for (const movie of movies) {
    // Add movie node
    graph.addNode(new HyperNode(movie.id, 'media', {
      title: movie.title,
      year: movie.year
    }));

    // Add genres and edges
    for (const genre of movie.genres) {
      if (!genreMap.has(genre)) {
        const genreNode = graph.addNode(new HyperNode(`genre-${genre.toLowerCase()}`, 'genre', { name: genre }));
        genreMap.set(genre, genreNode);
      }
      graph.addEdge(new HyperEdge(null, 'same_genre', [movie.id, genreMap.get(genre).id], 1.0));
    }

    // Add actors and edges
    for (const actor of movie.actors) {
      if (!actorMap.has(actor)) {
        const actorNode = graph.addNode(new HyperNode(`actor-${actor.toLowerCase().replace(/ /g, '-')}`, 'actor', { name: actor }));
        actorMap.set(actor, actorNode);
      }
      graph.addEdge(new HyperEdge(null, 'same_cast', [movie.id, actorMap.get(actor).id], 1.0));
    }

    // Add directors and edges
    for (const director of movie.directors) {
      if (!directorMap.has(director)) {
        const directorNode = graph.addNode(new HyperNode(`director-${director.toLowerCase().replace(/ /g, '-')}`, 'director', { name: director }));
        directorMap.set(director, directorNode);
      }
      graph.addEdge(new HyperEdge(null, 'same_director', [movie.id, directorMap.get(director).id], 1.0));
    }
  }

  // Add sample users with interactions
  const users = ['user-alice', 'user-bob', 'user-charlie'];

  for (const userId of users) {
    graph.addNode(new HyperNode(userId, 'user', { createdAt: Date.now() }));

    // Random interactions
    const numInteractions = 2 + Math.floor(Math.random() * 3);
    const shuffledMovies = [...movies].sort(() => Math.random() - 0.5);

    for (let i = 0; i < numInteractions; i++) {
      graph.addEdge(new HyperEdge(
        null,
        'user_watch',
        [userId, shuffledMovies[i].id],
        3 + Math.random() * 2, // Rating 3-5
        { timestamp: Date.now() }
      ));
    }
  }

  console.log('Sample graph created:', graph.getStats());
  return graph;
}

module.exports = router;

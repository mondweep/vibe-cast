#!/usr/bin/env node
/**
 * RuVector Engine Demo
 *
 * Demonstrates the GPU-less recommendation engine capabilities
 */

const { Hypergraph, HyperNode, HyperEdge } = require('../src/core/hypergraph');
const { FastRPEmbedder, EmbeddingConfig, HyperedgeEmbedder } = require('../src/core/embeddings');
const { VectorStore } = require('../src/core/vector-store');
const { SPSAOptimizer, SPSAConfig } = require('../src/core/spsa-optimizer');
const { RecommendationEngine, RecommendationConfig } = require('../src/services/recommendation-engine');

async function runDemo() {
  console.log('\n🚀 RuVector Engine Demo\n');
  console.log('═'.repeat(60));

  // Step 1: Create a hypergraph
  console.log('\n📊 Step 1: Creating Hypergraph...\n');

  const graph = new Hypergraph('demo-market');

  // Add media items
  const movies = [
    { id: 'inception', title: 'Inception', genres: ['Sci-Fi', 'Thriller'], director: 'Nolan' },
    { id: 'interstellar', title: 'Interstellar', genres: ['Sci-Fi', 'Drama'], director: 'Nolan' },
    { id: 'tenet', title: 'Tenet', genres: ['Sci-Fi', 'Action'], director: 'Nolan' },
    { id: 'matrix', title: 'The Matrix', genres: ['Sci-Fi', 'Action'], director: 'Wachowskis' },
    { id: 'blade-runner', title: 'Blade Runner', genres: ['Sci-Fi', 'Thriller'], director: 'Ridley Scott' },
    { id: 'arrival', title: 'Arrival', genres: ['Sci-Fi', 'Drama'], director: 'Villeneuve' },
    { id: 'dune', title: 'Dune', genres: ['Sci-Fi', 'Adventure'], director: 'Villeneuve' },
    { id: 'dark-knight', title: 'The Dark Knight', genres: ['Action', 'Drama'], director: 'Nolan' }
  ];

  const genreNodes = new Map();
  const directorNodes = new Map();

  for (const movie of movies) {
    // Add movie node
    graph.addNode(new HyperNode(movie.id, 'media', { title: movie.title }));

    // Add genre connections
    for (const genre of movie.genres) {
      if (!genreNodes.has(genre)) {
        genreNodes.set(genre, graph.addNode(new HyperNode(`genre-${genre.toLowerCase()}`, 'genre', { name: genre })));
      }
      graph.addEdge(new HyperEdge(null, 'same_genre', [movie.id, genreNodes.get(genre).id], 1.0));
    }

    // Add director connections
    if (!directorNodes.has(movie.director)) {
      directorNodes.set(movie.director, graph.addNode(new HyperNode(`director-${movie.director.toLowerCase()}`, 'director', { name: movie.director })));
    }
    graph.addEdge(new HyperEdge(null, 'same_director', [movie.id, directorNodes.get(movie.director).id], 1.0));
  }

  console.log('Graph Stats:', graph.getStats());

  // Step 2: Generate embeddings
  console.log('\n📐 Step 2: Generating CPU-Optimized Embeddings (FastRP)...\n');

  const embedder = new FastRPEmbedder(new EmbeddingConfig({
    dimensions: 64,
    iterations: 3
  }));

  const embeddings = embedder.fit(graph);
  console.log(`Generated ${embeddings.size} node embeddings`);

  // Show sample embedding
  const sampleEmb = embeddings.get('inception');
  console.log(`\nSample embedding for 'Inception' (first 8 dims):`, sampleEmb.slice(0, 8).map(v => v.toFixed(3)));

  // Step 3: Build vector store
  console.log('\n🗄️ Step 3: Building Vector Store with IVF Index...\n');

  const vectorStore = new VectorStore({
    dimensions: 64,
    distanceMetric: 'cosine',
    numClusters: 4
  });

  for (const [nodeId, vector] of embeddings) {
    const node = graph.nodes.get(nodeId);
    vectorStore.add(nodeId, vector, {
      type: node.type,
      ...node.data
    });
  }

  vectorStore.buildIVFIndex();
  console.log('Vector Store Stats:', vectorStore.getStats());

  // Step 4: Find similar items
  console.log('\n🔍 Step 4: Finding Similar Items...\n');

  const queryVector = embeddings.get('inception');
  const similar = vectorStore.findNearest(queryVector, 5, { type: 'media' });

  console.log('Movies similar to "Inception":');
  for (const item of similar) {
    const node = graph.nodes.get(item.id);
    console.log(`  - ${node.data.title} (distance: ${item.distance.toFixed(4)})`);
  }

  // Step 5: Add user interactions
  console.log('\n👤 Step 5: Adding User Interactions...\n');

  const userId = 'user-demo';
  graph.addNode(new HyperNode(userId, 'user', { createdAt: Date.now() }));

  // User watched Nolan films
  graph.addEdge(new HyperEdge(null, 'user_watch', [userId, 'inception'], 5.0));
  graph.addEdge(new HyperEdge(null, 'user_watch', [userId, 'interstellar'], 4.5));
  graph.addEdge(new HyperEdge(null, 'user_watch', [userId, 'dark-knight'], 5.0));

  console.log('Added user interactions for demo user');

  // Step 6: Initialize Recommendation Engine
  console.log('\n🎯 Step 6: Initializing Recommendation Engine...\n');

  const engine = new RecommendationEngine(new RecommendationConfig({
    embeddingDimensions: 64,
    topK: 5,
    diversityWeight: 0.3
  }));

  await engine.initialize(graph);
  console.log('Engine Stats:', engine.getStats());

  // Step 7: Get recommendations
  console.log('\n✨ Step 7: Getting Personalized Recommendations...\n');

  const recommendations = await engine.getRecommendations(userId, {
    limit: 5,
    excludeIds: ['inception', 'interstellar', 'dark-knight'],
    includeExplanation: true
  });

  console.log(`Recommendations for user (who liked Nolan films):`);
  for (const rec of recommendations) {
    const node = graph.nodes.get(rec.id);
    console.log(`  - ${node?.data?.title || rec.id} (score: ${(1 - rec.distance).toFixed(3)})`);
    if (rec.explanation) {
      console.log(`    └─ ${rec.explanation}`);
    }
  }

  // Step 8: Fine-tune with SPSA
  console.log('\n🔧 Step 8: Fine-tuning with SPSA (Gradient-Free)...\n');

  const optimizer = new SPSAOptimizer(new SPSAConfig({
    epochs: 3,
    batchSize: 8,
    margin: 0.2
  }));

  const trainingResult = optimizer.train(graph, embeddings, vectorStore);
  console.log('Training completed:');
  console.log(`  - Final loss: ${trainingResult.finalLoss.toFixed(4)}`);
  console.log(`  - Iterations: ${trainingResult.iterations}`);

  // Step 9: Hyperedge embeddings
  console.log('\n🔗 Step 9: Generating Hyperedge Embeddings...\n');

  const edgeEmbedder = new HyperedgeEmbedder('attention');
  const edgeEmbeddings = edgeEmbedder.generateHyperedgeEmbeddings(graph, embeddings);
  console.log(`Generated ${edgeEmbeddings.size} hyperedge embeddings`);

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('\n✅ Demo Complete!\n');
  console.log('This demo showed:');
  console.log('  1. Hypergraph construction for media relationships');
  console.log('  2. CPU-optimized FastRP embedding generation');
  console.log('  3. Vector storage with IVF indexing');
  console.log('  4. Similarity search');
  console.log('  5. User interaction modeling');
  console.log('  6. Personalized recommendations');
  console.log('  7. SPSA gradient-free fine-tuning');
  console.log('  8. Hyperedge embedding aggregation');
  console.log('\nTo run the full server: npm start');
  console.log('');
}

runDemo().catch(console.error);

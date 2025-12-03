# RuVector Engine

**GPU-less Serverless Media Recommendation Engine**

A CloudRun-Native Hypergraph Architecture for building sophisticated media recommendations without GPU dependencies.

Built for the [Agentics Foundation TV5 Hackathon](https://agentics.org/hackathon)

## Features

- **Hypergraph Data Model**: Complex media relationships modeled as hyperedges (e.g., "films with same cast and genre")
- **CPU-Optimized Embeddings**: Node2Vec and FastRP algorithms that run efficiently on CPU
- **SPSA Gradient-Free Optimization**: Fine-tune embeddings without backpropagation using evolutionary strategies
- **Distributed Learning**: Federated averaging across CloudRun instances for scalable training
- **Vector Similarity Search**: IVF-based approximate nearest neighbor for fast recommendations
- **Stateless Design**: Query-time filtering maintains CloudRun's stateless architecture

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CloudRun Service Layer                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  API Routes  │  │   Rec Engine │  │  Distributed │          │
│  │              │  │              │  │   Learning   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Hypergraph  │  │  Embeddings  │  │   Vector     │          │
│  │    Model     │  │  (FastRP)    │  │    Store     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐          │
│  │      SPSA Optimizer (Gradient-Free Fine-Tuning)  │          │
│  └──────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Google Cloud Platform                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Cloud Run   │  │  Firestore   │  │   Cloud      │          │
│  │  (Compute)   │  │  (Graphs)    │  │   Storage    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Installation

```bash
npm install
```

### Run Demo

```bash
npm run demo
```

### Start Server

```bash
npm start
```

The server runs on port 8080 by default.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/health` | GET | Health check |
| `/api/v1/initialize` | POST | Initialize engine with sample or custom data |
| `/api/v1/recommendations/:userId` | GET | Get personalized recommendations |
| `/api/v1/similar/:itemId` | GET | Find similar items |
| `/api/v1/recommendations/multi-seed` | POST | Multi-seed recommendations |
| `/api/v1/trending` | GET | Get trending items |
| `/api/v1/media` | POST | Add media item |
| `/api/v1/interactions` | POST | Record user interaction |
| `/api/v1/fine-tune` | POST | Start distributed fine-tuning |
| `/api/v1/stats` | GET | Engine statistics |

## Example Usage

### Initialize Engine

```bash
curl -X POST http://localhost:8080/api/v1/initialize \
  -H "Content-Type: application/json" \
  -d '{"config": {"embeddingDimensions": 128}}'
```

### Get Recommendations

```bash
curl http://localhost:8080/api/v1/recommendations/user-alice?limit=10
```

### Add Media Item

```bash
curl -X POST http://localhost:8080/api/v1/media \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Inception",
    "genres": ["Sci-Fi", "Thriller"],
    "actors": ["Leonardo DiCaprio"],
    "directors": ["Christopher Nolan"],
    "year": 2010
  }'
```

### Record Interaction

```bash
curl -X POST http://localhost:8080/api/v1/interactions \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "mediaId": "movie-inception",
    "interactionType": "watch",
    "rating": 5
  }'
```

## Deploy to Google Cloud Run

### Prerequisites

1. Install [gcloud CLI](https://cloud.google.com/sdk/docs/install)
2. Authenticate: `gcloud auth login`
3. Set project: `gcloud config set project YOUR_PROJECT_ID`

### Deploy

```bash
# Build and deploy
npm run gcloud:deploy

# Or using Cloud Build
gcloud builds submit --config cloudbuild.yaml
```

### Docker

```bash
# Build
npm run docker:build

# Run locally
npm run docker:run
```

## Core Components

### Hypergraph (`src/core/hypergraph.js`)

Models media relationships as a hypergraph where:
- **Nodes**: Media items, actors, genres, directors, users
- **Hyperedges**: Multi-way relationships connecting related entities

### Embeddings (`src/core/embeddings.js`)

CPU-optimized embedding generation:
- **FastRP**: Fast Random Projection for quick, scalable embeddings
- **Node2Vec**: Biased random walks for capturing graph structure
- **Hyperedge Embeddings**: Weighted aggregation of connected nodes

### Vector Store (`src/core/vector-store.js`)

Efficient similarity search:
- Cosine, Euclidean, and Dot Product distances
- IVF (Inverted File) indexing for approximate nearest neighbor
- Query-time filtering for stateless operation

### SPSA Optimizer (`src/core/spsa-optimizer.js`)

Gradient-free fine-tuning for CPU-only environments:
- Simultaneous Perturbation Stochastic Approximation
- Contrastive learning with triplet loss
- Hard negative mining

### Distributed Learning (`src/services/distributed-learning.js`)

Scalable training across CloudRun instances:
- Federated averaging for gradient aggregation
- Worker-based micro-batch processing
- Streaming update handling

## Configuration

Environment variables (see `.env.example`):

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 8080 |
| `GCP_PROJECT_ID` | Google Cloud project | - |
| `GCP_REGION` | Deployment region | us-central1 |
| `VECTOR_DIMENSIONS` | Embedding size | 128 |
| `MAX_INSTANCES` | CloudRun max scale | 100 |

## Technical Details

### Why GPU-less?

This architecture proves sophisticated hypergraph-based recommendations are achievable without GPUs:

1. **FastRP** uses sparse random projections instead of neural networks
2. **SPSA** enables gradient-free optimization via evolutionary strategies
3. **Federated averaging** distributes computation across CloudRun instances
4. **CPU-optimized algorithms** (sparse matrix ops, efficient sampling)

### Scalability

Designed for the PRD target of 500M concurrent learning streams:

- Stateless CloudRun instances scale horizontally
- Graph structures serialized to Cloud Storage
- Embeddings stored in pgvector-enabled Cloud SQL
- Pub/Sub for distributed learning coordination

## License

Apache-2.0

## Acknowledgments

- [Agentics Foundation](https://agentics.org) - Hackathon organization
- [agentics-hackathon npm package](https://www.npmjs.com/package/agentics-hackathon)
- [agentic-flow](https://github.com/ruvnet/agentic-flow) - Multi-provider agent framework

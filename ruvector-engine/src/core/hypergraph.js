/**
 * Hypergraph Data Structure
 *
 * Implements a document-based hypergraph for modeling complex media relationships.
 * Hyperedges represent composite relationships like "films with same cast and genre".
 * Designed for stateless CloudRun environments with on-demand loading.
 */

const { v4: uuidv4 } = require('uuid');

class HyperNode {
  constructor(id, type, data = {}) {
    this.id = id || uuidv4();
    this.type = type; // 'media', 'actor', 'genre', 'director', 'market'
    this.data = data;
    this.embedding = null;
    this.createdAt = Date.now();
    this.updatedAt = Date.now();
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      data: this.data,
      embedding: this.embedding,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromJSON(json) {
    const node = new HyperNode(json.id, json.type, json.data);
    node.embedding = json.embedding;
    node.createdAt = json.createdAt;
    node.updatedAt = json.updatedAt;
    return node;
  }
}

class HyperEdge {
  constructor(id, type, nodeIds = [], weight = 1.0, metadata = {}) {
    this.id = id || uuidv4();
    this.type = type; // 'same_cast', 'same_genre', 'same_director', 'user_interaction', etc.
    this.nodeIds = nodeIds; // Array of connected node IDs
    this.weight = weight;
    this.metadata = metadata;
    this.embedding = null;
    this.createdAt = Date.now();
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      nodeIds: this.nodeIds,
      weight: this.weight,
      metadata: this.metadata,
      embedding: this.embedding,
      createdAt: this.createdAt
    };
  }

  static fromJSON(json) {
    const edge = new HyperEdge(json.id, json.type, json.nodeIds, json.weight, json.metadata);
    edge.embedding = json.embedding;
    edge.createdAt = json.createdAt;
    return edge;
  }
}

class Hypergraph {
  constructor(marketId = 'global') {
    this.marketId = marketId;
    this.nodes = new Map(); // id -> HyperNode
    this.edges = new Map(); // id -> HyperEdge
    this.nodeIndex = new Map(); // type -> Set of node IDs
    this.edgeIndex = new Map(); // type -> Set of edge IDs
    this.nodeToEdges = new Map(); // nodeId -> Set of edge IDs
    this.marketEmbedding = null;
  }

  /**
   * Add a node to the hypergraph
   */
  addNode(node) {
    if (!(node instanceof HyperNode)) {
      node = new HyperNode(node.id, node.type, node.data);
    }

    this.nodes.set(node.id, node);

    // Update type index
    if (!this.nodeIndex.has(node.type)) {
      this.nodeIndex.set(node.type, new Set());
    }
    this.nodeIndex.get(node.type).add(node.id);

    return node;
  }

  /**
   * Add a hyperedge connecting multiple nodes
   */
  addEdge(edge) {
    if (!(edge instanceof HyperEdge)) {
      edge = new HyperEdge(edge.id, edge.type, edge.nodeIds, edge.weight, edge.metadata);
    }

    this.edges.set(edge.id, edge);

    // Update type index
    if (!this.edgeIndex.has(edge.type)) {
      this.edgeIndex.set(edge.type, new Set());
    }
    this.edgeIndex.get(edge.type).add(edge.id);

    // Update node-to-edge mappings
    for (const nodeId of edge.nodeIds) {
      if (!this.nodeToEdges.has(nodeId)) {
        this.nodeToEdges.set(nodeId, new Set());
      }
      this.nodeToEdges.get(nodeId).add(edge.id);
    }

    return edge;
  }

  /**
   * Get all nodes of a specific type
   */
  getNodesByType(type) {
    const ids = this.nodeIndex.get(type) || new Set();
    return Array.from(ids).map(id => this.nodes.get(id));
  }

  /**
   * Get all edges connecting to a node
   */
  getEdgesForNode(nodeId) {
    const edgeIds = this.nodeToEdges.get(nodeId) || new Set();
    return Array.from(edgeIds).map(id => this.edges.get(id));
  }

  /**
   * Get neighboring nodes through hyperedges
   */
  getNeighbors(nodeId, edgeTypes = null) {
    const neighbors = new Set();
    const edges = this.getEdgesForNode(nodeId);

    for (const edge of edges) {
      if (edgeTypes && !edgeTypes.includes(edge.type)) continue;

      for (const nid of edge.nodeIds) {
        if (nid !== nodeId) {
          neighbors.add(nid);
        }
      }
    }

    return Array.from(neighbors).map(id => this.nodes.get(id));
  }

  /**
   * Convert to adjacency list format for serialization
   */
  toAdjacencyList() {
    const adjacency = {};

    for (const [nodeId, node] of this.nodes) {
      adjacency[nodeId] = {
        node: node.toJSON(),
        edges: this.getEdgesForNode(nodeId).map(e => e.id),
        neighbors: this.getNeighbors(nodeId).map(n => n.id)
      };
    }

    return {
      marketId: this.marketId,
      adjacency,
      edges: Array.from(this.edges.values()).map(e => e.toJSON()),
      marketEmbedding: this.marketEmbedding
    };
  }

  /**
   * Load from adjacency list format
   */
  static fromAdjacencyList(data) {
    const graph = new Hypergraph(data.marketId);
    graph.marketEmbedding = data.marketEmbedding;

    // First, add all edges
    for (const edgeData of data.edges) {
      graph.edges.set(edgeData.id, HyperEdge.fromJSON(edgeData));

      if (!graph.edgeIndex.has(edgeData.type)) {
        graph.edgeIndex.set(edgeData.type, new Set());
      }
      graph.edgeIndex.get(edgeData.type).add(edgeData.id);
    }

    // Then add nodes and build indexes
    for (const [nodeId, nodeData] of Object.entries(data.adjacency)) {
      const node = HyperNode.fromJSON(nodeData.node);
      graph.nodes.set(node.id, node);

      if (!graph.nodeIndex.has(node.type)) {
        graph.nodeIndex.set(node.type, new Set());
      }
      graph.nodeIndex.get(node.type).add(node.id);

      graph.nodeToEdges.set(nodeId, new Set(nodeData.edges));
    }

    return graph;
  }

  /**
   * Query-time filter without modifying graph structure
   * This maintains statelessness for CloudRun
   */
  queryWithFilters(filters = {}) {
    let nodes = Array.from(this.nodes.values());
    let edges = Array.from(this.edges.values());

    // Filter by node type
    if (filters.nodeTypes) {
      nodes = nodes.filter(n => filters.nodeTypes.includes(n.type));
    }

    // Filter by edge type
    if (filters.edgeTypes) {
      edges = edges.filter(e => filters.edgeTypes.includes(e.type));
    }

    // Filter by metadata
    if (filters.metadata) {
      for (const [key, value] of Object.entries(filters.metadata)) {
        nodes = nodes.filter(n => n.data[key] === value);
      }
    }

    // Filter by date range
    if (filters.fromDate) {
      nodes = nodes.filter(n => n.createdAt >= filters.fromDate);
    }
    if (filters.toDate) {
      nodes = nodes.filter(n => n.createdAt <= filters.toDate);
    }

    return { nodes, edges };
  }

  /**
   * Get statistics about the hypergraph
   */
  getStats() {
    const nodeTypeCounts = {};
    for (const [type, ids] of this.nodeIndex) {
      nodeTypeCounts[type] = ids.size;
    }

    const edgeTypeCounts = {};
    for (const [type, ids] of this.edgeIndex) {
      edgeTypeCounts[type] = ids.size;
    }

    return {
      marketId: this.marketId,
      totalNodes: this.nodes.size,
      totalEdges: this.edges.size,
      nodeTypeCounts,
      edgeTypeCounts,
      hasMarketEmbedding: !!this.marketEmbedding
    };
  }
}

module.exports = { HyperNode, HyperEdge, Hypergraph };

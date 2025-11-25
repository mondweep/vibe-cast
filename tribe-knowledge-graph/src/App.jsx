import React, { useEffect, useState, useRef, useCallback } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import io from 'socket.io-client';
import * as THREE from 'three';

// Connect to the backend server
const socket = io('/', {
  path: '/socket.io',
});

function App() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [isConnected, setIsConnected] = useState(false);
  const [newNodeName, setNewNodeName] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const fgRef = useRef();

  useEffect(() => {
    // Socket event listeners
    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('init-graph', (data) => {
      setGraphData(data);
    });

    socket.on('graph-update', (data) => {
      // Preserve the current camera position/interaction state if possible
      // For ForceGraph, updating data usually triggers a re-render/re-simulation
      // We want to merge smoothly
      setGraphData(data);
    });

    socket.on('node-added', (node) => {
      // Optional: Camera focus on new node?
      // if (fgRef.current) {
      //   const distance = 40;
      //   const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
      //   fgRef.current.cameraPosition(
      //     { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
      //     node,
      //     3000
      //   );
      // }
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('init-graph');
      socket.off('graph-update');
      socket.off('node-added');
    };
  }, []);

  const handleAddNode = (e) => {
    e.preventDefault();
    if (!newNodeName.trim()) return;

    const nodeData = {
      name: newNodeName,
      parentId: selectedNode ? selectedNode.id : null
    };

    socket.emit('add-node', nodeData);
    setNewNodeName('');
    // Deselect after adding if you want, or keep selected to chain add
  };

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
    // Aim at node from outside it
    const distance = 40;
    const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

    if (fgRef.current) {
      fgRef.current.cameraPosition(
        { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
        node, // lookAt ({ x, y, z })
        3000  // ms transition duration
      );
    }
  }, [fgRef]);

  const handleBackgroundClick = () => {
    setSelectedNode(null);
  };

  return (
    <div className="app-container">
      {/* 3D Graph Visualization */}
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        nodeLabel="name"
        nodeAutoColorBy="group"
        nodeRelSize={6}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={d => 0.005}
        onNodeClick={handleNodeClick}
        onBackgroundClick={handleBackgroundClick}
        backgroundColor="#000000"
        showNavInfo={false}
        nodeThreeObject={node => {
          // Create a custom 3D object for nodes (Glowing Sphere)
          const group = new THREE.Group();

          // Core sphere
          const geometry = new THREE.SphereGeometry(node.val || 5, 32, 32);
          const material = new THREE.MeshPhongMaterial({
            color: node.color || '#00ff88',
            transparent: true,
            opacity: 0.8,
            emissive: node.color || '#00ff88',
            emissiveIntensity: 0.6
          });
          const sphere = new THREE.Mesh(geometry, material);
          group.add(sphere);

          // Text Label (Sprite)
          // Simple implementation: we'll rely on default labels on hover for now
          // or we could add SpriteText here for permanent labels

          // Selection Halo
          if (selectedNode && selectedNode.id === node.id) {
            const ringGeo = new THREE.RingGeometry((node.val || 5) * 1.5, (node.val || 5) * 1.8, 32);
            const ringMat = new THREE.MeshBasicMaterial({
              color: '#ffffff',
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.5
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.lookAt(fgRef.current.camera().position); // Always face camera
            group.add(ring);
          }

          return group;
        }}
      />

      {/* UI Overlay */}
      <div className="ui-overlay">
        <div className="header">
          <h1 className="title">Tribe Mind</h1>
          <div className="subtitle">Collaborative Knowledge Graph</div>
        </div>

        <div className="status-bar">
          <div className="status-item">
            <div className={`dot ${isConnected ? '' : 'red'}`}></div>
            {isConnected ? 'Live Sync Active' : 'Disconnected'}
          </div>
          <div className="status-item">
            {graphData.nodes.length} Nodes
          </div>
          {selectedNode && (
            <div className="status-item" style={{ borderColor: '#00ff88', color: '#00ff88' }}>
              Selected: {selectedNode.name}
            </div>
          )}
        </div>

        <div className="controls-panel">
          <form onSubmit={handleAddNode}>
            <div className="input-group">
              <label style={{ fontSize: '0.8rem', color: '#a0a0a0' }}>
                {selectedNode
                  ? `Add connection to "${selectedNode.name}"`
                  : "Add new concept"}
              </label>
              <input
                type="text"
                className="input-field"
                value={newNodeName}
                onChange={(e) => setNewNodeName(e.target.value)}
                placeholder="Enter concept name..."
                autoFocus
              />
            </div>
            <button type="submit" className="action-btn" style={{ width: '100%' }}>
              {selectedNode ? 'Connect Node' : 'Add Node'}
            </button>
          </form>

          <div style={{ marginTop: '15px', fontSize: '0.8rem', color: '#666', textAlign: 'center' }}>
            Click a node to select/connect. <br /> Drag to rotate. Scroll to zoom.
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

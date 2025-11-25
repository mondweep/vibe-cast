import React, { useEffect, useState, useRef, useCallback } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import PubNub from 'pubnub';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import ChatOverlay from './components/ChatOverlay';

// Initialize PubNub with Demo Keys
const pubnub = new PubNub({
  publishKey: 'demo',
  subscribeKey: 'demo',
  uuid: uuidv4()
});

const CHANNEL = 'tribe-mind-global';

function App() {
  const [username, setUsername] = useState(''); // Current user's name
  const [graphData, setGraphData] = useState({
    nodes: [
      { id: 'tribe', group: 1, name: 'Tribe Mind', val: 20 },
      { id: 'knowledge', group: 2, name: 'Knowledge Base', val: 10 },
      { id: 'collaboration', group: 2, name: 'Collaboration', val: 10 },
      { id: 'innovation', group: 2, name: 'Innovation', val: 10 }
    ],
    links: [
      { source: 'tribe', target: 'knowledge' },
      { source: 'tribe', target: 'collaboration' },
      { source: 'tribe', target: 'innovation' },
      { source: 'knowledge', target: 'innovation' }
    ]
  });

  const [isConnected, setIsConnected] = useState(false);
  const [newNodeName, setNewNodeName] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const fgRef = useRef();

  // Helper to merge new data into graph
  const mergeGraphData = useCallback((newData) => {
    setGraphData(prevData => {
      const nodesMap = new Map(prevData.nodes.map(n => [n.id, n]));
      const linksSet = new Set(prevData.links.map(l => `${l.source.id || l.source}-${l.target.id || l.target}`));

      // Add new nodes
      if (newData.nodes) {
        newData.nodes.forEach(n => {
          if (!nodesMap.has(n.id)) nodesMap.set(n.id, n);
        });
      }

      // Add new links
      const newLinks = [...prevData.links];
      if (newData.links) {
        newData.links.forEach(l => {
          const linkId = `${l.source}-${l.target}`;
          if (!linksSet.has(linkId)) {
            newLinks.push(l);
            linksSet.add(linkId);
          }
        });
      }

      return {
        nodes: Array.from(nodesMap.values()),
        links: newLinks
      };
    });
  }, []);

  useEffect(() => {
    // 1. Subscribe to Channel
    pubnub.subscribe({ channels: [CHANNEL] });
    setIsConnected(true);

    // 2. Listen for Events
    const listener = {
      message: (event) => {
        const msg = event.message;

        if (msg.type === 'add-node') {
          mergeGraphData({ nodes: [msg.data.node], links: msg.data.link ? [msg.data.link] : [] });
        } else if (msg.type === 'import-graph') {
          // For full import, we replace state (or merge heavily)
          // For simplicity in this demo, we'll just merge
          mergeGraphData(msg.data);
        }
      },
      presence: (event) => {
        // Could handle user join/leave here
      }
    };

    pubnub.addListener(listener);

    // 3. Fetch History (Restore State)
    pubnub.fetchMessages({
      channels: [CHANNEL],
      count: 100 // Get last 100 actions
    }).then((response) => {
      if (response.channels[CHANNEL]) {
        console.log(`Replaying ${response.channels[CHANNEL].length} events from history...`);
        response.channels[CHANNEL].forEach((msg) => {
          if (msg.message.type === 'add-node') {
            mergeGraphData({
              nodes: [msg.message.data.node],
              links: msg.message.data.link ? [msg.message.data.link] : []
            });
          } else if (msg.message.type === 'import-graph') {
            mergeGraphData(msg.message.data);
          }
        });
      }
    });

    return () => {
      pubnub.unsubscribeAll();
      pubnub.removeListener(listener);
    };
  }, [mergeGraphData]);

  const handleAddNode = (e) => {
    e.preventDefault();
    if (!newNodeName.trim()) return;

    const newNode = {
      id: uuidv4(),
      group: Math.floor(Math.random() * 5) + 2,
      name: newNodeName,
      val: 5 + Math.random() * 5
    };

    const payload = {
      type: 'add-node',
      data: {
        node: newNode,
        link: null
      }
    };

    if (selectedNode) {
      payload.data.link = {
        source: selectedNode.id,
        target: newNode.id
      };
    }

    // Optimistic Update
    mergeGraphData({ nodes: [newNode], links: payload.data.link ? [payload.data.link] : [] });

    // Publish to Network
    pubnub.publish({
      channel: CHANNEL,
      message: payload
    });

    setNewNodeName('');
  };

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
    const distance = 40;
    const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

    if (fgRef.current) {
      fgRef.current.cameraPosition(
        { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
        node,
        3000
      );
    }
  }, [fgRef]);

  const handleBackgroundClick = () => {
    setSelectedNode(null);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(graphData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `tribe-mind-${new Date().toISOString().slice(0, 10)}.json`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (importedData.nodes && importedData.links) {
          // Publish import event
          pubnub.publish({
            channel: CHANNEL,
            message: {
              type: 'import-graph',
              data: importedData
            }
          });

          // Also update locally immediately
          mergeGraphData(importedData);
          alert('Graph imported successfully! Broadcasting to tribe...');
        } else {
          alert('Invalid graph file format');
        }
      } catch (err) {
        console.error('Error parsing file:', err);
        alert('Error parsing JSON file');
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
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

          <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px', display: 'flex', gap: '10px' }}>
            <button onClick={handleExport} className="action-btn" style={{ flex: 1, background: '#333', fontSize: '0.8rem' }}>
              💾 Export
            </button>
            <label className="action-btn" style={{ flex: 1, background: '#333', fontSize: '0.8rem', textAlign: 'center', cursor: 'pointer' }}>
              📂 Import
              <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
            </label>
          </div>

          <div style={{ marginTop: '15px', fontSize: '0.8rem', color: '#666', textAlign: 'center' }}>
            Click a node to select/connect. <br /> Drag to rotate. Scroll to zoom.
          </div>
        </div>

        {/* Chat & Presence Overlay */}
        <ChatOverlay
          pubnub={pubnub}
          channel={CHANNEL}
          onUsernameSet={setUsername}
        />
      </div>
    </div >
  );
}

export default App;

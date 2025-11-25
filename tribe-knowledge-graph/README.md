# Tribe Mind - Collaborative Knowledge Graph

A real-time, 3D collaborative knowledge graph for visualizing collective intelligence.

## 🌟 Features

- **Real-time Collaboration**: Multiple users can add nodes and links simultaneously.
- **3D Visualization**: Interactive force-directed graph using `react-force-graph-3d`.
- **Live Sync**: Powered by Socket.io for instant updates across all clients.
- **Premium UI**: Dark-themed, futuristic aesthetic ("Tribe" theme).

## 🚀 Getting Started

1.  **Install Dependencies**:
    ```bash
    cd tribe-knowledge-graph
    npm install
    ```

2.  **Start the Application**:
    ```bash
    npm start
    ```
    This command runs both the backend server (port 3001) and the frontend dev server (port 5173) concurrently.

3.  **Open in Browser**:
    Visit `http://localhost:5173`

## 🎮 How to Use

- **Navigate**: Left-click + drag to rotate. Right-click + drag to pan. Scroll to zoom.
- **Add Node**: Type a name in the bottom-right panel and click "Add Node".
- **Connect Nodes**: Click on an existing node to select it (it will have a halo). Then type a name and click "Connect Node" to create a new linked concept.
- **Explore**: Watch as others add nodes in real-time!

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Three.js, react-force-graph-3d
- **Backend**: Node.js, Express, Socket.io
- **Styling**: Vanilla CSS (Premium Dark Theme)

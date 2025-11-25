# Tribe Mind - Collaborative Knowledge Graph

A real-time, 3D collaborative knowledge graph for visualizing collective intelligence.

## 🌟 Features

- **Real-time Collaboration**: Multiple users can add nodes and links simultaneously using **PubNub**.
- **3D Visualization**: Interactive force-directed graph using `react-force-graph-3d`.
- **Serverless Architecture**: Fully client-side application, deployable to Netlify.
- **History Playback**: New users automatically fetch recent graph history to sync up.
- **Premium UI**: Dark-themed, futuristic aesthetic ("Tribe" theme).

## 🚀 Getting Started

1.  **Install Dependencies**:
    ```bash
    cd tribe-knowledge-graph
    npm install
    ```

2.  **Start the Application**:
    ```bash
    npm run dev
    ```

3.  **Open in Browser**:
    Visit `http://localhost:5173`

## 🎮 How to Use

- **Navigate**: Left-click + drag to rotate. Right-click + drag to pan. Scroll to zoom.
- **Add Node**: Type a name in the bottom-right panel and click "Add Node".
- **Connect Nodes**: Click on an existing node to select it (it will have a halo). Then type a name and click "Connect Node" to create a new linked concept.
- **Export/Import**: Save your session to JSON or load a previous one.
- **Collaborate**: Share the URL (if deployed) or open multiple tabs to see real-time updates!

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Three.js, react-force-graph-3d
- **Real-time Network**: PubNub (Serverless)
- **Styling**: Vanilla CSS (Premium Dark Theme)

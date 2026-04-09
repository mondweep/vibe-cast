import { useState } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="App">
      <header className="App-header">
        <h1>🔮 Pi Network Explorer</h1>
        <p>A decentralized collective intelligence platform</p>
      </header>

      <main>
        <section className="welcome">
          <h2>Welcome to the Pi Network Explorer</h2>
          <p>
            This application enables exploration, querying, and contribution to the π (Pi) Network—a
            decentralized collective intelligence platform powered by real-time updates.
          </p>

          <div className="features">
            <h3>Core Features (Coming Soon)</h3>
            <ul>
              <li>🔍 Knowledge Exploration - Search the pi network knowledge graph</li>
              <li>✍️ Knowledge Contribution - Submit new memories to the network</li>
              <li>🧪 API Testing Sandbox - Explore REST API endpoints interactively</li>
              <li>📊 Real-Time Dashboard - Live activity feed with network stats</li>
              <li>🔐 Authentication - Secure API key management</li>
            </ul>
          </div>

          <div className="status">
            <h3>Project Status</h3>
            <p>
              <strong>Phase:</strong> TASK-001 (Project Scaffold)
            </p>
            <p>
              This is the initial scaffold. UI components and API integrations are being built out
              according to SPEC-001.
            </p>
          </div>

          <button onClick={() => setCount((count) => count + 1)}>
            Build counter: {count}
          </button>
        </section>

        <section className="tech-stack">
          <h3>Tech Stack</h3>
          <ul>
            <li>Frontend: React + TypeScript + Vite</li>
            <li>Backend: Node.js + Netlify Functions</li>
            <li>Real-time: PubNub pub/sub messaging</li>
            <li>Hosting: Netlify</li>
            <li>Methodology: BHIL AI-First Development</li>
          </ul>
        </section>
      </main>
    </div>
  );
}

export default App;

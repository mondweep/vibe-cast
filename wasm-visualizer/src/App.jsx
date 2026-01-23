import { useState } from 'react';
import { Network, Activity, GitMerge, Orbit, Combine, Workflow } from 'lucide-react';

import CohomologyViz from './components/visualizations/CohomologyViz';
import SpectralViz from './components/visualizations/SpectralViz';
import CausalViz from './components/visualizations/CausalViz';
import QuantumViz from './components/visualizations/QuantumViz';
import CategoryViz from './components/visualizations/CategoryViz';
import HoTTViz from './components/visualizations/HoTTViz';
import DeepDivePanel from './components/DeepDivePanel';

const ENGINES = [
  {
    id: 'cohomology',
    name: 'Cohomology Engine',
    description: 'Finds hidden contradictions in data.',
    icon: <Network size={24} />,
    VizComponent: CohomologyViz,
    details: {
      concept: "Think of this as a \"Lie Detector\" for data. If one source says 'Meeting at 3pm' and another says 'John is free at 3pm', those facts don't fit together. This engine draws a shape connecting all the facts and checks if the loop closes properly. If it doesn't, there's a contradiction.",
      useCase: "Spotting hallucinations in AI chatbots. If the AI says 'The sky is green' in one sentence and 'The sky is blue' in another, this engine flags it immediately.",
      inputData: {
        graph: {
          id: 0,
          name: "Cohomology Graph",
          nodes: [
            { id: 0, label: "Meeting @ 3pm", section: [], weight: 1.0 },
            { id: 1, label: "John confirmed", section: [], weight: 1.0 },
            { id: 2, label: "Moves to 4pm", section: [], weight: 1.0 }
          ],
          edges: [
            { source: 0, target: 1, weight: 0.9, restriction_map: [1.0] },
            { source: 1, target: 2, weight: 0.5, restriction_map: [1.0] },
            { source: 0, target: 2, weight: 0.2, restriction_map: [1.0] }
          ]
        }
      }
    }
  },
  {
    id: 'spectral',
    name: 'Spectral Engine',
    description: 'Measures how fragile a network is.',
    icon: <Activity size={24} />,
    VizComponent: SpectralViz,
    details: {
      concept: "This engine vibrates the network to see where it breaks. Just like tapping a glass to hear if it rings clearly or sounds cracked, this engine analyzes the 'sound' (eigenvalues) of a network to find weak points or bottlenecks.",
      useCase: "Checking if a team of AI agents is actually working together or just grouped into isolated silos (echo chambers).",
      inputData: {
        graph: {
          n: 4,
          edges: [[0, 1], [1, 2], [2, 3], [3, 0]]
        },
        config: { num_eigenvalues: 4, tolerance: 1e-6 }
      }
    }
  },
  {
    id: 'causal',
    name: 'Causal Engine',
    description: 'Separates cause from coincidence.',
    icon: <GitMerge size={24} />,
    VizComponent: CausalViz,
    details: {
      concept: "Did the rooster crowing *cause* the sun to rise? Or did they just happen together? This engine draws a map of events (A causes B) and uses math to prove whether one thing REALLY caused the other, or if a third hidden factor (a confounder) fooled you.",
      useCase: "Debugging AI decisions. Did the model reject the loan because of 'Bad Credit' (Cause) or 'Zip Code' (Bias/Coincidence)?",
      inputData: {
        variables: ["confounder", "treatment", "outcome"],
        edges: [["confounder", "treatment"], ["confounder", "outcome"], ["treatment", "outcome"]]
      }
    }
  },
  {
    id: 'quantum',
    name: 'Quantum Engine',
    description: 'Tracks deeply connected information.',
    icon: <Orbit size={24} />,
    VizComponent: QuantumViz,
    details: {
      concept: "In quantum mechanics, particles can be 'entangled', meaning they are linked no matter how far apart they are. This engine simulates that spooky connection. It's used for complex decision making where changing one small thing instantly changes the context for everything else.",
      useCase: "Modeling complex financial markets or social coordination where ripple effects are instant and non-local.",
      inputData: {
        ghz_state: "createGHZState(3)",
        w_state: "createWState(3)"
      }
    }
  },
  {
    id: 'category',
    name: 'Category Engine',
    description: 'Ensures processes plug together correctly.',
    icon: <Combine size={24} />,
    VizComponent: CategoryViz,
    details: {
      concept: "Think of this as checking which Lego bricks fit together. It doesn't care about the color of the brick (the data inside), only the shape of the connector. It ensures that Step A leads to Step B, and Step B leads to Step C, so Step A *must* act like it leads to Step C.",
      useCase: "Verifying large software pipelines. Ensuring that if you translate English -> French -> Spanish, the meaning is preserved structurally.",
      inputData: {
        objects: [{ id: "0", name: "A", dimension: 1 }, { id: "1", name: "B" }, { id: "2", name: "C" }],
        morphisms: [
          { name: "f", source: "A", target: "B", matrix: [2.0] },
          { name: "g", source: "B", target: "C", matrix: [3.0] }
        ]
      }
    }
  },
  {
    id: 'hott',
    name: 'HoTT Engine',
    description: 'Strictly proves that two things are identical.',
    icon: <Workflow size={24} />,
    VizComponent: HoTTViz,
    details: {
      concept: "In standard math, 2+2=4. In Homotopy Type Theory, we ask 'HOW are they equal?'. It treats equality like a path you walk from one value to another. If you can walk that path without hitting a wall, they are the same.",
      useCase: "Formal verification. Proving that a secure login code is *mathematically identical* to the verified safe protocol, preventing bugs.",
      inputData: {
        type: { name: "Nat", kind: "base", level: 0 },
        point: { value: "42", kind: "term" },
        path: "refl"
      }
    }
  }
];

function App() {
  const [activeEngine, setActiveEngine] = useState(null);

  const handleClose = () => setActiveEngine(null);

  const activeEngineData = ENGINES.find(e => e.id === activeEngine);

  return (
    <div className="app-container">
      <header className="header">
        <h1 className="title">Prime Radiant</h1>
        <p className="subtitle">Advanced Mathematical Engines for AI Safety</p>
      </header>

      <div className="engine-grid">
        {ENGINES.map((engine) => (
          <div
            key={engine.id}
            className="engine-card"
            onClick={() => setActiveEngine(engine.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ color: 'var(--accent-primary)' }}>{engine.icon}</div>
              <h2>{engine.name}</h2>
            </div>
            <p>{engine.description}</p>
            <div className="viz-preview">
              <engine.VizComponent />
            </div>
          </div>
        ))}
      </div>

      {activeEngine && (
        <DeepDivePanel
          engine={activeEngineData}
          onClose={handleClose}
        />
      )}
    </div>
  );
}

export default App;

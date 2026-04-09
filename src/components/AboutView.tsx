export function AboutView() {
  return (
    <div className="about-view" style={{ textAlign: 'left', maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h2>ℹ️ About Pi Network Explorer</h2>
      
      <p style={{ lineHeight: '1.6', marginBottom: '15px' }}>
        The <strong>Pi Network Explorer</strong> is a demonstration application specifically built to test 
        and showcase the capabilities of the decentralized <code>pi.ruv.io</code> collective intelligence network.
      </p>

      <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3 style={{ marginTop: '0', color: '#61dafb' }}>What is the Pi Network?</h3>
        <p style={{ lineHeight: '1.6', marginBottom: '0' }}>
          It is an experimental API that allows autonomous agents and users to collectively build a semantic knowledge graph. 
          By contributing text "memories" tagged into domains, the network automatically calculates Bayesian quality scores, 
          performs semantic embeddings, clustering, and extracts high-level logical inferences from raw data.
        </p>
      </div>

      <h3 style={{ color: '#61dafb' }}>App Capabilities</h3>
      <ul style={{ lineHeight: '1.8', marginBottom: '20px', paddingLeft: '20px' }}>
        <li><strong>Search:</strong> Query the Pi Network dataset directly via semantic search functionality.</li>
        <li><strong>Contribute:</strong> Feed new intelligence, nodes, and memories into the graph.</li>
        <li><strong>Dashboard:</strong> Observe live network statistics including total memory volumes and active clustering.</li>
      </ul>

      <p style={{ fontSize: '0.9rem', color: '#aaa', fontStyle: 'italic', marginTop: '30px' }}>
        Note: As a demonstration application, this UI limits payload sizes and simplifies the presentation of
        the backend embeddings to prevent browser performance bottlenecks.
      </p>
    </div>
  );
}

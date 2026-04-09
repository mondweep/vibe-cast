import { useState, useEffect } from 'react';
import { SearchView } from './components/SearchView';
import { ContributeView } from './components/ContributeView';
import { Dashboard } from './components/Dashboard';
import { AboutView } from './components/AboutView';
import './App.css';

type View = 'dashboard' | 'search' | 'contribute' | 'about' | 'auth';

function App() {
  const [currentView, setCurrentView] = useState<View>('auth');
  const [apiKey, setApiKey] = useState('');
  const [tempApiKey, setTempApiKey] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [error, setError] = useState('');

  // Initialize session on mount
  useEffect(() => {
    const existingSessionId = sessionStorage.getItem('sessionId');
    const existingApiKey = sessionStorage.getItem('piNetworkApiKey');

    if (existingSessionId && existingApiKey) {
      setSessionId(existingSessionId);
      setApiKey(existingApiKey);
      setCurrentView('dashboard');
    } else {
      // Check for API key in environment variables (Vite loads VITE_*)
      const envApiKey = import.meta.env.VITE_PI_NETWORK_API_KEY;
      if (envApiKey) {
        console.log('Using API key from environment variables');
        setApiKey(envApiKey);
        sessionStorage.setItem('piNetworkApiKey', envApiKey);
        setCurrentView('dashboard');
      }

      // Generate new session ID
      const newSessionId = `session_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
      setSessionId(newSessionId);
      sessionStorage.setItem('sessionId', newSessionId);
    }
  }, []);

  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!tempApiKey.trim()) {
      setError('Please enter your Pi Network API key');
      return;
    }

    // Store API key in sessionStorage (never in localStorage for security)
    sessionStorage.setItem('piNetworkApiKey', tempApiKey);
    setApiKey(tempApiKey);
    setTempApiKey('');
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('piNetworkApiKey');
    setApiKey('');
    setTempApiKey('');
    setCurrentView('auth');
    setError('');
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <h1>🔮 Pi Network Explorer</h1>
          <p>A decentralized collective intelligence platform</p>
        </div>

        {apiKey && (
          <nav className="main-nav">
            <button
              className={`nav-btn ${currentView === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentView('dashboard')}
            >
              📊 Dashboard
            </button>
            <button
              className={`nav-btn ${currentView === 'search' ? 'active' : ''}`}
              onClick={() => setCurrentView('search')}
            >
              🔍 Search
            </button>
            <button
              className={`nav-btn ${currentView === 'contribute' ? 'active' : ''}`}
              onClick={() => setCurrentView('contribute')}
            >
              ✍️ Contribute
            </button>
            <button
              className={`nav-btn ${currentView === 'about' ? 'active' : ''}`}
              onClick={() => setCurrentView('about')}
            >
              ℹ️ About
            </button>
            <button className="nav-btn logout-btn" onClick={handleLogout}>
              🚪 Logout
            </button>
          </nav>
        )}
      </header>

      <main className="main-content">
        {currentView === 'auth' ? (
          <div className="auth-container">
            <section className="auth-section">
              <h2>🔐 Connect to Pi Network</h2>
              <p>Enter your Pi Network API key to get started</p>

              <form onSubmit={handleApiKeySubmit} className="auth-form">
                <div className="form-group">
                  <label htmlFor="apiKey">API Key</label>
                  <input
                    id="apiKey"
                    type="password"
                    value={tempApiKey}
                    onChange={(e) => {
                      setTempApiKey(e.target.value);
                      setError('');
                    }}
                    placeholder="Enter your pi.ruv.io API key"
                    autoFocus
                  />
                </div>

                {error && <div className="error-message">{error}</div>}

                <button type="submit">Connect</button>
              </form>

              <div className="auth-info">
                <h3>About API Keys</h3>
                <p>
                  You can get your API key from{' '}
                  <a href="https://pi.ruv.io" target="_blank" rel="noopener noreferrer">
                    pi.ruv.io
                  </a>
                  . Your key is stored securely in session storage only.
                </p>
              </div>
            </section>

            <section className="features-preview">
              <h2>What you can do</h2>
              <div className="features-grid">
                <div className="feature-card">
                  <div className="feature-icon">🔍</div>
                  <h3>Search Knowledge</h3>
                  <p>Query the network's collective knowledge graph with semantic search</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">✍️</div>
                  <h3>Contribute</h3>
                  <p>Share your insights and memories with the network</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">🗳️</div>
                  <h3>Vote</h3>
                  <p>Rate knowledge quality and improve collective intelligence</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">📊</div>
                  <h3>Real-Time Updates</h3>
                  <p>Watch the network evolve with live activity feeds</p>
                </div>
              </div>
            </section>
          </div>
        ) : currentView === 'dashboard' ? (
          <Dashboard sessionId={sessionId} />
        ) : currentView === 'search' ? (
          <SearchView sessionId={sessionId} />
        ) : currentView === 'contribute' ? (
          <ContributeView sessionId={sessionId} />
        ) : currentView === 'about' ? (
          <AboutView />
        ) : null}
      </main>

      <footer className="App-footer">
        <p>
          🔮 Pi Network Explorer • Powered by React, Netlify Functions, and PubNub • Built with BHIL Methodology
        </p>
        <p style={{ marginTop: '10px', fontSize: '0.9rem' }}>
          Created by <a href="https://www.linkedin.com/in/mondweepchakravorty" target="_blank" rel="noopener noreferrer" style={{ color: '#61dafb', textDecoration: 'none' }}>Mondweep Chakravorty</a> • 
          View repository on <a href="https://github.com/mondweep/vibe-cast" target="_blank" rel="noopener noreferrer" style={{ color: '#61dafb', textDecoration: 'none' }}>GitHub</a>
        </p>
      </footer>
    </div>
  );
}

export default App;

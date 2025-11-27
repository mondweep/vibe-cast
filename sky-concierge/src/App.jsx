import React, { useState, useEffect } from 'react';
import FlightStatusCard from './components/FlightStatusCard';
import SmartAlarm from './components/SmartAlarm';
import './App.css';

function App() {
  const [flight, setFlight] = useState({
    number: 'BA179',
    destination: 'New York (JFK)',
    status: 'On Time',
    departureTime: '18:05',
    gate: 'A10'
  });

  const [conciergeMessages, setConciergeMessages] = useState([
    { id: 1, text: "Good afternoon, Sarah. Your flight to New York is on time.", type: 'info' },
    { id: 2, text: "Traffic to Heathrow is lighter than usual. You can leave in 45 minutes.", type: 'success' }
  ]);

  const [activeTab, setActiveTab] = useState('Home');

  return (
    <div className="app-container">
      {/* ... header ... */}
      <header className="app-header">
        <div className="logo">SkyConcierge</div>
        <div className="user-avatar">S</div>
      </header>

      <main className="app-content">
        {activeTab === 'Home' && (
          <>
            <div className="greeting-section">
              <h1>Ready for takeoff?</h1>
              <p>Here is your journey summary.</p>
            </div>

            <SmartAlarm leaveTime="14:15" trafficStatus="Light" />

            <section className="cards-section">
              <h2>Your Flight</h2>
              <FlightStatusCard flight={flight} />
            </section>

            <section className="feed-section">
              <h2>Concierge Updates</h2>
              <div className="feed-list">
                {conciergeMessages.map(msg => (
                  <div key={msg.id} className={`feed-item ${msg.type}`}>
                    <div className="feed-dot"></div>
                    <div className="feed-text">{msg.text}</div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {activeTab !== 'Home' && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <h2>{activeTab}</h2>
            <p>This feature is coming soon.</p>
          </div>
        )}
      </main>

      <nav className="bottom-nav">
        {['Home', 'Trips', 'Concierge', 'Profile'].map(tab => (
          <button
            key={tab}
            className={`nav-item ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;

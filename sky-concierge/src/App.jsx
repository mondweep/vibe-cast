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

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">SkyConcierge</div>
        <div className="user-avatar">S</div>
      </header>

      <main className="app-content">
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
      </main>

      <nav className="bottom-nav">
        <button className="nav-item active">Home</button>
        <button className="nav-item">Trips</button>
        <button className="nav-item">Concierge</button>
        <button className="nav-item">Profile</button>
      </nav>
    </div>
  );
}

export default App;

import React, { useState } from 'react';
import { ConciergeCard } from './components/ConciergeCard';
import { FlightTracker } from './components/FlightTracker';
import { DepartureAlarm } from './components/DepartureAlarm';
import { DisruptionAlert } from './components/DisruptionAlert';
import { calculateDepartureTime, getTimeBasedGreeting } from './utils/timeCalculations';
import {
  mockFlights,
  mockUser,
  mockConciergeMessages,
  mockDepartureFactors,
  mockAircraftPosition,
} from './data/mockFlights';
import type { Flight } from './types';
import './App.css';

type ViewMode = 'dashboard' | 'departure' | 'tracking' | 'disruption';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewMode>('dashboard');
  const [selectedFlight] = useState<Flight>(mockFlights[0]);

  // For demo: create a cancelled flight version
  const cancelledFlight: Flight = {
    ...selectedFlight,
    status: 'cancelled',
  };

  const departureCalculation = calculateDepartureTime(
    selectedFlight,
    mockDepartureFactors
  );

  const greeting = getTimeBasedGreeting();

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">✈️</span>
            <span className="logo-text">SkyConcierge</span>
          </div>
          <div className="user-greeting">
            <span className="greeting-text">
              {greeting}, {mockUser.name}
            </span>
            <div className="user-avatar">
              {mockUser.name.charAt(0)}
            </div>
          </div>
        </div>
      </header>

      <nav className="view-nav">
        <button
          className={`nav-button ${activeView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveView('dashboard')}
        >
          <span className="nav-icon">🏠</span>
          Dashboard
        </button>
        <button
          className={`nav-button ${activeView === 'departure' ? 'active' : ''}`}
          onClick={() => setActiveView('departure')}
        >
          <span className="nav-icon">⏰</span>
          Departure
        </button>
        <button
          className={`nav-button ${activeView === 'tracking' ? 'active' : ''}`}
          onClick={() => setActiveView('tracking')}
        >
          <span className="nav-icon">📍</span>
          Tracking
        </button>
        <button
          className={`nav-button ${activeView === 'disruption' ? 'active' : ''}`}
          onClick={() => setActiveView('disruption')}
        >
          <span className="nav-icon">⚠️</span>
          Disruption
        </button>
      </nav>

      <main className="app-main">
        {activeView === 'dashboard' && (
          <div className="dashboard">
            <section className="dashboard-hero">
              <h1 className="dashboard-title">Your Journey Today</h1>
              <p className="dashboard-subtitle">
                Flight {selectedFlight.flightNumber} to {selectedFlight.destination.city}
              </p>
            </section>

            <div className="dashboard-grid">
              <div className="dashboard-column">
                <h2 className="section-title">Concierge Updates</h2>
                <div className="cards-list">
                  {mockConciergeMessages.map((message) => (
                    <ConciergeCard key={message.id} message={message} />
                  ))}
                </div>
              </div>

              <div className="dashboard-column">
                <h2 className="section-title">Flight Overview</h2>
                <FlightTracker
                  flight={selectedFlight}
                  incomingAircraft={mockAircraftPosition}
                />

                <div className="quick-actions">
                  <h3 className="actions-title">Quick Actions</h3>
                  <div className="actions-grid">
                    <button className="action-card">
                      <span className="action-icon">🧳</span>
                      <span className="action-label">Bag Check</span>
                    </button>
                    <button className="action-card">
                      <span className="action-icon">🍽️</span>
                      <span className="action-label">Lounges</span>
                    </button>
                    <button className="action-card">
                      <span className="action-icon">🗺️</span>
                      <span className="action-label">Terminal Map</span>
                    </button>
                    <button className="action-card">
                      <span className="action-icon">🚕</span>
                      <span className="action-label">Transfer</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'departure' && (
          <div className="departure-view">
            <DepartureAlarm
              flight={selectedFlight}
              calculation={departureCalculation}
              userAddress={mockUser.homeLocation.address}
            />
          </div>
        )}

        {activeView === 'tracking' && (
          <div className="tracking-view">
            <FlightTracker
              flight={selectedFlight}
              incomingAircraft={mockAircraftPosition}
            />

            <div className="tracking-info">
              <h3 className="tracking-title">Live Updates</h3>
              <div className="tracking-timeline">
                <div className="timeline-event">
                  <span className="event-time">09:45</span>
                  <span className="event-text">Check-in counters open</span>
                </div>
                <div className="timeline-event">
                  <span className="event-time">12:30</span>
                  <span className="event-text">Gate announced: A12</span>
                </div>
                <div className="timeline-event highlight">
                  <span className="event-time">15:15</span>
                  <span className="event-text">Boarding begins (estimated)</span>
                </div>
                <div className="timeline-event">
                  <span className="event-time">16:00</span>
                  <span className="event-text">Scheduled departure</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'disruption' && (
          <div className="disruption-view">
            <DisruptionAlert
              flight={cancelledFlight}
              onRebook={(id) => {
                alert(`Demo: Rebooking confirmed for flight ${id}`);
              }}
            />
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p className="footer-text">
          SkyConcierge Demo • Built with React + TypeScript • SPARC Methodology
        </p>
        <p className="footer-note">
          This is a demonstration application with simulated data
        </p>
      </footer>
    </div>
  );
};

export default App;

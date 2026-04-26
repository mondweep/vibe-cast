import React, { useState, useEffect } from 'react';
import { GameSetup } from './components/GameSetup';
import { GamePlay } from './components/GamePlay';
import { GameResults } from './components/GameResults';
import { api } from './services/api';

function App() {
  const [gameState, setGameState] = useState('setup');
  const [sessionId, setSessionId] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (err) => {
          console.warn('Geolocation error:', err);
          setError('Unable to get your location. Please enable location services.');
        }
      );
    }
  }, []);

  const handleCreateGame = async (config) => {
    try {
      const response = await api.createSession(config);
      setSessionId(response.sessionId);
      setGameState('join');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create game');
    }
  };

  const handleJoinGame = async (playerNameInput) => {
    if (!location) {
      setError('Location is required to join the game');
      return;
    }

    try {
      const response = await api.joinSession(sessionId, {
        playerName: playerNameInput,
        latitude: location.latitude,
        longitude: location.longitude,
        location: `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`
      });

      setPlayerId(response.playerId);
      setPlayerName(playerNameInput);
      setGameState('playing');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join game');
    }
  };

  const handleGameComplete = (results) => {
    setGameState('results');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white drop-shadow-lg mb-2">
            🌍 Weather Game
          </h1>
          <p className="text-xl text-white drop-shadow text-opacity-90">
            Compete with colleagues across the globe based on real weather
          </p>
        </header>

        {error && (
          <div className="max-w-2xl mx-auto mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="max-w-2xl mx-auto">
          {gameState === 'setup' && (
            <GameSetup onCreateGame={handleCreateGame} />
          )}

          {gameState === 'join' && (
            <div className="bg-white rounded-lg shadow-2xl p-8">
              <h2 className="text-2xl font-bold mb-6">Join Game</h2>
              <p className="mb-4 text-gray-600">Session ID: {sessionId}</p>
              <input
                type="text"
                placeholder="Enter your name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleJoinGame(e.target.value);
                  }
                }}
              />
              <button
                onClick={(e) => {
                  const input = e.target.parentElement.querySelector('input');
                  handleJoinGame(input.value);
                }}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg"
              >
                Join Game
              </button>
            </div>
          )}

          {gameState === 'playing' && (
            <GamePlay
              sessionId={sessionId}
              playerId={playerId}
              playerName={playerName}
              onGameComplete={handleGameComplete}
            />
          )}

          {gameState === 'results' && (
            <GameResults
              sessionId={sessionId}
              onPlayAgain={() => {
                setSessionId(null);
                setPlayerId(null);
                setGameState('setup');
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

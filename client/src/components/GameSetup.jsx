import React, { useState } from 'react';

export function GameSetup({ onCreateGame }) {
  const [difficulty, setDifficulty] = useState('medium');
  const [gameMode, setGameMode] = useState('competitive');

  const handleStart = () => {
    onCreateGame({ difficulty, gameMode });
  };

  return (
    <div className="bg-white rounded-lg shadow-2xl p-8 space-y-6">
      <h2 className="text-3xl font-bold text-center">Game Setup</h2>

      <div>
        <label className="block text-lg font-semibold mb-3">Difficulty Level</label>
        <div className="grid grid-cols-2 gap-3">
          {['easy', 'medium', 'hard', 'extreme'].map(level => (
            <button
              key={level}
              onClick={() => setDifficulty(level)}
              className={`py-3 px-4 rounded-lg font-semibold transition ${
                difficulty === level
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-lg font-semibold mb-3">Game Mode</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'competitive', name: '⚔️ Competitive', desc: 'Race for the top score' },
            { id: 'collaborative', name: '🤝 Collaborative', desc: 'Work together for bonuses' }
          ].map(mode => (
            <button
              key={mode.id}
              onClick={() => setGameMode(mode.id)}
              className={`py-4 px-4 rounded-lg font-semibold transition text-left ${
                gameMode === mode.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <div className="text-base">{mode.name}</div>
              <div className="text-sm opacity-75">{mode.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">📋 Game Features</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>✅ Real-time weather data from your location</li>
          <li>✅ Challenge-based scoring system</li>
          <li>✅ Live leaderboard updates</li>
          <li>✅ Weather-based bonus points</li>
          <li>✅ Supports 2-100 players</li>
        </ul>
      </div>

      <button
        onClick={handleStart}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-3 px-4 rounded-lg text-lg transition shadow-lg"
      >
        Create Game Room
      </button>
    </div>
  );
}

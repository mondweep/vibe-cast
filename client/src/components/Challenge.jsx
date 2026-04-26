import React, { useState } from 'react';

export function Challenge({ challenge, onSubmit, disabled }) {
  const [answer, setAnswer] = useState('');

  const handleSubmit = () => {
    if (answer.trim()) {
      onSubmit(answer);
      setAnswer('');
    }
  };

  const challengeDescriptions = {
    'TemperatureMatch': '🌡️ Which location has the highest temperature?',
    'HumidityPrediction': '💧 Estimate average humidity across all players',
    'WindChallenge': '💨 How many locations have wind speed > 20 km/h?',
    'WeatherQuiz': '❓ What is the most common weather condition?',
    'LocationTrivia': '🗺️ Name the player from the hottest location',
    'ConditionRace': '🏃 Speed challenge: Type the most common weather!',
    'StormTracker': '⛈️ How many players experience severe weather?'
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xl font-semibold mb-4">
          {challengeDescriptions[challenge.type] || challenge.content.question}
        </p>

        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border-2 border-blue-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">Type:</span> {challenge.type}
            </div>
            <div>
              <span className="font-semibold">Difficulty:</span> {challenge.difficulty}
            </div>
            <div>
              <span className="font-semibold">Max Players:</span> {challenge.maxPlayers}
            </div>
            <div>
              <span className="font-semibold">Duration:</span> {challenge.duration}s
            </div>
          </div>
        </div>
      </div>

      {!disabled ? (
        <div className="space-y-4">
          {challenge.content.type === 'number' && (
            <div>
              <input
                type="number"
                min={challenge.content.min}
                max={challenge.content.max}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Enter a number..."
                className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500"
                disabled={disabled}
              />
            </div>
          )}

          {challenge.content.type === 'free-text' && (
            <div>
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Enter your answer..."
                className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500"
                disabled={disabled}
              />
            </div>
          )}

          {challenge.content.type === 'speed-challenge' && (
            <div>
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type fast!"
                className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-lg font-bold"
                disabled={disabled}
                autoFocus
              />
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={disabled || !answer.trim()}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-bold py-3 px-4 rounded-lg text-lg transition"
          >
            Submit Answer
          </button>
        </div>
      ) : (
        <div className="bg-green-100 border-2 border-green-400 p-4 rounded-lg text-center">
          <div className="text-2xl">✅ Answer submitted!</div>
          <div className="text-sm text-gray-600 mt-2">Loading next challenge...</div>
        </div>
      )}
    </div>
  );
}

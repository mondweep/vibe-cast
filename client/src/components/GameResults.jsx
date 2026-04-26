import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export function GameResults({ sessionId, onPlayAgain }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadResults = async () => {
      try {
        const finalScores = await api.getLeaderboard(sessionId);
        setResults(finalScores);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load results:', error);
        setLoading(false);
      }
    };

    loadResults();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-2xl p-8 text-center">
        <div className="text-2xl mb-4">📊 Loading results...</div>
      </div>
    );
  }

  const winner = results[0];
  const calculateDifference = (index) => {
    if (index === 0) return 0;
    return results[0].score - results[index].score;
  };

  return (
    <div className="bg-white rounded-lg shadow-2xl p-8">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold mb-4">🎉 Game Complete!</h2>
        <p className="text-gray-600">Final Rankings</p>
      </div>

      {winner && (
        <div className="text-center mb-8 p-6 bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-lg border-2 border-yellow-400">
          <div className="text-6xl mb-2">🏆</div>
          <h3 className="text-2xl font-bold mb-2">{winner.name} Wins!</h3>
          <p className="text-4xl font-bold text-yellow-600">{winner.score} points</p>
        </div>
      )}

      <div className="space-y-3 mb-8">
        {results.map((player, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-l-4 border-blue-400"
          >
            <div className="flex items-center gap-4 flex-1">
              <div className="text-3xl font-bold text-center w-12">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
              </div>
              <div>
                <p className="font-bold text-lg">{player.name}</p>
                {index > 0 && (
                  <p className="text-sm text-gray-600">
                    -{calculateDifference(index)} points behind
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-blue-600">{player.score}</p>
              <p className="text-xs text-gray-500">points</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 p-4 rounded-lg mb-8">
        <h4 className="font-bold mb-2">📈 Game Statistics</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-semibold">Total Players:</span> {results.length}
          </div>
          <div>
            <span className="font-semibold">Winning Score:</span> {winner?.score || 0}
          </div>
          <div>
            <span className="font-semibold">Average Score:</span>{' '}
            {Math.round(results.reduce((a, b) => a + b.score, 0) / results.length)}
          </div>
          <div>
            <span className="font-semibold">Score Range:</span> {Math.max(...results.map(r => r.score)) - Math.min(...results.map(r => r.score))}
          </div>
        </div>
      </div>

      <button
        onClick={onPlayAgain}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-3 px-4 rounded-lg text-lg transition"
      >
        Play Again
      </button>
    </div>
  );
}

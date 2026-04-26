import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Challenge } from './Challenge';
import { Leaderboard } from './Leaderboard';

export function GamePlay({ sessionId, playerId, playerName, onGameComplete }) {
  const [challenge, setChallenge] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    startGame();
  }, [sessionId]);

  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setTimeout(() => setTimeRemaining(timeRemaining - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && challenge) {
      handleTimeUp();
    }
  }, [timeRemaining]);

  const startGame = async () => {
    try {
      setLoading(true);
      await api.startSession(sessionId);
      const currentChallenge = await api.getCurrentChallenge(sessionId);
      setChallenge(currentChallenge);
      setTimeRemaining(currentChallenge.duration);
      await updateLeaderboard();
      setLoading(false);
    } catch (error) {
      console.error('Failed to start game:', error);
      setLoading(false);
    }
  };

  const updateLeaderboard = async () => {
    try {
      const lb = await api.getLeaderboard(sessionId);
      setLeaderboard(lb);
    } catch (error) {
      console.error('Failed to update leaderboard:', error);
    }
  };

  const handleAnswerSubmit = async (answer) => {
    try {
      const result = await api.submitAnswer(sessionId, playerId, answer);
      setAnswered(true);
      await updateLeaderboard();

      // Move to next challenge after 2 seconds
      setTimeout(() => {
        nextChallenge();
      }, 2000);
    } catch (error) {
      console.error('Failed to submit answer:', error);
    }
  };

  const handleTimeUp = async () => {
    if (!answered) {
      await handleAnswerSubmit(null);
    }
  };

  const nextChallenge = async () => {
    try {
      const next = await api.getNextChallenge(sessionId);
      if (next) {
        setChallenge(next);
        setTimeRemaining(next.duration);
        setAnswered(false);
      } else {
        // Game complete
        const results = await api.endSession(sessionId);
        onGameComplete(results);
      }
    } catch (error) {
      console.error('Failed to get next challenge:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-2xl p-8 text-center">
        <div className="text-2xl mb-4">🎮 Loading game...</div>
        <div className="animate-spin text-4xl">⚙️</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-2xl p-8">
        {challenge && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Current Challenge</h2>
              <div className="text-3xl font-bold">
                {timeRemaining > 0 ? (
                  <div className={timeRemaining < 10 ? 'text-red-500' : ''}>
                    {timeRemaining}s
                  </div>
                ) : (
                  <div className="text-red-500">Time's up!</div>
                )}
              </div>
            </div>

            <Challenge
              challenge={challenge}
              onSubmit={handleAnswerSubmit}
              disabled={answered}
            />
          </div>
        )}
      </div>

      <Leaderboard leaderboard={leaderboard} currentPlayerId={playerId} />
    </div>
  );
}
